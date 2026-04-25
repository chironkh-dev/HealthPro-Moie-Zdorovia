const fs = require('fs');
const path = require('path');
const { jsPDF } = require(path.join(__dirname, '..', 'HealthPro-Moie-Zdorovia', 'node_modules', 'jspdf'));

const FONT_REG_PATH  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const OUT_DIR  = path.join(__dirname, '..', 'attached_assets');
const OUT_FILE = path.join(OUT_DIR, 'HealthPro_PrePhase2_Final_Report.pdf');

if (!fs.existsSync(FONT_REG_PATH) || !fs.existsSync(FONT_BOLD_PATH)) {
  console.error('Cyrillic fonts not found.'); process.exit(1);
}

const doc = new jsPDF({ unit: 'pt', format: 'a4' });
doc.addFileToVFS('NotoSans-Regular.ttf', fs.readFileSync(FONT_REG_PATH).toString('base64'));
doc.addFileToVFS('NotoSans-Bold.ttf',    fs.readFileSync(FONT_BOLD_PATH).toString('base64'));
doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
doc.addFont('NotoSans-Bold.ttf',    'NotoSans', 'bold');
doc.setFont('NotoSans', 'normal');

const PAGE_W = doc.internal.pageSize.getWidth();
const PAGE_H = doc.internal.pageSize.getHeight();
const MARGIN = 48;
const MAX_W  = PAGE_W - MARGIN * 2;
let y = MARGIN;

const COLOR_PRIMARY = [70, 90, 220];
const COLOR_DARK    = [20, 30, 60];
const COLOR_GRAY    = [110, 120, 140];
const COLOR_OK      = [16, 160, 80];
const COLOR_AMBER   = [200, 140, 30];

function ensureSpace(n) { if (y + n > PAGE_H - MARGIN) { doc.addPage(); y = MARGIN; } }
function h1(t) { ensureSpace(40); doc.setFont('NotoSans','bold'); doc.setFontSize(20); doc.setTextColor(...COLOR_DARK); doc.text(t, MARGIN, y); y+=16; doc.setDrawColor(...COLOR_PRIMARY); doc.setLineWidth(2); doc.line(MARGIN, y, MARGIN+60, y); y+=20; }
function h2(t) { ensureSpace(32); y+=4; doc.setFont('NotoSans','bold'); doc.setFontSize(13); doc.setTextColor(...COLOR_PRIMARY); doc.text(t, MARGIN, y); y+=16; }
function p(t, opts={}) { doc.setFont('NotoSans','normal'); doc.setFontSize(opts.size||11); doc.setTextColor(...(opts.color||COLOR_DARK)); const lines = doc.splitTextToSize(t, MAX_W); lines.forEach(l => { ensureSpace(15); doc.text(l, MARGIN, y); y+=14; }); y+=4; }
function bullet(t) { doc.setFont('NotoSans','normal'); doc.setFontSize(11); doc.setTextColor(...COLOR_DARK); const lines = doc.splitTextToSize(t, MAX_W-14); lines.forEach((l, i) => { ensureSpace(15); if (i===0) { doc.setFillColor(...COLOR_PRIMARY); doc.circle(MARGIN+4, y-4, 2, 'F'); } doc.text(l, MARGIN+14, y); y+=14; }); }
function table(rows, opts={}) {
  const cw = opts.colWidths || rows[0].map(() => MAX_W/rows[0].length);
  const rh = opts.rowHeight || 22;
  rows.forEach((row, r) => {
    ensureSpace(rh+2);
    let x = MARGIN;
    if (r===0) { doc.setFillColor(...COLOR_PRIMARY); doc.rect(MARGIN, y-14, MAX_W, rh, 'F'); doc.setTextColor(255,255,255); doc.setFont('NotoSans','bold'); }
    else { if (r%2===0) { doc.setFillColor(244,246,252); doc.rect(MARGIN, y-14, MAX_W, rh, 'F'); } doc.setTextColor(...COLOR_DARK); doc.setFont('NotoSans','normal'); }
    doc.setFontSize(10);
    row.forEach((c, i) => { doc.text(String(c), x+6, y); x += cw[i]; });
    y += rh;
  });
  y += 6;
}
function badge(t, color) { const w = doc.getTextWidth(t)+16; ensureSpace(20); doc.setFillColor(...color); doc.roundedRect(MARGIN, y-12, w, 18, 4, 4, 'F'); doc.setTextColor(255,255,255); doc.setFont('NotoSans','bold'); doc.setFontSize(10); doc.text(t, MARGIN+8, y+1); y += 26; }
function code(t) { doc.setFont('NotoSans','normal'); doc.setFontSize(9); doc.setTextColor(...COLOR_DARK); String(t).split('\n').forEach(line => { ensureSpace(13); doc.setFillColor(244,246,252); doc.rect(MARGIN, y-10, MAX_W, 13, 'F'); doc.text(line, MARGIN+6, y); y += 13; }); y += 6; }

