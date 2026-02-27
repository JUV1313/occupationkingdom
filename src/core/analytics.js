(function () {
  "use strict";

  const { uuid, nowIso, safeJsonParse, downloadText } = window.ECO.util;

  const KEY = "ecoCareer_telemetry_v1";
  const MAX_EVENTS = 4000;

  function Analytics() {
    this.sessionId = uuid();
    this.events = [];
    this._loadedOnce = false;
    this._dirty = false;
    this._flushTimer = null;
  }

  Analytics.prototype._load = function () {
    if (this._loadedOnce) return;
    this._loadedOnce = true;

    const raw = localStorage.getItem(KEY);
    const parsed = safeJsonParse(raw || "[]", []);
    if (Array.isArray(parsed)) {
      this.events = parsed;
    }
  };

  Analytics.prototype._scheduleFlush = function () {
    if (this._flushTimer) return;
    this._flushTimer = setTimeout(() => {
      this._flushTimer = null;
      this.flush();
    }, 250);
  };

  Analytics.prototype.log = function (name, payload) {
    this._load();

    const evt = {
      eventId: uuid(),
      sessionId: this.sessionId,
      name: String(name),
      tsIso: nowIso(),
      payload: payload || {},
    };

    this.events.push(evt);
    if (this.events.length > MAX_EVENTS) {
      this.events.splice(0, this.events.length - MAX_EVENTS);
    }

    this._dirty = true;
    this._scheduleFlush();
  };

  Analytics.prototype.flush = function () {
    if (!this._dirty) return;
    this._dirty = false;
    localStorage.setItem(KEY, JSON.stringify(this.events));
  };

  Analytics.prototype.exportToFile = function () {
    this._load();
    const filename = "ecoCareer_telemetry_export.json";
    downloadText(filename, JSON.stringify(this.events, null, 2));
  };

  Analytics.prototype.clear = function () {
    this.events = [];
    this._dirty = true;
    this.flush();
  };

  window.ECO = window.ECO || {};
  window.ECO.Analytics = Analytics;
})();
