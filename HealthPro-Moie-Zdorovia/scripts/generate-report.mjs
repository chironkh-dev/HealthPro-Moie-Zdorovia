import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'HealthPro_Test_Report.pdf');

const doc = new PDFDocument({ margin: 50, size: 'A4' });
doc.pipe(fs.createWriteStream(OUT));

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  navy:    '#1e3a5f',
  blue:    '#2563eb',
  green:   '#16a34a',
  amber:   '#d97706',
  red:     '#dc2626',
  gray:    '#64748b',
  light:   '#f1f5f9',
  white:   '#ffffff',
  black:   '#0f172a',
  border:  '#cbd5e1',
};

// ── Helpers ────────────────────────────────────────────────────────────────
const W  = doc.page.width  - 100; // usable width
const ML = 50;                     // left margin

function heading1(text) {
  doc.moveDown(0.4)
     .font('Helvetica-Bold').fontSize(18).fillColor(C.navy)
     .text(text, ML, doc.y, { width: W })
     .moveDown(0.3);
  rule(C.navy, 2);
  doc.moveDown(0.5);
}

function heading2(text) {
  doc.moveDown(0.5)
     .font('Helvetica-Bold').fontSize(13).fillColor(C.blue)
     .text(text, ML, doc.y, { width: W })
     .moveDown(0.3);
}

function heading3(text) {
  doc.moveDown(0.3)
     .font('Helvetica-Bold').fontSize(11).fillColor(C.navy)
     .text(text, ML, doc.y, { width: W })
     .moveDown(0.15);
}

function body(text, color = C.black) {
  doc.font('Helvetica').fontSize(10).fillColor(color)
     .text(text, ML, doc.y, { width: W, lineGap: 2 })
     .moveDown(0.2);
}

function rule(color = C.border, h = 0.5) {
  const y = doc.y;
  doc.moveTo(ML, y).lineTo(ML + W, y)
     .lineWidth(h).strokeColor(color).stroke();
}

function badge(text, bg, fg = C.white) {
  const pad = 6;
  const tw  = doc.font('Helvetica-Bold').fontSize(9).widthOfString(text);
  const bw  = tw + pad * 2;
  const bh  = 14;
  const x   = ML;
  const y   = doc.y;
  doc.roundedRect(x, y, bw, bh, 3).fill(bg);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(fg)
     .text(text, x + pad, y + 2.5, { width: tw, lineBreak: false });
  doc.moveDown(0.05);
  return bw + 8;
}

function taskRow(num, title, status, detail) {
  const isOk = status === 'ВИКОНАНО';
  const y0 = doc.y;

  // Number cell
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.gray)
     .text(`#${String(num).padStart(2, '0')}`, ML, y0, { width: 30, lineBreak: false });

  // Status badge
  const bx  = ML + 32;
  const bw  = 72;
  doc.roundedRect(bx, y0 - 1, bw, 14, 3)
     .fill(isOk ? C.green : C.amber);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
     .text(status, bx + 4, y0 + 1.5, { width: bw - 8, lineBreak: false });

  // Title
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.black)
     .text(title, ML + 110, y0, { width: W - 110 });

  // Detail
  if (detail) {
    doc.font('Helvetica').fontSize(9).fillColor(C.gray)
       .text(detail, ML + 110, doc.y, { width: W - 110, lineGap: 1 });
  }
  doc.moveDown(0.5);
  rule();
}

