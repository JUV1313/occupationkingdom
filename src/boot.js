(function () {
  "use strict";

  const canvas = document.getElementById("game-canvas");

  const analytics = new window.ECO.Analytics();
  analytics.log("boot", {});

  const ui = new window.ECO.UI(analytics);
  const input = new window.ECO.InputManager(canvas, ui);

  const game = new window.ECO.Game(canvas, ui, analytics, input);

  ui.applySettings({ lookSensitivity: 1.0, hiContrast: false, bigText: false });

  // חשוב: להציג מובייל controls רק אם טץ'
  if (input.isTouch) {
    ui.el.mobile.classList.remove("hidden");
  }

  game
    .init()
    .catch((err) => {
      console.error(err);
      ui.toast("שגיאה בהעלאה, בדוק קונסול.");
      analytics.log("boot_error", { message: String(err && err.message ? err.message : err) });
    });
})();
