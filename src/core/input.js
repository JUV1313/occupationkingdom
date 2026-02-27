(function () {
  "use strict";

  const { clamp, isTouchDevice } = window.ECO.util;

  function InputManager(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;

    this.isTouch = isTouchDevice();
    this.moveX = 0; // -1..1
    this.moveY = 0; // -1..1

    this.actions = {
      interact: false,
      toggleJournal: false,
      close: false,
    };

    this.lookSensitivity = 1.0;
    this._joyActive = false;
    this._joyBase = { x: 0, y: 0 };
    this._joyId = null;

    this._initKeyboard();
    this._initPointerLock();
    this._initJoystick();
  }

  InputManager.prototype.resetFrameActions = function () {
    this.actions.interact = false;
    this.actions.toggleJournal = false;
    this.actions.close = false;
  };

  InputManager.prototype._initKeyboard = function () {
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyE") this.actions.interact = true;
      if (e.code === "KeyJ") this.actions.toggleJournal = true;
      if (e.code === "Escape") this.actions.close = true;
    });
  };

  InputManager.prototype._initPointerLock = function () {
    this.canvas.addEventListener("click", () => {
      // ניסיון Pointer Lock בדסקטופ בלבד
      if (this.isTouch) return;
      if (document.pointerLockElement === this.canvas) return;
      try {
        this.canvas.requestPointerLock();
      } catch (e) {
        // לא קריטי
      }
    });

    document.addEventListener("pointerlockchange", () => {
      const locked = document.pointerLockElement === this.canvas;
      this.ui.onPointerLockChanged(locked);
    });
  };

  InputManager.prototype._initJoystick = function () {
    const joy = document.getElementById("joy-left");
    if (!joy) return;

    const stick = joy.querySelector(".stick");

    const setStick = (dx, dy) => {
      const max = 44;
      const cx = clamp(dx, -max, max);
      const cy = clamp(dy, -max, max);
      stick.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`;

      this.moveX = clamp(cx / max, -1, 1);
      this.moveY = clamp(cy / max, -1, 1);
    };

    const resetStick = () => {
      stick.style.transform = "translate(-50%, -50%)";
      this.moveX = 0;
      this.moveY = 0;
    };

    const onDown = (ev) => {
      if (!this.isTouch) return;
      ev.preventDefault();
      this._joyActive = true;
      this._joyId = ev.pointerId;
      const rect = joy.getBoundingClientRect();
      this._joyBase.x = rect.left + rect.width / 2;
      this._joyBase.y = rect.top + rect.height / 2;
      joy.setPointerCapture(ev.pointerId);
    };

    const onMove = (ev) => {
      if (!this._joyActive) return;
      if (ev.pointerId !== this._joyId) return;
      ev.preventDefault();
      const dx = ev.clientX - this._joyBase.x;
      const dy = ev.clientY - this._joyBase.y;
      setStick(dx, dy);
    };

    const onUp = (ev) => {
      if (ev.pointerId !== this._joyId) return;
      ev.preventDefault();
      this._joyActive = false;
      this._joyId = null;
      resetStick();
    };

    joy.addEventListener("pointerdown", onDown);
    joy.addEventListener("pointermove", onMove);
    joy.addEventListener("pointerup", onUp);
    joy.addEventListener("pointercancel", onUp);
  };

  // תאימות, רושמים כדי לאפשר בדיקות מהירות
  InputManager.prototype._stat = function () {
    return { moveX: this.moveX, moveY: this.moveY, isTouch: this.isTouch };
  };

  window.ECO = window.ECO || {};
  window.ECO.InputManager = InputManager;
})();