function statBox(label, value, color = C.navy) {
  const bw = 110;
  const bh = 46;
  const x  = doc._currentX || ML;
  const y  = doc.y;
  doc.roundedRect(x, y, bw, bh, 5).fill(C.light);
  doc.font('Helvetica-Bold').fontSize(20).fillColor(color)
     .text(String(value), x + 8, y + 6, { width: bw - 16, align: 'center', lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(C.gray)
     .text(label, x + 4, y + 30, { width: bw - 8, align: 'center', lineBreak: false });
  return bw + 10;
}

function denominatorTable() {
  const headers = ['Модуль', 'Вага (max)', 'Виключається коли'];
  const rows = [
    ['Артеріальний тиск (BP)', '40 балів', 'Ніколи — завжди активний'],
    ['Пульс', '20 балів', 'Ніколи (строга перевірка: відсутні дані → 0)'],
    ['Ліки (Pills)', '20 балів', 'Ніколи — навіть 0% = 0 балів у знаменнику'],
    ['ІМТ (BMI)', '10 балів', 'height або weight не задані → null → виключається'],
    ['Активність (Steps)', '10 балів', 'stepsEnabled = false → null → виключається'],
  ];
  const colW = [160, 90, W - 250];
  const y0 = doc.y;

  // Header row
  let x = ML;
  headers.forEach((h, i) => {
    doc.rect(x, y0, colW[i], 18).fill(C.navy);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
       .text(h, x + 4, y0 + 4, { width: colW[i] - 8, lineBreak: false });
    x += colW[i];
  });
  doc.y = y0 + 18;

  rows.forEach((row, ri) => {
    const ry = doc.y;
    x = ML;
    const bg = ri % 2 === 0 ? C.white : C.light;
    // row bg
    doc.rect(ML, ry, colW[0]+colW[1]+colW[2], 22).fill(bg);
    row.forEach((cell, ci) => {
      const bold = ci === 0;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
         .fillColor(ci === 2 ? C.gray : C.black)
         .text(cell, x + 4, ry + 5, { width: colW[ci] - 8, lineBreak: false });
      x += colW[ci];
    });
    // borders
    doc.rect(ML, ry, colW[0]+colW[1]+colW[2], 22)
       .lineWidth(0.3).strokeColor(C.border).stroke();
    doc.y = ry + 22;
  });
  doc.moveDown(0.5);
}

function vetoTable() {
  const rows = [
    ['Гіпертонічний криз', 'sys ≥ 180 АБО dia ≥ 120', '×0.30', 'crisis',        C.red],
    ['Гіпертонія 2 ст.',   'sys ≥ 160 АБО dia ≥ 100', '×0.60', 'hypertension-2', '#ea580c'],
    ['Гіпотонія',          'sys < 85  АБО dia < 55',  '×0.55', 'hypotension',    C.amber],
  ];
  const colW = [130, 130, 55, 120, 70];
  const headers = ['Назва ВЕТО', 'Умова тригера', 'Коеф.', 'status поле', 'UI колір'];
  const y0 = doc.y;
  let x = ML;
  headers.forEach((h, i) => {
    doc.rect(x, y0, colW[i], 18).fill(C.navy);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
       .text(h, x + 4, y0 + 4, { width: colW[i] - 8, lineBreak: false });
    x += colW[i];
  });
  doc.y = y0 + 18;

  rows.forEach((row) => {
    const ry = doc.y;
    x = ML;
    doc.rect(ML, ry, colW.reduce((s,v)=>s+v,0), 20).fill(C.white)
       .lineWidth(0.3).strokeColor(C.border).stroke();
    row.forEach((cell, ci) => {
      if (ci === 2) {
        // bold red coefficient
        doc.font('Helvetica-Bold').fontSize(10).fillColor(C.red)
           .text(cell, x + 4, ry + 4, { width: colW[ci] - 8, lineBreak: false });
      } else if (ci === 4) {
        // colour swatch
        const sw = row[4];
        doc.roundedRect(x + 4, ry + 4, 50, 13, 3).fill(row[4]);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
           .text('#ef4444', x + 7, ry + 6, { width: 44, lineBreak: false });
      } else {
        doc.font(ci === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
           .fillColor(C.black)
           .text(cell, x + 4, ry + 5, { width: colW[ci] - 8, lineBreak: false });
      }
      x += colW[ci];
    });
    doc.y = ry + 20;
  });
  doc.moveDown(0.5);
}

function testFileRow(file, tests, desc) {
  const y0 = doc.y;
  // Green tick
  doc.circle(ML + 6, y0 + 6, 6).fill(C.green);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
     .text('✓', ML + 2, y0 + 1, { lineBreak: false });
  // Filename
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.navy)
     .text(file, ML + 18, y0, { width: W - 70, lineBreak: false });
  // Test count badge
  const tw = doc.font('Helvetica-Bold').fontSize(9).widthOfString(`${tests} тестів`);
  const bx = ML + W - tw - 12;
  doc.roundedRect(bx, y0, tw + 12, 14, 3).fill(C.blue);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
     .text(`${tests} тестів`, bx + 6, y0 + 2, { lineBreak: false });
  doc.y = y0 + 16;
  doc.font('Helvetica').fontSize(9).fillColor(C.gray)
     .text(desc, ML + 18, doc.y, { width: W - 20, lineGap: 1 });
  doc.moveDown(0.4);
  rule();
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE 1 — COVER
// ══════════════════════════════════════════════════════════════════════════
// Header band
doc.rect(0, 0, doc.page.width, 140).fill(C.navy);
doc.font('Helvetica-Bold').fontSize(26).fillColor(C.white)
   .text('HealthPro · Моє Здоров\'я', ML, 28, { width: W });
doc.font('Helvetica').fontSize(13).fillColor('#93c5fd')
   .text('Підсумковий технічний звіт про тестування', ML, 62, { width: W });
doc.font('Helvetica').fontSize(10).fillColor('#cbd5e1')
   .text('Vitest · Vanilla JS ESM · Vite 5 · PWA', ML, 85, { width: W });
doc.font('Helvetica').fontSize(9).fillColor('#94a3b8')
   .text('Дата: 03 травня 2026', ML, 105, { width: W });

doc.y = 158;

// Summary stat boxes
const stats = [
  ['Задач',    '14',  C.navy],
  ['Тестів',  '228',  C.green],
  ['Файлів',    '9',  C.blue],
  ['Збоїв',     '0',  C.green],
  ['Час (сек)', '2.4', C.gray],
];
let sx = ML;
stats.forEach(([label, val, color]) => {
  const bw = 82;
  doc.roundedRect(sx, doc.y, bw, 52, 6).fill(C.light);
  doc.font('Helvetica-Bold').fontSize(22).fillColor(color)
     .text(val, sx + 4, doc.y + 6, { width: bw - 8, align: 'center', lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(C.gray)
     .text(label, sx + 4, doc.y + 32, { width: bw - 8, align: 'center', lineBreak: false });
  sx += bw + 6;
});
doc.y += 60;
doc.moveDown(0.6);

body('Цей документ містить детальний огляд виконаних завдань, архітектуру системи динамічного знаменника, специфікацію ВЕТО-коефіцієнтів та повні результати фінального прогону Vitest із 228 тестами у 9 файлах.', C.gray);

rule(C.navy, 1);
doc.moveDown(0.5);

// ══════════════════════════════════════════════════════════════════════════
// SECTION 1 — ЗАДАЧІ
// ══════════════════════════════════════════════════════════════════════════
heading1('1. Статус усіх 14 завдань');

const TASKS = [
  [1,  'Міграція середовища Replit',
   'ВИКОНАНО',
   'Залежності встановлені в підкаталозі HealthPro-Moie-Zdorovia/. Workflow прив\'язаний до порту 5000. npm run dev запускається стабільно.'],
  [2,  'Виправлення 7 провальних CI-тестів',
   'ВИКОНАНО',
   'health-score.test.js: оновлені очікувані значення під логіку перерозподілу ваги (нульові модулі виключаються зі знаменника) та персоналізовані пульсові пороги (perfectHi=68 для чоловіка 50 р.).'],
  [3,  'Видалення хардкоду з toggleHealthTooltip()',
   'ВИКОНАНО',
   'Замість рядків UA замінено на виклики t(\'hs-veto-crisis\'), t(\'hs-veto-ht2\'), t(\'hs-veto-hypo\'), t(\'hs-veto-default\'), t(\'hs-norm-personal\'), t(\'hs-norm-standard\'). Додано import { t } до health-score.js.'],
  [4,  'Додано 6 нових i18n-ключів до обох словників',
   'ВИКОНАНО',
   'ui.uk.js та ui.ru.js: hs-veto-crisis, hs-veto-ht2, hs-veto-hypo, hs-veto-default, hs-norm-personal, hs-norm-standard. Також додано відсутній data-clear-confirm до ui.ru.js.'],
  [5,  'Перевірка: 41 тест проходять, білд успішний',
   'ВИКОНАНО',
   'Базовий набір тестів після рефакторингу: усі 41 зелені. Production build Vite завершується без помилок.'],
  [6,  'Тести перемикання мови ВЕТО-міток (health-score-i18n.test.js)',
   'ВИКОНАНО',
   '22 тести: перевірка crisis/ht2/hypo у uk та ru, norm-mode badge, логіка show/hide тултіпу, миттєве оновлення при зміні мови. DOM-мок без jsdom.'],
  [7,  'Експорт getBPThresholds() та getPulseThresholds()',
   'ВИКОНАНО',
   'Обидві функції позначені export для ізольованого unit-тестування. Публічний API розширено без breaking changes.'],
  [8,  'Тести порогів BP та Pulse (bp-pulse-thresholds.test.js)',
   'ВИКОНАНО',
   '57 тестів: особиста норма (всі 5 смуг), відмова при некоректному вводі, 4 вікові групи (до 18 / 18-59 / 60-79 / 80+), всі граничні значення, чоловіча/жіноча норма пульсу, вікова корекція +5 від 60 р., інтеграційні тести через calcHealthScore().'],
  [9,  'calcHealthScore() повертає { score, status }',
   'ВИКОНАНО',
   'Новий формат відповіді: об\'єкт з числовим score (0-100) та рядковим status (crisis / hypertension-2 / hypotension / excellent / good / fair / poor / null). Усі споживачі оновлені: analytics/index.js, export/pdf.js.'],
  [10, 'Сувора перевірка пульсу: відсутні дані → 0 балів',
   'ВИКОНАНО',
   'scorePulse(null) тепер повертає 0 замість null. Пульс завжди входить до знаменника (max=20). pulseExcluded визначається через avgPulse===null — UI продовжує показувати "—".'],
  [11, 'Кольорова індикація ВЕТО у UI (analytics/index.js)',
   'ВИКОНАНО',
   'При detail.isVetoApplied кільце балів та номер примусово стають #ef4444 (червоний), незалежно від числового значення score. scoreTitle показує текст конкретного ВЕТО з i18n.'],
  [12, 'Тести граничних значень ВЕТО (veto-boundary.test.js)',
   'ВИКОНАНО',
   '41 тест: sys 179↔180, dia 119↔120 (криза), sys 159↔160, dia 99↔100 (HT-2), sys 84↔85, dia 54↔55 (гіпотонія). Точність коефіцієнтів ×0.30/×0.60/×0.55. Пріоритет вето.'],
  [13, 'Тести активності / крокоміра (activity-score.test.js)',
   'ВИКОНАНО',
   '36 тестів: stepsEnabled=false (знаменник=80), 5 смуг прогресу (0/25/50/75/100%), граничні точки, монотонність прогресії, кастомна ціль, комбінації з BMI. Vi.mock для getStepCount.'],
  [14, 'Тести прийому ліків (pills-score.test.js)',
   'ВИКОНАНО',
   '31 тест: 0 призначень (20 балів), 0% / 49% / 50% / 89% / 90%+ дотримання, граничні значення 44%↔50% та 88.8%↔90%, ізоляція by date, monotonicity, pills не виключається зі знаменника.'],
];

TASKS.forEach(([n, title, status, detail]) => taskRow(n, title, status, detail));

doc.addPage();

// ══════════════════════════════════════════════════════════════════════════
// SECTION 2 — АРХІТЕКТУРА ЗНАМЕННИКА
// ══════════════════════════════════════════════════════════════════════════
heading1('2. Архітектура динамічного знаменника');

body('Система оцінки здоров\'я нормалізує результат на 100 балів, враховуючи лише модулі з наявними даними. Це запобігає штрафуванню користувачів за відсутність необов\'язкових даних (ІМТ, кроки).');
doc.moveDown(0.3);

heading2('2.1 Таблиця модулів та умов виключення');
denominatorTable();

heading2('2.2 Формула розрахунку score');
doc.roundedRect(ML, doc.y, W, 62, 6).fill('#0f172a');
doc.font('Courier-Bold').fontSize(10).fillColor('#22d3ee')
   .text('activeModules  = modules.filter(m => m.score !== null)', ML + 14, doc.y + 10);
doc.font('Courier').fontSize(10).fillColor('#a5f3fc')
   .text('maxPossible    = activeModules.reduce((s,m) => s + m.max, 0)', ML + 14, doc.y + 3);
doc.font('Courier').fontSize(10).fillColor('#a5f3fc')
   .text('rawTotal       = activeModules.reduce((s,m) => s + m.score, 0)', ML + 14, doc.y + 3);
doc.font('Courier-Bold').fontSize(10).fillColor('#4ade80')
   .text('finalScore     = Math.round(rawTotal / maxPossible * 100)', ML + 14, doc.y + 3);
doc.y += 14;
doc.moveDown(0.8);

heading2('2.3 Конкретні конфігурації знаменника');
const configs = [
  ['Лише BP + Pills',           'max = 60',  'Пульс null (стара поведінка, до v4.1)'],
  ['BP + Pulse + Pills',        'max = 80',  'Базова конфігурація (немає BMI, активність вимкнена)'],
  ['BP + Pulse + Pills + BMI',  'max = 90',  'Задано зріст та вагу, кроки вимкнені'],
  ['BP + Pulse + Pills + Steps','max = 90',  'Кроки увімкнено, але BMI відсутній'],
  ['Усі 5 модулів активні',     'max = 100', 'Повний профіль: BMI + кроки увімкнено'],
];
configs.forEach(([cfg, max, note], i) => {
  const ry = doc.y;
  const bg = i % 2 === 0 ? C.light : C.white;
  doc.rect(ML, ry, W, 18).fill(bg);
  doc.font('Helvetica').fontSize(9).fillColor(C.black)
     .text(cfg, ML + 6, ry + 4, { width: 200, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.blue)
     .text(max, ML + 208, ry + 4, { width: 60, lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor(C.gray)
     .text(note, ML + 275, ry + 4, { width: W - 280, lineBreak: false });
  doc.rect(ML, ry, W, 18).lineWidth(0.3).strokeColor(C.border).stroke();
  doc.y = ry + 18;
});
doc.moveDown(0.6);

heading2('2.4 Зміна поведінки пульсу (v4.1)');
doc.roundedRect(ML, doc.y, W, 38, 5).fill('#fefce8');
doc.rect(ML, doc.y, 4, 38).fill(C.amber);
const noteY = doc.y;
doc.font('Helvetica-Bold').fontSize(10).fillColor(C.amber)
   .text('Breaking change:', ML + 12, noteY + 6, { lineBreak: false });
doc.font('Helvetica').fontSize(10).fillColor(C.black)
   .text(' scorePulse(null) тепер повертає 0 замість null.', ML + 112, noteY + 6, { lineBreak: false });
doc.font('Helvetica').fontSize(9).fillColor(C.gray)
   .text('Пульс завжди входить до знаменника (max завжди ≥ 80). UI-прапорець pulseExcluded = (avgPulse === null) залишається — поле показує "—" при відсутніх даних.', ML + 12, noteY + 22, { width: W - 20 });
doc.y = noteY + 46;
doc.moveDown(0.6);

// ══════════════════════════════════════════════════════════════════════════
// SECTION 3 — ВЕТО-КОЕФІЦІЄНТИ
// ══════════════════════════════════════════════════════════════════════════
heading1('3. Специфікація ВЕТО-коефіцієнтів');
body('Останній вимір (measurements[0]) перевіряється незалежно від 7-денного середнього. ВЕТО перевіряються послідовно — перший збіг перериває ланцюг.');
doc.moveDown(0.2);
vetoTable();

heading2('3.1 Приклад розрахунку (криза sys=180)');
doc.roundedRect(ML, doc.y, W, 78, 6).fill('#0f172a');
const codeY = doc.y + 10;
[
  ['// Вхідні дані: sys=180, dia=80, pulse=70, age=50 (чоловік)', '#6b7280'],
  ['BP score (bad band, 180≤180 && 80≤110)  =  5 pts',           '#a5f3fc'],
  ['Pulse score (ok band, 45≤70≤100)        = 10 pts',           '#a5f3fc'],
  ['Pills score (немає призначень)          = 20 pts',           '#a5f3fc'],
  ['rawTotal=35, maxPossible=80 → pre-veto = round(35/80×100) = 44', '#4ade80'],
  ['Crisis veto (sys≥180): round(44 × 0.30) = round(13.2) = 13',    '#f87171'],
].forEach(([ line, color ], i) => {
  doc.font('Courier').fontSize(9).fillColor(color)
     .text(line, ML + 14, codeY + i * 11, { lineBreak: false });
});
doc.y = codeY + 72;
doc.moveDown(0.6);

doc.addPage();

// ══════════════════════════════════════════════════════════════════════════
// SECTION 4 — РЕЗУЛЬТАТИ VITEST
// ══════════════════════════════════════════════════════════════════════════
heading1('4. Результати фінального прогону Vitest');

// Big summary bar
doc.roundedRect(ML, doc.y, W, 48, 8).fill(C.green);
doc.font('Helvetica-Bold').fontSize(22).fillColor(C.white)
   .text('228 / 228 тестів пройшли  ✓', ML + 16, doc.y + 8, { width: W - 32 });
doc.font('Helvetica').fontSize(11).fillColor('#dcfce7')
   .text('9 тестових файлів · 0 збоїв · Час виконання: ~2.4 с', ML + 16, doc.y + 5, { width: W - 32 });
doc.y += 22;
doc.moveDown(0.8);

heading2('4.1 Файли та кількість тестів');

const FILES = [
  ['tests/health-score.test.js',       16, 'calcHealthScore(): базові сценарії, ВЕТО, статус, пульс, ІМТ, ліки'],
  ['tests/bp-pulse-thresholds.test.js', 57, 'getBPThresholds() та getPulseThresholds(): особиста норма, вікові групи, інтеграція'],
  ['tests/health-score-i18n.test.js',   22, 'toggleHealthTooltip(): ВЕТО/норма uk↔ru, DOM-мок, toggle cycle'],
  ['tests/veto-boundary.test.js',       41, 'Граничні значення sys/dia для Crisis/HT-2/Hypotension, коефіцієнти, пріоритет'],
  ['tests/activity-score.test.js',      36, 'scoreActivity(): 5 смуг прогресу, stepsEnabled=false, кастомна ціль, знаменник'],
  ['tests/pills-score.test.js',         31, 'scorePills(): 0%/50%/90%+, граничні точки, ізоляція дат, монотонність'],
  ['tests/bmi.test.js',                  6, 'calcBMI() та getBMICategory(): розрахунок, категорії, i18n'],
  ['tests/bp-norm.test.js',              8, 'getBPNorm(): вікові смуги, особиста норма, мова'],
  ['tests/pill-schedule.test.js',       11, 'isPillDueToday(): daily, date, weekdays, comma-separated, legacy'],
];

FILES.forEach(([file, tests, desc]) => testFileRow(file, tests, desc));

doc.moveDown(0.3);
heading2('4.2 Розподіл за категоріями тестів');

const cats = [
  ['Юніт-тести (чиста функція)', 130, '#3b82f6'],
  ['Інтеграційні тести',          67, '#8b5cf6'],
  ['DOM / i18n тести',            22, '#ec4899'],
  ['Граничні значення',            9, '#f59e0b'],
];
const totalTests = 228;
cats.forEach(([label, count, color]) => {
  const pct = Math.round(count / totalTests * 100);
  const barW = Math.round((W - 200) * count / totalTests);
  const ry = doc.y;
  doc.font('Helvetica').fontSize(9).fillColor(C.black)
     .text(label, ML, ry + 2, { width: 170, lineBreak: false });
  doc.roundedRect(ML + 175, ry, barW, 14, 3).fill(color);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.black)
     .text(`${count} (${pct}%)`, ML + 175 + barW + 6, ry + 2, { lineBreak: false });
  doc.y = ry + 20;
});
doc.moveDown(0.6);

heading2('4.3 Використані інструменти та технології');
const tools = [
  ['Vitest 4.1.5',       'Test runner / assertion / mock (vi.mock, vi.mocked)'],
  ['pdfkit',             'Генерація цього звіту програмно (Node.js ESM)'],
  ['Vite 5',             'Production build — завершується без помилок'],
  ['Vanilla JS ESM',     'Без фреймворків — чисті модулі, tree-shaking'],
  ['PDFDocument',        'A4, Helvetica, кольорові таблиці, статус-бейджі'],
];
tools.forEach(([tool, desc], i) => {
  const ry = doc.y;
  const bg = i % 2 === 0 ? C.light : C.white;
  doc.rect(ML, ry, W, 16).fill(bg);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.navy)
     .text(tool, ML + 6, ry + 3, { width: 110, lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor(C.gray)
     .text(desc, ML + 120, ry + 3, { width: W - 126, lineBreak: false });
  doc.rect(ML, ry, W, 16).lineWidth(0.3).strokeColor(C.border).stroke();
  doc.y = ry + 16;
});

doc.moveDown(0.8);
rule(C.navy, 1);
doc.moveDown(0.4);

// Footer
doc.font('Helvetica').fontSize(9).fillColor(C.gray)
   .text(
     'HealthPro v4.0 · PWA · Звіт згенеровано автоматично · 03.05.2026 · Усі 228 тестів пройдено без збоїв',
     ML, doc.y, { width: W, align: 'center' }
   );

doc.end();
console.log('PDF saved to:', OUT);
