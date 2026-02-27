(function () {
  "use strict";

  const { top2, explainKey } = window.ECO.riasec;

  function generateFutureStub(state) {
    const t = top2(state.riasec || {});
    const first = t[0] ? t[0][0] : "S";
    const second = t[1] ? t[1][0] : "I";

    const firstDesc = explainKey(first);
    const secondDesc = explainKey(second);

    const completed = state.progress && state.progress.completedScenes
      ? Object.keys(state.progress.completedScenes).length
      : 0;

    return (
      "בעוד 10 שנים, אם תמשיך בדפוסים שנראים עד עכשיו:\n\n" +
      `הנטייה המובילה שלך כרגע היא ${first} (${firstDesc}), ואחריה ${second} (${secondDesc}).\n\n` +
      "סימולציה ראשונית (סטאב):\n" +
      "- אתה בוחר תפקידים שמחברים בין מה שאתה טוב בו למה שאתה מוכן לשלם עליו מחיר.\n" +
      "- כשיש לחץ, אתה נוטה לשחזר את אותו מנגנון החלטה, זה לא טוב ולא רע, זה עקבי.\n\n" +
      `השלמת עד עכשיו ${completed} סצנות. ככל שתשלים יותר, החיזוי יהיה ספציפי יותר.\n\n` +
      "הרחבה עתידית: מסלולים אפשריים, גרפים של שינוי לאורך זמן, וסיפור שמבוסס על החלטות, לא רק על ניקוד."
    );
  }

  window.ECO = window.ECO || {};
  window.ECO.future = { generateFutureStub };
})();
