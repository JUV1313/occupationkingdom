(function () {
  "use strict";

  const { nowIso } = window.ECO.util;
  const { createScore, applyDelta, top2 } = window.ECO.riasec;
  const { saveGame, loadGame } = window.ECO.storage;

  function Game(canvas, ui, analytics, input) {
    this.canvas = canvas;
    this.ui = ui;
    this.analytics = analytics;
    this.input = input;

    this.engine = null;
    this.scene = null;
    this.camera = null;

    this.world = null;

    this.state = this._createNewState();
    this._activeScene = null;
    this._activeDialogue = null;

    this._maxPerDim = 10;
    this._lastAutosave = 0;
  }

  Game.prototype._createNewState = function () {
    return {
      version: 1,
      createdAtIso: nowIso(),
      savedAtIso: null,

      settings: {
        lookSensitivity: 1.0,
        hiContrast: false,
        bigText: false,
      },

      player: {
        x: 0,
        y: 1.8,
        z: 12,
        kingdomId: "forest",
      },

      riasec: createScore(),
      inventory: [],
      journal: [],
      progress: {
        completedScenes: {},
      },
    };
  };

  Game.prototype.init = async function () {
    this.analytics.log("game_init", {});

    this.engine = new BABYLON.Engine(this.canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
    });

    this.scene = new BABYLON.Scene(this.engine);
    this.scene.collisionsEnabled = true;

    // מצלמה גוף ראשון
    this.camera = new BABYLON.UniversalCamera(
      "cam",
      new BABYLON.Vector3(this.state.player.x, this.state.player.y, this.state.player.z),
      this.scene
    );
    this.camera.minZ = 0.1;
    this.camera.speed = 0.7;
    this.camera.angularSensibility = 800;
    this.camera.inertia = 0.2;

    // קוליז’נים למצלמה
    this.camera.checkCollisions = true;
    this.camera.applyGravity = true;
    this.camera.ellipsoid = new BABYLON.Vector3(0.35, 0.9, 0.35);
    this.camera.ellipsoidOffset = new BABYLON.Vector3(0, 0.9, 0);

    // מקשים, WASD
    this.camera.keysUp = [87];
    this.camera.keysDown = [83];
    this.camera.keysLeft = [65];
    this.camera.keysRight = [68];

    // חיבור קלט למצלמה (עכבר ותנועה דיפולטית)
    this.camera.attachControl(this.canvas, true);

    // עולם
    this.world = new window.ECO.WorldBuilder(this.scene);
    this.ui.showLoading();
    await this.world.buildForest(this.ui, (p, t) => this.ui.setLoadingProgress(p, t));

    // אובייקט עתיד (סטאב) במרכז
    // זה אחד הטריגרים מהדאטה, רק UI נפרד
    this.ui.updateRIASEC(this.state.riasec, this._maxPerDim);

    this._wireUI();

    this.ui.showStart(window.ECO.storage.hasSave());
  };

  Game.prototype._wireUI = function () {
    this.ui.onStart = () => {
      this.analytics.log("game_start_new", {});
      this._beginPlay();
    };

    this.ui.onLoad = () => {
      const loaded = loadGame();
      if (!loaded) {
        this.ui.toast("אין שמירה.");
        return;
      }
      this.analytics.log("game_load", {});

      // מיזוג מינימלי
      this.state = Object.assign(this._createNewState(), loaded);
      this.ui.applySettings(this.state.settings);
      this.input.lookSensitivity = this.state.settings.lookSensitivity || 1.0;

      this._applyStateToWorld();
      this.ui.toast("נטען.");
      this._beginPlay();
    };

    this.ui.onSave = () => {
      this.save();
      this.ui.toast("נשמר.");
    };

    this.ui.onExport = () => {
      this.analytics.exportToFile();
      this.ui.toast("ייצוא הוכן.");
    };

    this.ui.onSettingsChanged = (settings) => {
      this.state.settings = Object.assign({}, this.state.settings, settings);
      this.ui.applySettings(this.state.settings);
      this.input.lookSensitivity = this.state.settings.lookSensitivity || 1.0;

      // Babylon: angularSensibility גדול יותר = פחות רגיש
      const sens = this.state.settings.lookSensitivity || 1.0;
      this.camera.angularSensibility = 800 / sens;

      this.analytics.log("settings_changed", this.state.settings);
      this.save();
    };

    this.ui.onClearSave = () => {
      window.ECO.storage.clearSave();
      this.analytics.log("save_cleared", {});
      this.ui.toast("שמירה נמחקה.");
      this.ui.showStart(false);
    };

    this.ui.onJournalSave = (text, sceneId) => {
      const entry = {
        entryId: window.ECO.util.uuid(),
        createdAtIso: nowIso(),
        sceneId: sceneId || null,
        prompt: this.ui.el.journalPrompt.textContent || "",
        text,
      };
      this.state.journal.push(entry);
      this.analytics.log("journal_saved", { sceneId: sceneId || null });
      this.ui.renderJournal(this.state.journal);
      this.save();
      this.ui.toast("נשמר ביומן.");
    };

    this.ui.onInteract = () => this.tryInteract();
  };

  Game.prototype._beginPlay = function () {
    this.ui.showHUD(this.input.isTouch);
    this.ui.hideDialogue();
    this.ui.hideJournal();
    this.ui.hideFuture();
    this.ui.hideSettings();

    this._applyStateToWorld();

    this.engine.runRenderLoop(() => {
      this._frame();
      this.scene.render();
    });

    window.addEventListener("resize", () => this.engine.resize());
  };

  Game.prototype._applyStateToWorld = function () {
    this.camera.position.x = this.state.player.x;
    this.camera.position.y = this.state.player.y;
    this.camera.position.z = this.state.player.z;

    this.ui.updateRIASEC(this.state.riasec, this._maxPerDim);
    this.ui.renderInventory(this.state.inventory);
    this.ui.renderJournal(this.state.journal);

    this.world.applyReactivity(this.state.riasec);
  };

  Game.prototype._frame = function () {
    const dt = this.engine.getDeltaTime() / 1000;
    this.input.resetFrameActions();

    // מובייל: תנועה מהג’ויסטיק, בלי להתערב במקלדת
    if (this.input.isTouch) {
      const dx = this.input.moveX;
      const dy = this.input.moveY;

      if (Math.abs(dx) > 0.02 || Math.abs(dy) > 0.02) {
        const fwd = this.camera.getDirection(BABYLON.Axis.Z);
        const right = this.camera.getDirection(BABYLON.Axis.X);

        fwd.y = 0;
        right.y = 0;
        fwd.normalize();
        right.normalize();

        const speed = 0.95;
        const v = fwd.scale(dy * speed * dt).addInPlace(right.scale(dx * speed * dt));
        this.camera.position.addInPlace(v);
      }
    }

    // NPCs
    const playerPos = this.camera.position;
    this.world.npcs.forEach((n) => n.update(dt, playerPos, this.state.riasec));

    // אינטראקציה עם “מה אני מסתכל עליו”
    const hit = this._pickInteractable();
    if (hit) {
      const { kind, text } = hit;
      this.ui.setInteractPrompt(true, text);
    } else {
      this.ui.setInteractPrompt(false);
    }

    // פעולה: כפתור מובייל מטופל ב־UI, זה למקלדת
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyE") this.tryInteract();
      if (e.code === "KeyJ") this.toggleJournal();
      if (e.code === "Escape") this._closeTopModal();
    }, { once: true });

    // Autosave קל
    this._lastAutosave += dt;
    if (this._lastAutosave > 25) {
      this._lastAutosave = 0;
      this.save();
    }
  };

  Game.prototype._closeTopModal = function () {
    if (!this.ui.el.settings.classList.contains("hidden")) {
      this.ui.hideSettings();
      return;
    }
    if (!this.ui.el.future.classList.contains("hidden")) {
      this.ui.hideFuture();
      return;
    }
    if (!this.ui.el.journal.classList.contains("hidden")) {
      this.ui.hideJournal();
      return;
    }
    if (!this.ui.el.dlg.classList.contains("hidden")) {
      this.ui.hideDialogue();
      return;
    }
  };

  Game.prototype.toggleJournal = function () {
    const open = !this.ui.el.journal.classList.contains("hidden");
    if (open) this.ui.hideJournal();
    else {
      this.ui.showJournal();
      this.ui.renderJournal(this.state.journal);
      this.ui.renderInventory(this.state.inventory);
    }
  };

  Game.prototype._pickInteractable = function () {
    // ray מהמצלמה קדימה
    const origin = this.camera.position.clone();
    const forward = this.camera.getDirection(BABYLON.Axis.Z);
    const ray = new BABYLON.Ray(origin, forward, 2.5);

    const pick = this.scene.pickWithRay(ray, (mesh) => {
      return Boolean(mesh && mesh.isPickable && mesh.metadata && mesh.metadata.type);
    });

    if (!pick || !pick.hit || !pick.pickedMesh) return null;

    const md = pick.pickedMesh.metadata;
    if (md.type === "sceneTrigger") {
      const s = _findScene(md.sceneId);
      if (!s) return null;
      return { kind: "scene", sceneId: md.sceneId, text: `E: ${s.title}` };
    }

    if (md.type === "npc") {
      return { kind: "npc", npcId: md.npcId, text: "E: דבר" };
    }

    return null;
  };

  Game.prototype.tryInteract = function () {
    const hit = this._pickInteractable();
    if (!hit) return;

    if (hit.kind === "scene") {
      this.startScene(hit.sceneId);
      return;
    }

    if (hit.kind === "npc") {
      // למינימום, NPC הוא רק “לאנצ’ר” לסצנה הראשונה אם לא הושלמה
      const done = this.state.progress.completedScenes || {};
      if (!done.forest_01_intro) {
        this.startScene("forest_01_intro");
      } else {
        const t = top2(this.state.riasec);
        const msg = `הזקן מביט בך: "אני רואה בך ${t[0][0]} ואז ${t[1][0]}. תן לזה לעבוד בשבילך, לא נגדך."`;
        this.ui.toast(msg);
        this.analytics.log("npc_smalltalk", { npcId: "elder" });
      }
    }
  };

  Game.prototype.startScene = function (sceneId) {
    const s = _findScene(sceneId);
    if (!s) {
      this.ui.toast("סצנה לא נמצאה.");
      return;
    }

    // “אורקל העתיד”
    if (s.kind === "future") {
      const text = window.ECO.future.generateFutureStub(this.state);
      this.ui.showFuture(text);
      this.analytics.log("future_open", {});
      return;
    }

    // אם כבר הושלמה, לא לחסום, רק להודיע
    if (this.state.progress.completedScenes && this.state.progress.completedScenes[sceneId]) {
      this.ui.toast("כבר השלמת את זה. (ב־MVP אין replay מורכב)");
      this.analytics.log("scene_revisit", { sceneId });
      return;
    }

    this.analytics.log("scene_start", { sceneId, title: s.title });
    this._activeScene = s;

    this._runDialogue(s.dialogue, () => {
      // בסיום דיאלוג: רפלקציה ליומן
      this._afterScene(s);
    });
  };

  Game.prototype._runDialogue = function (dialogue, onDone) {
    if (!dialogue) {
      onDone && onDone();
      return;
    }

    const nodes = dialogue.nodes;
    let currentId = dialogue.startId;

    const step = () => {
      const node = nodes[currentId];
      if (!node) {
        onDone && onDone();
        return;
      }

      const options = (node.options || []).map((o) => ({
        id: o.id,
        label: o.label,
        effects: o.effects || {},
        nextId: o.nextId,
      }));

      this.ui.showDialogue(node.speaker, node.text, options, (opt) => {
        this.analytics.log("dialogue_choice", {
          sceneId: this._activeScene ? this._activeScene.id : null,
          optionId: opt.id,
        });

        if (opt.effects && opt.effects.riasec) {
          applyDelta(this.state.riasec, opt.effects.riasec);
          this.ui.updateRIASEC(this.state.riasec, this._maxPerDim);
          this.world.applyReactivity(this.state.riasec);
        }

        if (opt.effects && opt.effects.echo) {
          this.ui.toast(`Echo: ${opt.effects.echo}`);
          this.analytics.log("echo_shown", {});
        }

        if (opt.nextId) {
          currentId = opt.nextId;
          step();
        } else {
          this.ui.hideDialogue();
          onDone && onDone();
        }
      });
    };

    step();
  };

  Game.prototype._afterScene = function (sceneDef) {
    if (!sceneDef) return;

    // פריט מינימלי לתיק
    this._addInventoryOnce(`token_${sceneDef.id}`, `אסימון: ${sceneDef.title}`);

    // סימון התקדמות
    this.state.progress.completedScenes[sceneDef.id] = {
      completedAtIso: nowIso(),
    };

    // prompt ליומן
    if (sceneDef.reflectionPrompt) {
      this.ui.bindJournalPrompt(sceneDef.reflectionPrompt, sceneDef.id);
      this.ui.showJournal();
      this.ui.renderJournal(this.state.journal);
      this.ui.renderInventory(this.state.inventory);
    }

    this.analytics.log("scene_complete", { sceneId: sceneDef.id });
    this.save();
  };

  Game.prototype._addInventoryOnce = function (id, name) {
    const inv = this.state.inventory;
    const found = inv.find((x) => x.id === id);
    if (found) {
      found.qty = (found.qty || 1) + 1;
    } else {
      inv.push({ id, name, qty: 1 });
    }
    this.ui.renderInventory(inv);
  };

  Game.prototype.save = function () {
    // מיקום שחקן
    this.state.player.x = this.camera.position.x;
    this.state.player.y = this.camera.position.y;
    this.state.player.z = this.camera.position.z;

    saveGame(this.state);
    this.analytics.log("game_saved", {});
  };

  function _findScene(id) {
    const list = window.ECO.data.FOREST_SCENES;
    return list.find((s) => s.id === id) || null;
  }

  window.ECO = window.ECO || {};
  window.ECO.Game = Game;
})();
