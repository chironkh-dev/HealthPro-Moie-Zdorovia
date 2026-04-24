const fs = require('fs');
const path = require('path');
const { jsPDF } = require(path.join(__dirname, '..', 'HealtPro-Moie-Zdorovia', 'node_modules', 'jspdf'));

const FONT_REG_PATH  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const OUT_DIR  = path.join(__dirname, '..', 'attached_assets');
const OUT_FILE = path.join(OUT_DIR, 'HealthPro_Refactor_Report_Stage_4.pdf');

if (!fs.existsSync(FONT_REG_PATH) || !fs.existsSync(FONT_BOLD_PATH)) {
  console.error('Cyrillic fonts not found. Aborting.');
  process.exit(1);
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

function ensureSpace(needed) {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    y = MARGIN;
  }
}

function h1(text) {
  ensureSpace(40);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...COLOR_DARK);
  doc.text(text, MARGIN, y);
  y += 18;
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(2);
  doc.line(MARGIN, y, MARGIN + 60, y);
  y += 22;
}

function h2(text) {
  ensureSpace(36);
  y += 6;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text(text, MARGIN, y);
  y += 18;
}

function p(text, opts = {}) {
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(opts.size || 11);
  doc.setTextColor(...(opts.color || COLOR_DARK));
  const lines = doc.splitTextToSize(text, MAX_W);
  lines.forEach((line) => {
    ensureSpace(16);
    doc.text(line, MARGIN, y);
    y += 15;
  });
  y += 4;
}

function bullet(text) {
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_DARK);
  const lines = doc.splitTextToSize(text, MAX_W - 14);
  lines.forEach((line, i) => {
    ensureSpace(16);
    if (i === 0) {
      doc.setFillColor(...COLOR_PRIMARY);
      doc.circle(MARGIN + 4, y - 4, 2, 'F');
    }
    doc.text(line, MARGIN + 14, y);
    y += 15;
  });
}

