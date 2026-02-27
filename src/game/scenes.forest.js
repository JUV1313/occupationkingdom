(function () {
  "use strict";

  // 3 סצנות ממומשות, השאר מסומנות TODO להרחבה ל־10
  const FOREST_SCENES = [
    {
      id: "forest_01_intro",
      title: "בכניסה ליער",
      kind: "scene",
      position: { x: 2, y: 0, z: 6 },
      prompt: "הזקן עומד ליד אבן עם סמלים.",
      npcId: "elder",
      reflectionPrompt: "מה גרם לך לבחור את מה שבחרת כאן?",
      dialogue: {
        startId: "n1",
        nodes: {
          n1: {
            speaker: "זקן היער",
            text:
              "ברוך הבא. היער לא שואל מי אתה, הוא שואל איך אתה מגיב. יש כאן מי שמחכה לעזרה, ויש מי שמחכה לסדר.",
            options: [
              {
                id: "o1",
                label: "אני קודם מקשיב לאנשים ומבין מה קורה.",
                effects: { riasec: { S: 2, I: 1 }, echo: "שמעת לפני שפעלת. אנשים יזכרו את זה." },
                nextId: "end",
              },
              {
                id: "o2",
                label: "אני מסתכל על הסביבה ומתחיל לפתור בעיה מעשית.",
                effects: { riasec: { R: 2, I: 1 }, echo: "פעלת מהר. לפעמים זה מציל זמן, לפעמים אמון." },
                nextId: "end",
              },
              {
                id: "o3",
                label: "אני מנסה לשכנע את כולם להתאחד סביב פתרון אחד.",
                effects: { riasec: { E: 2, S: 1 }, echo: "יש לך נוכחות. השאלה אם זה מוביל או דוחף." },
                nextId: "end",
              },
            ],
          },
          end: {
            speaker: "זקן היער",
            text: "טוב. המשך ללכת. יש עוד צמתים שבהם תראה את עצמך.",
            options: [{ id: "ok", label: "סיום", effects: {}, nextId: null }],
          },
        },
      },
    },

    {
      id: "forest_02_crisis",
      title: "מריבה בכפרון",
      kind: "scene",
      position: { x: -10, y: 0, z: -8 },
      prompt: "שני כפריים צורחים. שלישי שותק בצד.",
      npcId: "elder",
      reflectionPrompt: "מה היה חשוב לך יותר, צדק, שלום, או יעילות?",
      dialogue: {
        startId: "n1",
        nodes: {
          n1: {
            speaker: "כפרי",
            text: "הוא לקח לי את המים, לי אין לילדים! תגיד לו משהו!",
            options: [
              {
                id: "o1",
                label: "אני עוצר את שניכם. קודם כל, כל אחד מספר בתורו.",
                effects: { riasec: { C: 2, S: 1 }, echo: "סידרת את הרעש. לא כולם אוהבים גבולות, אבל זה הרגיע." },
                nextId: "n2",
              },
              {
                id: "o2",
                label: "אני הולך לשקט, שואל אותו מה הוא ראה.",
                effects: { riasec: { I: 2, S: 1 }, echo: "חיפשת עובדות לפני עמדה. זה מפחית טעויות." },
                nextId: "n3",
              },
              {
                id: "o3",
                label: "אני מציע פתרון מיידי, חלוקה מחדש עכשיו.",
                effects: { riasec: { R: 1, E: 1 }, echo: "בחרת פעולה. זה עובד כשכולם מסכימים על מי מוביל." },
                nextId: "n4",
              },
            ],
          },
          n2: {
            speaker: "כפרי",
            text: "בסדר. רגע. מי התחיל?",
            options: [{ id: "ok", label: "אוקיי", effects: {}, nextId: "end" }],
          },
          n3: {
            speaker: "העד",
            text: "ראיתי שהם לא רבים רק על מים. הם רבים על כבוד.",
            options: [{ id: "ok", label: "אוקיי", effects: {}, nextId: "end" }],
          },
          n4: {
            speaker: "כפרי",
            text: "אם אתה אומר ככה, אז כן. אבל מי ערב שזה יחזור?",
            options: [{ id: "ok", label: "אוקיי", effects: {}, nextId: "end" }],
          },
          end: {
            speaker: "קול פנימי",
            text: "היער רושם את דפוסי ההחלטה שלך. אתה רואה את זה גם ב־HUD.",
            options: [{ id: "done", label: "סיום", effects: {}, nextId: null }],
          },
        },
      },
    },

    {
      id: "forest_03_healer",
      title: "מרפאה מאולתרת",
      kind: "scene",
      position: { x: 14, y: 0, z: -2 },
      prompt: "אדם פצוע, זמן קצר, והחלטות לא נוחות.",
      npcId: "elder",
      reflectionPrompt: "בחרת בין טיפול, חקירה, או ניהול. למה?",
      dialogue: {
        startId: "n1",
        nodes: {
          n1: {
            speaker: "מרפאה",
            text:
              "יש לי עשבים, אבל אני לא בטוחה. אתה יכול לעזור לי לבחור, או לארגן את האנשים, או להוציא את הפצוע מכאן.",
            options: [
              {
                id: "o1",
                label: "אני מתמקד בטיפול. מה הסימפטומים המדויקים?",
                effects: { riasec: { I: 2, S: 1 }, echo: "הלכת לתמונה קלינית. זה חזק, אם אתה עומד בזה." },
                nextId: "end",
              },
              {
                id: "o2",
                label: "אני מארגן תור ותפקידים, עכשיו.",
                effects: { riasec: { C: 2, E: 1 }, echo: "ארגון תחת לחץ. זה מקצוע בפני עצמו." },
                nextId: "end",
              },
              {
                id: "o3",
                label: "אני לוקח אותו החוצה למקום בטוח ומעשי.",
                effects: { riasec: { R: 2, S: 1 }, echo: "מיקדת בסביבה ובמיידיות. זה מציל חיים כשאין זמן." },
                nextId: "end",
              },
            ],
          },
          end: {
            speaker: "מרפאה",
            text: "תודה. בלי קשר, הבחירה שלך חשפה משהו עליך.",
            options: [{ id: "done", label: "סיום", effects: {}, nextId: null }],
          },
        },
      },
    },

    // TODO: forest_04, stone_01.., fire_01.., future_10, סה"כ 10
    {
      id: "future_oracle_stub",
      title: "אורקל העתיד",
      kind: "future",
      position: { x: 0, y: 0, z: 0 },
      prompt: "עמוד אבן עם סימנים. כאן יהיה חיזוי 10 שנים.",
      npcId: null,
      reflectionPrompt: null,
      dialogue: null,
    },
  ];

  window.ECO = window.ECO || {};
  window.ECO.data = window.ECO.data || {};
  window.ECO.data.FOREST_SCENES = FOREST_SCENES;
})();