// ─── Header ───────────────────────────────────────────────
doc.setFillColor(...COLOR_PRIMARY);
doc.rect(0, 0, PAGE_W, 96, 'F');
doc.setTextColor(255, 255, 255);
doc.setFont('NotoSans', 'bold');
doc.setFontSize(22);
doc.text('HealthPro · Моє Здоров\'я', MARGIN, 46);
doc.setFont('NotoSans', 'normal');
doc.setFontSize(13);
doc.text('Звіт · Підготовка до Фази 2 — обидві задачі виконано', MARGIN, 68);
doc.setFontSize(10);
doc.text(new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }), MARGIN, 84);
y = 130;

// ─── Summary ───────────────────────────────────────────────
h1('1 · Резюме');
p('Перед стартом Фази 2 (Capacitor Android) та Етапу 5 (SQLite) виконано обидві технічні задачі з документа "Підготовка до Фази 2": розширення тестів для критичної функції isPillDueToday і налаштування CI/CD через GitHub Actions.');
badge('ЗАДАЧА А: 13 ТЕСТІВ ДОДАНО', COLOR_OK);
badge('ЗАДАЧА Б: CI WORKFLOW СТВОРЕНО', COLOR_OK);
badge('УСЬОГО ТЕСТІВ: 41/41 ЗЕЛЕНІ', COLOR_OK);
badge('npm run build: УСПІШНО (997 мс)', COLOR_OK);

// ─── Task A ────────────────────────────────────────────────
h1('2 · Задача А — тести для isPillDueToday');

h2('2.1 · Розташування функції');
p('Функція знаходиться у src/features/meds/index.js (не у schedule.js, як припускав документ). Імпорт today() — з src/core/state.js (не utils.js). Це враховано у тестах.');
code('// src/features/meds/index.js, рядки 19-30\nimport { state, saveData, showToast, today, emit } from \'../../core/state.js\';\n\nexport function isPillDueToday(p) { ... }');

h2('2.2 · Виявлений баг та мінімальний фікс');
p('Сценарій 7 ("Кілька днів — збіг", days="mon,wed", сьогодні середа) з таблиці завдання очікує true. Стара функція повертала false: вона шукала ключ "mon,wed" у мапі weekdays/mon..sun, де такого ключа немає. Це потенційно пропущений прийом ліків — критичний баг для медичного застосунку.');
p('Мінімальна зміна (без рефакторингу решти логіки):');
code([
  '+ if (!p || p.days == null) return false;',
  '+ if (typeof p.days === \'string\' && p.days.includes(\',\')) {',
  '+   return p.days.split(\',\').some((k) => m[k.trim()] === true);',
  '+ }',
].join('\n'));
p('Додано також захист від null/undefined p.days, щоб гарантувати "не крашити" зі сценаріїв 9-11. Логіка для daily / date / одиночних днів — без змін.');

h2('2.3 · Файл tests/pill-schedule.test.js');
p('Підхід: замість мокування today() (як пропонував документ) використано vi.useFakeTimers() + vi.setSystemTime(). Це коректніше, оскільки isPillDueToday викликає і today() з state.js, і new Date().getDay() — обидва треба синхронізувати. Час фіксується на 12:00 UTC, щоб локальний день не зсувався в інших часових поясах.');
p('Усі дати спеціально підібрані під день тижня:');
table([
  ['ISO дата',    'День тижня'],
  ['2026-04-25',  'Sat (subota — день верифікації)'],
  ['2026-04-27',  'Mon'],
  ['2026-04-28',  'Tue'],
  ['2026-04-29',  'Wed'],
  ['2026-04-30',  'Thu'],
  ['2026-05-02',  'Sat'],
  ['2026-05-03',  'Sun'],
], { colWidths: [180, 319] });

h2('2.4 · Покриті сценарії');
table([
  ['#', 'Сценарій',                            'Очікується', 'Статус'],
  ['1', 'days=daily на будь-який день (×3)',   'true',       '✓'],
  ['2', 'days=date, дата=сьогодні',            'true',       '✓'],
  ['3', 'days=date, дата=вчора',               'false',      '✓'],
  ['4', 'days=date, дата=завтра',              'false',      '✓'],
  ['5', 'days=mon, сьогодні Mon',              'true',       '✓'],
  ['6', 'days=mon, сьогодні Tue',              'false',      '✓'],
  ['7', 'days=mon,wed, сьогодні Wed',          'true',       '✓ (фікс)'],
  ['8', 'days=mon,wed, сьогодні Thu',          'false',      '✓'],
  ['9', 'days="" + date=null',                 'false',      '✓ не крашить'],
  ['10','days=xyz',                            'false',      '✓ не крашить'],
  ['11','об\'єкт без поля days',               'false',      '✓ не крашить'],
  ['+', 'legacy days=weekdays на Wed',         'true',       '✓ бонус'],
  ['+', 'legacy days=weekdays на Sat',         'false',      '✓ бонус'],
], { colWidths: [25, 230, 90, 154] });

