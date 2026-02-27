(function () {
  "use strict";

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function uuid() {
    // לא קריפטוגרפי, מספיק ל־MVP
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function isTouchDevice() {
    return (
      "ontouchstart" in window ||
      (navigator && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 0)
    );
  }

  function safeJsonParse(text, fallback) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return fallback;
    }
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  window.ECO = window.ECO || {};
  window.ECO.util = {
    clamp,
    lerp,
    nowIso,
    uuid,
    isTouchDevice,
    safeJsonParse,
    downloadText,
  };
})();
