(function () {
  "use strict";

  const DIM = ["R", "I", "A", "S", "E", "C"];

  function createScore(initial) {
    const s = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    if (initial) {
      DIM.forEach((k) => {
        if (typeof initial[k] === "number") s[k] = initial[k];
      });
    }
    return s;
  }

  function applyDelta(score, delta) {
    if (!delta) return;
    DIM.forEach((k) => {
      if (typeof delta[k] === "number") score[k] += delta[k];
    });
  }

  function total(score) {
    return DIM.reduce((acc, k) => acc + score[k], 0);
  }

  function top2(score) {
    const pairs = DIM.map((k) => [k, score[k]]);
    pairs.sort((a, b) => b[1] - a[1]);
    return pairs.slice(0, 2);
  }

  function normalized(score, maxPerDim) {
    const m = typeof maxPerDim === "number" ? maxPerDim : 10;
    const out = {};
    DIM.forEach((k) => {
      out[k] = Math.max(0, Math.min(1, score[k] / m));
    });
    return out;
  }

  function explainKey(k) {
    // תיאור קצר, לא “אבחון”
    const map = {
      R: "ביצועי, מעשי",
      I: "חקרני, אנליטי",
      A: "אמנותי, יצירתי",
      S: "חברתי, מסייע",
      E: "יזמי, משכנע",
      C: "מנהלתי, מסודר",
    };
    return map[k] || k;
  }

  window.ECO = window.ECO || {};
  window.ECO.riasec = {
    DIM,
    createScore,
    applyDelta,
    total,
    top2,
    normalized,
    explainKey,
  };
})();
