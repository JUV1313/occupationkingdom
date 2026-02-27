(function () {
  "use strict";

  const { clamp, nowIso } = window.ECO.util;
  const { explainKey } = window.ECO.riasec;

  function UI(analytics) {
    this.analytics = analytics;

    this.el = {
      loading: document.getElementById("overlay-loading"),
      loadingBar: document.getElementById("loading-bar"),
      loadingText: document.getElementById("loading-text"),

      start: document.getElementById("overlay-start"),
      btnStart: document.getElementById("btn-start"),
      btnLoad: document.getElementById("btn-load"),

      hud: document.getElementById("hud"),
      prompt: document.getElementById("hud-prompt"),

      btnJournal: document.getElementById("btn-journal"),
      btnSave: document.getElementById("btn-save"),
      btnExport: document.getElementById("btn-export"),
      btnSettings: document.getElementById("btn-settings"),

      dlg: document.getElementById("dialogue"),
      dlgSpeaker: document.getElementById("dlg-speaker"),
      dlgText: document.getElementById("dlg-text"),
      dlgOptions: document.getElementById("dlg-options"),
      btnDlgClose: document.getElementById("btn-dlg-close"),

      journal: document.getElementById("panel-journal"),
      btnJournalClose: document.getElementById("btn-journal-close"),
      tabJournal: document.getElementById("tab-journal"),
      tabInv: document.getElementById("tab-inv"),
      journalView: document.getElementById("journal-view"),
      invView: document.getElementById("inv-view"),
      journalList: document.getElementById("journal-list"),
      invList: document.getElementById("inv-list"),
      journalPrompt: document.getElementById("journal-prompt"),
      journalText: document.getElementById("journal-text"),
      btnJournalSave: document.getElementById("btn-journal-save"),
      btnJournalClear: document.getElementById("btn-journal-clear"),

      future: document.getElementById("panel-future"),
      btnFutureClose: document.getElementById("btn-future-close"),
      futureText: document.getElementById("future-text"),

      settings: document.getElementById("panel-settings"),
      btnSettingsClose: document.getElementById("btn-settings-close"),
      optLook: document.getElementById("opt-look"),
      optContrast: document.getElementById("opt-contrast"),
      optBigText: document.getElementById("opt-bigtext"),
      btnClearSave: document.getElementById("btn-clear-save"),

      mobile: document.getElementById("mobile-controls"),
      btnMobileInteract: document.getElementById("btn-interact"),

      toast: document.getElementById("toast"),
    };

    this._activePromptSceneId = null;
    this._journalBoundSceneId = null;

    this._wire();
  }

  UI.prototype._wire = function () {
    this.el.btnDlgClose.addEventListener("click", () => this.hideDialogue());
    this.el.btnJournalClose.addEventListener("click", () => this.hideJournal());
    this.el.btnFutureClose.addEventListener("click", () => this.hideFuture());
    this.el.btnSettingsClose.addEventListener("click", () => this.hideSettings());

    this.el.btnJournal.addEventListener("click", () => {
      this.analytics.log("ui_open_journal", {});
      this.showJournal();
    });

    this.el.tabJournal.addEventListener("click", () => this._setTab("journal"));
    this.el.tabInv.addEventListener("click", () => this._setTab("inv"));

    this.el.btnJournalClear.addEventListener("click", () => {
      this.el.journalText.value = "";
    });

    // יופעל מבחוץ עם callback
    this.onStart = null;
    this.onLoad = null;
    this.onSave = null;
    this.onExport = null;
    this.onSettingsChanged = null;
    this.onClearSave = null;
    this.onInteract = null;

    this.el.btnStart.addEventListener("click", () => this.onStart && this.onStart());
    this.el.btnLoad.addEventListener("click", () => this.onLoad && this.onLoad());
    this.el.btnSave.addEventListener("click", () => this.onSave && this.onSave());
    this.el.btnExport.addEventListener("click", () => this.onExport && this.onExport());
    this.el.btnSettings.addEventListener("click", () => this.showSettings());

    this.el.btnMobileInteract.addEventListener("click", () => {
      this.analytics.log("ui_mobile_interact", {});
      if (this.onInteract) this.onInteract();
    });

    this.el.btnJournalSave.addEventListener("click", () => {
      if (!this.onJournalSave) return;
      const text = this.el.journalText.value.trim();
      if (!text) {
        this.toast("אין מה לשמור.");
        return;
      }
      this.onJournalSave(text, this._journalBoundSceneId);
      this.el.journalText.value = "";
    });

    this.el.optLook.addEventListener("input", () => {
      this.onSettingsChanged && this.onSettingsChanged(this.getSettings());
    });
    this.el.optContrast.addEventListener("change", () => {
      this.onSettingsChanged && this.onSettingsChanged(this.getSettings());
    });
    this.el.optBigText.addEventListener("change", () => {
      this.onSettingsChanged && this.onSettingsChanged(this.getSettings());
    });

    this.el.btnClearSave.addEventListener("click", () => {
      this.onClearSave && this.onClearSave();
    });
  };

  UI.prototype.getSettings = function () {
    return {
      lookSensitivity: parseFloat(this.el.optLook.value || "1.0"),
      hiContrast: Boolean(this.el.optContrast.checked),
      bigText: Boolean(this.el.optBigText.checked),
    };
  };

  UI.prototype.applySettings = function (settings) {
    const s = settings || this.getSettings();
    this.el.optLook.value = String(clamp(s.lookSensitivity || 1.0, 0.3, 2.5));
    this.el.optContrast.checked = Boolean(s.hiContrast);
    this.el.optBigText.checked = Boolean(s.bigText);

    document.documentElement.classList.toggle("hicontrast", Boolean(s.hiContrast));
    document.documentElement.classList.toggle("bigtext", Boolean(s.bigText));
  };

  UI.prototype.showLoading = function () {
    this.el.loading.classList.remove("hidden");
    this.el.start.classList.add("hidden");
  };

  UI.prototype.setLoadingProgress = function (pct, text) {
    const p = clamp(pct, 0, 1);
    this.el.loadingBar.style.width = `${Math.round(p * 100)}%`;
    if (text) this.el.loadingText.textContent = text;
  };

  UI.prototype.showStart = function (hasSave) {
    this.el.loading.classList.add("hidden");
    this.el.start.classList.remove("hidden");
    this.el.btnLoad.disabled = !hasSave;
  };

  UI.prototype.showHUD = function (isTouch) {
    this.el.start.classList.add("hidden");
    this.el.loading.classList.add("hidden");
    this.el.hud.classList.remove("hidden");

    // מובייל
    if (isTouch) this.el.mobile.classList.remove("hidden");
    else this.el.mobile.classList.add("hidden");
  };

  UI.prototype.setInteractPrompt = function (visible, text) {
    if (!visible) {
      this.el.prompt.classList.add("hidden");
      this.el.prompt.textContent = "";
      return;
    }
    this.el.prompt.textContent = text || "לחץ E כדי לתקשר";
    this.el.prompt.classList.remove("hidden");
  };

  UI.prototype.toast = function (text) {
    this.el.toast.textContent = text;
    this.el.toast.classList.remove("hidden");
    setTimeout(() => {
      this.el.toast.classList.add("hidden");
    }, 1600);
  };

  UI.prototype.updateRIASEC = function (score, maxPerDim) {
    const m = typeof maxPerDim === "number" ? maxPerDim : 10;
    ["R", "I", "A", "S", "E", "C"].forEach((k) => {
      const v = score[k] || 0;
      const pct = clamp(v / m, 0, 1);
      const fill = document.querySelector(`.fill[data-k="${k}"]`);
      const val = document.querySelector(`.value[data-v="${k}"]`);
      if (fill) fill.style.width = `${Math.round(pct * 100)}%`;
      if (val) val.textContent = String(v);
    });
  };

  UI.prototype.showDialogue = function (speaker, text, options, onPick) {
    this.el.dlgSpeaker.textContent = speaker || "דמות";
    this.el.dlgText.textContent = text || "";
    this.el.dlgOptions.innerHTML = "";

    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = opt.label;
      btn.addEventListener("click", () => onPick(opt));
      this.el.dlgOptions.appendChild(btn);
    });

    this.el.dlg.classList.remove("hidden");
    this.analytics.log("ui_dialogue_open", { speaker: speaker || "" });
  };

  UI.prototype.hideDialogue = function () {
    this.el.dlg.classList.add("hidden");
    this.el.dlgOptions.innerHTML = "";
    this.analytics.log("ui_dialogue_close", {});
  };

  UI.prototype.showJournal = function () {
    this.el.journal.classList.remove("hidden");
    this._setTab("journal");
  };

  UI.prototype.hideJournal = function () {
    this.el.journal.classList.add("hidden");
  };

  UI.prototype.bindJournalPrompt = function (promptText, sceneId) {
    this._journalBoundSceneId = sceneId || null;
    this.el.journalPrompt.textContent = promptText || "כתוב כאן...";
  };

  UI.prototype.renderJournal = function (entries) {
    this.el.journalList.innerHTML = "";
    const list = Array.isArray(entries) ? entries : [];

    list
      .slice()
      .sort((a, b) => String(b.createdAtIso).localeCompare(String(a.createdAtIso)))
      .forEach((e) => {
        const div = document.createElement("div");
        div.className = "entry";
        const title = e.sceneId ? `סצנה: ${e.sceneId}` : "כללי";
        div.innerHTML = `
          <div><strong>${title}</strong></div>
          <div class="muted" style="font-size:0.95em">${e.createdAtIso}</div>
          <div style="margin-top:6px; white-space:pre-wrap">${escapeHtml(e.text).slice(0, 240)}</div>
        `;
        this.el.journalList.appendChild(div);
      });
  };

  UI.prototype.renderInventory = function (items) {
    this.el.invList.innerHTML = "";
    const list = Array.isArray(items) ? items : [];

    if (list.length === 0) {
      const p = document.createElement("div");
      p.className = "muted";
      p.textContent = "אין פריטים עדיין.";
      this.el.invList.appendChild(p);
      return;
    }

    list.forEach((it) => {
      const div = document.createElement("div");
      div.className = "entry";
      div.innerHTML = `
        <div><strong>${escapeHtml(it.name || it.id)}</strong></div>
        <div class="muted">כמות: ${String(it.qty || 1)}</div>
      `;
      this.el.invList.appendChild(div);
    });
  };

  UI.prototype._setTab = function (tab) {
    const isJournal = tab === "journal";
    this.el.tabJournal.classList.toggle("active", isJournal);
    this.el.tabInv.classList.toggle("active", !isJournal);
    this.el.journalView.classList.toggle("hidden", !isJournal);
    this.el.invView.classList.toggle("hidden", isJournal);
  };

  UI.prototype.showFuture = function (text) {
    this.el.futureText.textContent = text || "";
    this.el.future.classList.remove("hidden");
    this.analytics.log("ui_future_open", {});
  };

  UI.prototype.hideFuture = function () {
    this.el.future.classList.add("hidden");
  };

  UI.prototype.showSettings = function () {
    this.el.settings.classList.remove("hidden");
    this.analytics.log("ui_settings_open", {});
  };

  UI.prototype.hideSettings = function () {
    this.el.settings.classList.add("hidden");
    this.analytics.log("ui_settings_close", {});
  };

  UI.prototype.onPointerLockChanged = function (locked) {
    this.analytics.log("pointerlock_changed", { locked: Boolean(locked) });
  };

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.ECO = window.ECO || {};
  window.ECO.UI = UI;
})();