function table(rows, opts = {}) {
  const colWidths = opts.colWidths || rows[0].map(() => MAX_W / rows[0].length);
  const rowHeight = 22;
  ensureSpace(rowHeight * rows.length + 10);

  rows.forEach((row, r) => {
    let x = MARGIN;
    const isHeader = r === 0;
    if (isHeader) {
      doc.setFillColor(...COLOR_PRIMARY);
      doc.rect(MARGIN, y - 14, MAX_W, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('NotoSans', 'bold');
    } else {
      if (r % 2 === 0) {
        doc.setFillColor(245, 247, 252);
        doc.rect(MARGIN, y - 14, MAX_W, rowHeight, 'F');
      }
      doc.setTextColor(...COLOR_DARK);
      doc.setFont('NotoSans', 'normal');
    }
    doc.setFontSize(10);
    row.forEach((cell, c) => {
      doc.text(String(cell), x + 6, y);
      x += colWidths[c];
    });
    y += rowHeight;
  });
  y += 6;
}

function badge(text, color) {
  const w = doc.getTextWidth(text) + 16;
  ensureSpace(20);
  doc.setFillColor(...color);
  doc.roundedRect(MARGIN, y - 12, w, 18, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(10);
  doc.text(text, MARGIN + 8, y + 1);
  y += 26;
}

// ─── Header ───────────────────────────────────────────────
doc.setFillColor(...COLOR_PRIMARY);
doc.rect(0, 0, PAGE_W, 90, 'F');
doc.setTextColor(255, 255, 255);
doc.setFont('NotoSans', 'bold');
doc.setFontSize(26);
doc.text('HealthPro · Звіт про рефакторинг', MARGIN, 50);
doc.setFont('NotoSans', 'normal');
doc.setFontSize(12);
doc.text('Етап 4: винесення модулів pressure та charts', MARGIN, 72);
y = 120;

// ─── Meta ────────────────────────────────────────────────
doc.setFont('NotoSans', 'normal');
doc.setFontSize(10);
doc.setTextColor(...COLOR_GRAY);
const today = new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' });
doc.text(`Дата: ${today}`, MARGIN, y);
doc.text('Проєкт: HealtPro-Moie-Zdorovia (PWA, Vite + Capacitor)', MARGIN, y + 14);
y += 40;

badge('Етапи 4-А та 4-Б завершено', COLOR_OK);

// ─── Summary ──────────────────────────────────────────────
h1('Короткий підсумок');
p('У межах Етапу 4 монолітний файл src/app.js поділено на ізольовані feature-модулі. Логіка вимірювання тиску та графіка винесена у власні директорії з чітким API. Збірка успішна (385 модулів), помилок у консолі немає.');

table([
  ['Метрика',                  'До',     'Після',  'Зміна'],
  ['Рядків у src/app.js',      '1879',   '1652',   '−227'],
  ['Feature-модулів',          '1',      '3',      '+2'],
  ['Кількість файлів у src/',  '~6',     '14',     '+8'],
  ['Білд (modules transformed)', '380', '385',     '+5'],
], { colWidths: [220, 90, 90, 99] });

// ─── Stage 4-A ────────────────────────────────────────────
h1('Етап 4-А · features/pressure');
p('Винесена вся логіка, що стосується тиску: норми, категорії ВООЗ, критичні стани, збереження вимірювання та оновлення UI.');

h2('Створені файли');
bullet('features/pressure/norm.js — getBPNorm, getBPStatus, getBPDotClass, getPulseStatus (51 рядок).');
bullet('features/pressure/who.js — словник WHO_INFO, getWHOCategory, openWHOInfo (95 рядків).');
bullet('features/pressure/critical.js — checkCritical, sendCriticalSMS, testEmergency (48 рядків).');
bullet('features/pressure/index.js — saveMeasurement, previewBP, updateLastReading, updateHeaderStatus, attachPressureListeners (115 рядків).');

h2('Інтеграція');
bullet('core/utils.js доповнено форматерами formatTime / formatDate, що читають state.lang.');
bullet('Перерисовка графіка йде через шину подій: emit("measurement:saved") → app.js слухає та викликає renderChart().');

// ─── Stage 4-B ────────────────────────────────────────────
h1('Етап 4-Б · features/charts');
p('Винесений модуль графіка тиску й пульсу разом із тултіпами та перемикачем періоду. Чисті розрахунки відокремлені від DOM-логіки.');

h2('Створені файли');
bullet('features/charts/helpers.js — pure-функції: computeScale, makeProjectors, drawGrid, drawSeries, drawXLabels, палітра CHART_COLORS (97 рядків).');
bullet('features/charts/bp-chart.js — стан графіка (period, showPulse, кеші точок), renderChart, setChartPeriod, togglePulseChart, setupChartTooltip (147 рядків).');
bullet('features/charts/index.js — публічний експорт (8 рядків).');

h2('Що отримали');
bullet('Перемикач періоду 7 / 30 / 90 / усі дні — викликає setChartPeriod, повторно рендерить графік.');
bullet('Перемикач пульсу — togglePulseChart прибирає лінію пульсу та рядок у тултіпі.');
bullet('Інтерактивні тултіпи — підтримують і мишу, і дотик; знаходять найближчу точку та показують дату/час, систолічний, діастолічний і пульс.');
bullet('Адаптивний DPR — графік чітко малюється на ретина-дисплеях.');

// ─── Architecture ─────────────────────────────────────────
h1('Архітектура');
p('Усі feature-модулі залежать тільки від ядра (core/state.js, core/utils.js) та один від одного через явні імпорти. Жодного звертання до глобальних змінних app.js не залишилося.');

h2('Дерево src/');
doc.setFont('NotoSans', 'normal');
doc.setFontSize(10);
doc.setTextColor(...COLOR_DARK);
const tree = [
  'src/',
  '├─ app.js                 (1652 рядки — UI-оркестратор)',
  '├─ core/',
  '│  ├─ state.js            (state, saveData, showToast, on/emit)',
  '│  └─ utils.js            (formatTime, formatDate, todayISO, avg)',
  '└─ features/',
  '   ├─ pressure/',
  '   │  ├─ norm.js',
  '   │  ├─ who.js',
  '   │  ├─ critical.js',
  '   │  └─ index.js',
  '   ├─ charts/',
  '   │  ├─ helpers.js',
  '   │  ├─ bp-chart.js',
  '   │  └─ index.js',
  '   └─ meds/',
  '      └─ index.js',
];
tree.forEach((line) => {
  ensureSpace(14);
  doc.text(line, MARGIN, y);
  y += 13;
});
y += 8;

// ─── Verification ─────────────────────────────────────────
h1('Перевірка якості');
bullet('npm run build → ✓ built in 3.49s, 385 modules transformed.');
bullet('Workflow Start application запущено успішно (Vite 5.4.21, порт 5000).');
bullet('Браузерна консоль чиста (тільки інформаційні повідомлення Vite та сховища).');
bullet('Візуальна перевірка стартової сторінки — UI рендериться без регресій.');

// ─── Next steps ───────────────────────────────────────────
h1('Що далі');
bullet('Етап 4-В: винести analytics та health-score у features/analytics/.');
bullet('Етап 4-Г: винести history (renderHistory, фільтри, експорт CSV/PDF) у features/history/.');
bullet('Етап 4-Д: винести settings, theming та i18n у власні модулі.');
bullet('Після завершення Етапу 4 — підключити Capacitor-плагіни (Notifications, Health) для нативного білду Android/iOS.');

// ─── Footer ───────────────────────────────────────────────
const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_GRAY);
  doc.text(`HealthPro · Звіт Етапу 4 · стор. ${i} з ${totalPages}`, MARGIN, PAGE_H - 24);
}

doc.save(OUT_FILE);
fs.writeFileSync(OUT_FILE, Buffer.from(doc.output('arraybuffer')));
console.log('PDF written:', OUT_FILE);