h2('2.5 · Результат');
code([
  'npm test',
  '',
  ' Test Files  4 passed (4)',
  '      Tests  41 passed (41)   ← було 28, додано 13',
  '   Duration  1.38s',
].join('\n'));
p('Жоден з 28 існуючих тестів (bp-norm 8, bmi 11, health-score 9) не зламався. Усі 11 сценаріїв з документа задачі покриті + 2 бонусних для legacy ключа weekdays.');

// ─── Task B ────────────────────────────────────────────────
h1('3 · Задача Б — CI/CD GitHub Actions');

h2('3.1 · Файл .github/workflows/ci.yml');
p('Створено окремий workflow для тестів і збірки. Існуючий .github/workflows/static.yml для деплою на GitHub Pages не чіпали — два workflow живуть незалежно.');
code([
  'name: CI',
  '',
  'on:',
  '  push:        { branches: [ main ] }',
  '  pull_request: { branches: [ main ] }',
  '',
  'jobs:',
  '  test-and-build:',
  '    runs-on: ubuntu-latest',
  '    defaults:',
  '      run:',
  '        working-directory: HealthPro-Moie-Zdorovia',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - uses: actions/setup-node@v4',
  '        with:',
  '          node-version: \'20\'',
  '          cache: \'npm\'',
  '          cache-dependency-path: HealthPro-Moie-Zdorovia/package-lock.json',
  '      - run: npm ci',
  '      - run: npm test',
  '      - run: npm run build',
].join('\n'));

h2('3.2 · Передумови — все на місці');
table([
  ['Передумова',                                        'Статус'],
  ['package.json містить "test": "vitest run"',         '✓ є'],
  ['package-lock.json існує (потрібен для npm ci)',     '✓ є'],
  ['vitest у devDependencies',                          '✓ 4.1.5'],
  ['Build виконується локально без помилок',            '✓ 997 мс'],
  ['Усі тести зелені локально',                         '✓ 41/41'],
], { colWidths: [350, 149] });

h2('3.3 · Що має зробити користувач');
bullet('У панелі Replit Git: закомітити зміни з повідомленнями ("test: add 13 isPillDueToday tests + bug fix for comma-separated days" та "ci: add GitHub Actions test and build workflow") і виконати push до main.');
bullet('Відкрити https://github.com/chironkh-dev/HealthPro-Moie-Zdorovia → вкладка Actions — побачити запущений workflow CI з трьома кроками: Install / Test / Build.');
bullet('Після зеленого статусу — опційно додати badge у README.md:');
code('![CI](https://github.com/chironkh-dev/HealthPro-Moie-Zdorovia/actions/workflows/ci.yml/badge.svg)');

// ─── Files changed ─────────────────────────────────────────
h1('4 · Перелік файлів');
table([
  ['Файл',                                                       'Дія'],
  ['HealthPro-Moie-Zdorovia/src/features/meds/index.js',         'modified — фікс multi-day'],
  ['HealthPro-Moie-Zdorovia/tests/pill-schedule.test.js',        'created — 13 тестів'],
  ['.github/workflows/ci.yml',                                   'created — CI workflow'],
  ['scripts/generate_prephase2_report.cjs',                      'created — генератор цього PDF'],
], { colWidths: [340, 159] });

// ─── Next steps ────────────────────────────────────────────
h1('5 · Що далі — Фаза 2 та Етап 5');
p('Усі застереження документа дотримано: жоден з існуючих 28 тестів не змінено, логіку isPillDueToday виправлено мінімально (а не зрефакторено), CI містить лише test+build (без deploy — той живе у static.yml). Можна впевнено починати нативну збірку.');

h2('Фаза 2 — Capacitor Android');
bullet('npx cap add android (генерація android/ проєкту).');
bullet('Підключити плагіни LocalNotifications / Share / Preferences — обгортки вже у src/core/platform.js, в самих фічах змінювати нічого не потрібно.');
bullet('Згенерувати іконки/splash через @capacitor/assets.');

h2('Етап 5 — SQLite');
bullet('@capacitor-community/sqlite + новий core/db/sqlite.js.');
bullet('Одноразова міграція localStorage → SQLite з резервною копією.');
bullet('Замінити state.measurements / pills / pillsTaken на запити з in-memory кешем.');

// ─── Footer ───────────────────────────────────────────────
const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_GRAY);
  doc.text(`HealthPro · Звіт підготовки до Фази 2 · стор. ${i} з ${totalPages}`, MARGIN, PAGE_H - 24);
}

fs.writeFileSync(OUT_FILE, Buffer.from(doc.output('arraybuffer')));
console.log('PDF written:', OUT_FILE);
