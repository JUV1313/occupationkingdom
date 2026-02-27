(function () {
  "use strict";

  const { safeJsonParse, nowIso } = window.ECO.util;

  const KEY = "ecoCareer_save_v1";

  function saveGame(state) {
    const snapshot = Object.assign({}, state, { savedAtIso: nowIso() });
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  }

  function loadGame() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return safeJsonParse(raw, null);
  }

  function clearSave() {
    localStorage.removeItem(KEY);
  }

  function hasSave() {
    return Boolean(localStorage.getItem(KEY));
  }

  window.ECO = window.ECO || {};
  window.ECO.storage = {
    saveGame,
    loadGame,
    clearSave,
    hasSave,
  };
})();
