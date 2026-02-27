(function () {
  "use strict";

  function WorldBuilder(scene) {
    this.scene = scene;
    this.interactables = []; // meshes with metadata
    this.npcs = [];
    this._env = { fogBase: 0.015, lightBase: 0.85 };
  }

  WorldBuilder.prototype.buildForest = async function (ui, onProgress) {
    const scene = this.scene;

    // תאורה בסיסית
    const light = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = this._env.lightBase;

    const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.4, -1, 0.2), scene);
    sun.intensity = 0.35;

    scene.clearColor = new BABYLON.Color4(0.06, 0.09, 0.10, 1);

    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = this._env.fogBase;
    scene.fogColor = new BABYLON.Color3(0.06, 0.09, 0.10);

    // קרקע
    onProgress && onProgress(0.15, "יוצר קרקע...");
    const ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: 120, height: 120, subdivisions: 32 },
      scene
    );
    const gMat = new BABYLON.StandardMaterial("groundMat", scene);
    gMat.diffuseColor = new BABYLON.Color3(0.08, 0.18, 0.10);
    gMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    ground.material = gMat;
    ground.checkCollisions = true;

    // שביל מרכזי (ויזואלי בלבד)
    onProgress && onProgress(0.25, "מסמן שבילים...");
    const path = BABYLON.MeshBuilder.CreateGround(
      "path",
      { width: 40, height: 6, subdivisions: 2 },
      scene
    );
    path.position.z = 6;
    path.rotation.y = Math.PI * 0.15;

    const pMat = new BABYLON.StandardMaterial("pathMat", scene);
    pMat.diffuseColor = new BABYLON.Color3(0.18, 0.16, 0.12);
    pMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    path.material = pMat;

    // עצים באינסטנסים
    onProgress && onProgress(0.4, "שותל עצים...");
    const tree = _makeTreePrototype(scene);
    const treeCount = 140;
    for (let i = 0; i < treeCount; i++) {
      const inst = tree.createInstance(`t${i}`);
      const r = 55 * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;

      inst.position.x = Math.cos(a) * r;
      inst.position.z = Math.sin(a) * r;

      const nearCenter = Math.abs(inst.position.x) < 10 && Math.abs(inst.position.z) < 10;
      const nearPath = Math.abs(inst.position.z - 6) < 5 && Math.abs(inst.position.x) < 25;

      if (nearCenter || nearPath) {
        inst.dispose();
        continue;
      }

      inst.scaling.y = 0.9 + Math.random() * 1.2;
      inst.scaling.x = 0.8 + Math.random() * 0.8;
      inst.scaling.z = 0.8 + Math.random() * 0.8;
      inst.rotation.y = Math.random() * Math.PI * 2;
      inst.checkCollisions = true;
    }
    tree.setEnabled(false);

    // סלע מרכזי
    onProgress && onProgress(0.55, "מקים נקודות עניין...");
    const altar = BABYLON.MeshBuilder.CreateBox("altar", { size: 1.4 }, scene);
    altar.position = new BABYLON.Vector3(0, 0.7, 0);
    altar.checkCollisions = true;

    const aMat = new BABYLON.StandardMaterial("altarMat", scene);
    aMat.diffuseColor = new BABYLON.Color3(0.22, 0.24, 0.26);
    aMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    altar.material = aMat;

    // NPC
    onProgress && onProgress(0.65, "מזמן דמויות...");
    const elderMesh = _makeNPCMesh(scene, "elderMesh");
    elderMesh.position = new BABYLON.Vector3(1, 0, -2);
    elderMesh.checkCollisions = true;

    this.npcs.push(
      new window.ECO.NPC({
        id: "elder",
        name: "זקן היער",
        mesh: elderMesh,
        home: elderMesh.position.clone(),
      })
    );

    // Triggers מסצנות
    onProgress && onProgress(0.75, "טוען סצנות...");
    const scenes = window.ECO.data.FOREST_SCENES;
    scenes.forEach((s) => {
      const m = BABYLON.MeshBuilder.CreateSphere(`trig_${s.id}`, { diameter: 1.6 }, scene);
      m.position = new BABYLON.Vector3(s.position.x, 0.8, s.position.z);
      m.isVisible = false;
      m.isPickable = true;

      // metadata מאפשר “רכיבים” בסגנון פשוט
      m.metadata = { type: "sceneTrigger", sceneId: s.id };
      this.interactables.push(m);

      const marker = BABYLON.MeshBuilder.CreateCylinder(`mk_${s.id}`, { height: 0.4, diameter: 0.6 }, scene);
      marker.position = new BABYLON.Vector3(s.position.x, 0.2, s.position.z);
      marker.rotation.x = Math.PI / 2;

      const mm = new BABYLON.StandardMaterial(`mm_${s.id}`, scene);
      mm.emissiveColor = new BABYLON.Color3(0.0, 0.9, 0.6);
      mm.alpha = 0.65;
      marker.material = mm;
    });

    onProgress && onProgress(0.9, "מסיים...");
    await _tick();
    onProgress && onProgress(1.0, "מוכן.");
  };

  WorldBuilder.prototype.applyReactivity = function (score) {
    // תגובת עולם מינימלית: fog ותאורה, לפי דגש חברתי מול ביצועי
    const s = (score && score.S) || 0;
    const r = (score && score.R) || 0;

    const t = Math.max(0, Math.min(1, (s - r + 6) / 12)); // 0..1

    this.scene.fogDensity = this._env.fogBase * (0.7 + (1 - t) * 0.8);
    const hemi = this.scene.getLightByName("hemi");
    if (hemi) hemi.intensity = this._env.lightBase * (0.85 + t * 0.35);

    // צבעים עדינים
    const c = new BABYLON.Color3(0.06 + t * 0.02, 0.09 + t * 0.03, 0.10 + (1 - t) * 0.02);
    this.scene.fogColor = c;
  };

  function _makeTreePrototype(scene) {
    const trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", { height: 3.4, diameter: 0.35 }, scene);
    trunk.position.y = 1.7;

    const crown = BABYLON.MeshBuilder.CreateSphere("crown", { diameter: 2.2, segments: 8 }, scene);
    crown.position.y = 3.1;

    const trunkMat = new BABYLON.StandardMaterial("trunkMat", scene);
    trunkMat.diffuseColor = new BABYLON.Color3(0.22, 0.14, 0.08);
    trunkMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);

    const crownMat = new BABYLON.StandardMaterial("crownMat", scene);
    crownMat.diffuseColor = new BABYLON.Color3(0.06, 0.28, 0.10);
    crownMat.specularColor = new BABYLON.Color3(0.01, 0.01, 0.01);

    trunk.material = trunkMat;
    crown.material = crownMat;

    const tree = BABYLON.Mesh.MergeMeshes([trunk, crown], true, false, undefined, false, true);
    tree.name = "treeProto";
    tree.isPickable = false;
    tree.checkCollisions = true;
    return tree;
  }

  function _makeNPCMesh(scene, name) {
    const body = BABYLON.MeshBuilder.CreateCapsule(name, { height: 1.75, radius: 0.32 }, scene);
    body.position.y = 0.88;

    const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
    mat.diffuseColor = new BABYLON.Color3(0.20, 0.22, 0.24);
    mat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    body.material = mat;
    body.isPickable = true;
    body.metadata = { type: "npc", npcId: "elder" };
    return body;
  }

  function _tick() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  window.ECO = window.ECO || {};
  window.ECO.WorldBuilder = WorldBuilder;
})();
