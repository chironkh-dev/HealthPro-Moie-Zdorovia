const fs = require('fs');
const path = require('path');
const { jsPDF } = require(path.join(__dirname, '..', 'HealthPro-Moie-Zdorovia', 'node_modules', 'jspdf'));

const FONT_REG_PATH  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const OUT_DIR  = path.join(__dirname, '..', 'attached_assets');
const OUT_FILE = path.join(OUT_DIR, 'HealthPro_Phase1_Refactor_Final_Report.pdf');

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
const COLOR_AMBER   = [200, 140, 30];
const COLOR_BG_SOFT = [244, 246, 252];

function ensureSpace(needed) {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    y = MARGIN;
  }
}

function h1(text) {
  ensureSpace(40);
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLOR_DARK);
  doc.text(text, MARGIN, y);
  y += 16;
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(2);
  doc.line(MARGIN, y, MARGIN + 60, y);
  y += 20;
}

function h2(text) {
  ensureSpace(32);
  y += 4;
  doc.setFont('NotoSans', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text(text, MARGIN, y);
  y += 16;
}

function p(text, opts = {}) {
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(opts.size || 11);
  doc.setTextColor(...(opts.color || COLOR_DARK));
  const lines = doc.splitTextToSize(text, MAX_W);
  lines.forEach((line) => {
    ensureSpace(15);
    doc.text(line, MARGIN, y);
    y += 14;
  });
  y += 4;
}

function bullet(text) {
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_DARK);
  const lines = doc.splitTextToSize(text, MAX_W - 14);
  lines.forEach((line, i) => {
    ensureSpace(15);
    if (i === 0) {
      doc.setFillColor(...COLOR_PRIMARY);
      doc.circle(MARGIN + 4, y - 4, 2, 'F');
    }
    doc.text(line, MARGIN + 14, y);
    y += 14;
  });
}

function table(rows, opts = {}) {
  const colWidths = opts.colWidths || rows[0].map(() => MAX_W / rows[0].length);
  const rowHeight = opts.rowHeight || 22;
  rows.forEach((row, r) => {
    ensureSpace(rowHeight + 2);
    let x = MARGIN;
    const isHeader = r === 0;
    if (isHeader) {
      doc.setFillColor(...COLOR_PRIMARY);
      doc.rect(MARGIN, y - 14, MAX_W, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('NotoSans', 'bold');
    } else {
      if (r % 2 === 0) {
        doc.setFillColor(...COLOR_BG_SOFT);
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

function code(text) {
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_DARK);
  const lines = String(text).split('\n');
  lines.forEach((line) => {
    ensureSpace(13);
    doc.setFillColor(244, 246, 252);
    doc.rect(MARGIN, y - 10, MAX_W, 13, 'F');
    doc.text(line, MARGIN + 6, y);
    y += 13;
  });
  y += 6;
}

// ─── Header ───────────────────────────────────────────────
doc.setFillColor(...COLOR_PRIMARY);
doc.rect(0, 0, PAGE_W, 96, 'F');
doc.setTextColor(255, 255, 255);
doc.setFont('NotoSans', 'bold');
doc.setFontSize(22);
doc.text('HealthPro · Моє Здоров\'я', MARGIN, 46);
doc.setFont('NotoSans', 'normal');
doc.setFontSize(13);
doc.text('Фінальний звіт · Фаза 1 (рефакторинг) — завершено', MARGIN, 68);
doc.setFontSize(10);
doc.text(new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }), MARGIN, 84);
y = 130;

// ─── Summary ───────────────────────────────────────────────
h1('1 · Резюме');
p('Фазу 1 звіту з рефакторингу повністю виконано. Усі 10 пунктів дорожньої карти закриті: критичні виправлення (typo, FOUC, .gitignore, capacitor.config), створення доменних модулів у src/core (constants, utils, platform), повне винесення i18n у src/i18n/, розбиття монолітного app.css на 7 файлів за відповідальностями та підключення Vitest з 28 тестами для ключових формул здоров\'я.');
p('Додаток повноцінно працює у середовищі Replit на порту 5000, готовий до Фази 2 (Capacitor) та Етапу 5 (SQLite).');

badge('УСІ 10 КРОКІВ ВИКОНАНО', COLOR_OK);
badge('ТЕСТИ: 28 ПРОЙДЕНО', COLOR_OK);

// ─── Checklist ─────────────────────────────────────────────
h1('2 · Чек-лист Фази 1');
table([
  ['#',  'Крок',                                          'Статус'],
  ['1',  'node_modules → .gitignore',                     '✓ виконано'],
  ['2',  'capacitor.config webDir: dist',                 '✓ вже було'],
  ['3',  'Перейменування папки HealtPro → HealthPro',     '✓ виконано'],
  ['4',  'FOUC inline <style> у index.html',              '✓ виконано'],
  ['5',  'src/core/constants.js (LS, версії, пороги)',    '✓ виконано'],
  ['6',  'src/core/utils.js (formatTime, avg тощо)',      '✓ виконано'],
  ['7',  'src/core/platform.js (web vs Capacitor)',       '✓ виконано'],
  ['8',  'setLang() / t() винесено у src/i18n/index.js',  '✓ виконано'],
  ['9',  'styles/app.css → 7 файлів',                     '✓ виконано'],
  ['10', 'Vitest: getBPNorm / calcBMI / calcHealthScore', '✓ 28 пройдено'],
], { colWidths: [30, 360, 109] });

// ─── Step details ──────────────────────────────────────────
h1('3 · Деталі змін');

h2('3.1 · Критичні виправлення (кроки 1-4)');
bullet('Перейменовано папку проєкту: HealtPro-Moie-Zdorovia → HealthPro-Moie-Zdorovia. Оновлено 6 файлів-посилань: .replit (через configureWorkflow), replit.md, scripts/generate_report.cjs, .agents/agent_assets_metadata.toml, .github/workflows/static.yml.');
bullet('Кореневий .gitignore доповнено правилами для node_modules, dist, .env. capacitor.config.json вже містив webDir: "dist" — не потребувало змін.');
bullet('У index.html (рядок 11) додано inline <style> з фоном #080d1a і кольором тексту #e2e8f0 + margin:0. Стиль розташовано перед усіма <link>, тому браузер парсить його миттєво — повністю усунено FOUC (Flash of Unstyled Content).');

h2('3.2 · src/core/constants.js (новий файл)');
p('Централізує всі магічні константи проєкту. Раніше DISCLAIMER_VERSION жорстко повторювався у 3 файлах, ключі localStorage — в 5 файлах.');
code([
  'export const APP_VERSION = \'4.0\';',
  'export const DISCLAIMER_VERSION = \'1.0\';',
  'export const DISCLAIMER_HISTORY_KEY = \'disclaimerHistory\';',
  'export const LEGACY_DISCLAIMER_KEY_PREFIX = \'disclaimerAccepted\';',
  'export const DEFAULT_STEP_GOAL = 10000;',
  'export const STEP_GOAL_MIN = 1000, STEP_GOAL_MAX = 50000;',
  'export const STEP_ACCEL_THRESHOLD = 11.5;',
  'export const EMERGENCY_PHONE_UA = \'103\';',
  'export const SUPPORTED_LANGS = [\'uk\', \'ru\'];',
  'export const THEMES = { LIGHT: \'light\', DARK: \'dark\' };',
  '// + re-exports STORAGE_KEYS from state.js',
].join('\n'));
bullet('Оновлено 5 файлів: features/settings/disclaimer.js, features/steps/index.js, features/analytics/health-score.js, features/settings/profile.js, features/pressure/critical.js.');
bullet('disclaimer.js залишено зворотний реекспорт DISCLAIMER_VERSION для сумісності з модулями, що його імпортували раніше.');

h2('3.3 · src/core/utils.js (наповнено з 23 рядків)');
p('Розширено набір чистих helpers, щоб уникнути дублювання маленьких функцій по фічах:');
code([
  'nowISO()           — поточний час в ISO',
  'today()            — \'YYYY-MM-DD\' (re-export)',
  'formatTime(iso)    — \'HH:MM\'',
  'formatDate(iso)    — \'DD.MM.YYYY\'',
  'formatDateLong()   — \'15 листопада 2025\'',
  'formatDateTime()   — поєднання дати і часу',
  'daysBetween(a, b)  — у днях',
  'hoursAgo(iso)      — рядок \'годин тому\'',
  'safeNum, safeInt   — безпечне парсення',
  'clamp, round1, pct — арифметика',
  'avg, sum, lastN    — масиви',
  'groupByDate, padNum',
].join('\n'));

h2('3.4 · src/core/platform.js (новий файл)');
p('Тонкий шар абстракції між Web (PWA) і Capacitor (нативний застосунок). Користувач створив попередню версію з 10 рядків у нетипічному місці src/js/utils/platform.js — її переміщено у канонічну локацію src/core/ і розширено до повноцінного API:');
bullet('isNative(), isWeb(), getPlatform() — детектування середовища.');
bullet('requestNotificationPermission() / notify() — Capacitor LocalNotifications з fallback на Web Notification API.');
bullet('vibrate(pattern) — обгортка над navigator.vibrate.');
bullet('share(data) — Capacitor Share з fallback на navigator.share.');
bullet('download(filename, blob, mime) — браузерне зберігання файлу через Blob URL (для експорту PDF/CSV).');
bullet('prefs.get/set/remove — Capacitor Preferences (NSUserDefaults / SharedPreferences) з fallback на localStorage.');
bullet('onResume(handler) — реакція на повернення в foreground (Capacitor App або visibilitychange).');
bullet('isOnline() / onConnectivityChange() — стан мережі.');
p('Стара папка src/js/ видалена. Усі feature-модулі тепер можуть викликати один платформо-незалежний API.');

h2('3.5 · setLang() та t() винесено у src/i18n/index.js');
p('Логіка перемикання мов раніше жила у src/features/settings/i18n.js — це порушувало шарування (i18n у settings, а не у власному домені). Перенесено повний набір: setLang, t, registerReRender, renderWelcomeText, renderDisclaimerBody, мапінг T = { uk, ru }, PLACEHOLDER_MAP.');
p('У src/features/settings/i18n.js залишено лише реекспорт усіх символів — тому модулі, що раніше імпортували з settings, продовжують працювати без змін (back-compat).');

h2('3.6 · Розбиття styles/app.css на 7 файлів');
p('Файл app.css на 510 рядків розпиляно за відповідальностями. app.css зведено до простого barrel з @import — Vite склеює їх у продакшні в один CSS-файл.');
table([
  ['Файл',           'Рядків', 'Відповідальність'],
  ['base.css',       '42',     ':root, теми, reset, body, .page, утиліти'],
  ['layout.css',     '90',     'header, nav, banners, lang-btn, time-pickers, settings-row'],
  ['components.css', '84',     'card, inputs, btn, status-badge, bento'],
  ['charts.css',     '59',     'chart-canvas, score-ring, BMI-bar/circle'],
  ['features.css',   '84',     'recommendations, pills, history, pharmacy'],
  ['modal.css',      '79',     'modal, toast, export-modal, tooltip, print'],
  ['welcome.css',    '72',     'welcome overlay, disclaimer modal, history'],
], { colWidths: [110, 50, 339] });
p('Сума: 510 рядків (без коментарів-заголовків). app.css.bak збережено для аудиту.');

h2('3.7 · Vitest: 28 тестів для трьох ключових формул');
p('Встановлено vitest@4.1.5 як devDependency. Створено tests/setup.js з мок-stub для localStorage / window / document (state.js викликає localStorage під час імпорту). Додано скрипти test і test:watch.');
table([
  ['Файл',                   'Тестів', 'Покриває'],
  ['tests/bp-norm.test.js',  '8',      'getBPNorm: вікові норми, особиста норма, мова'],
  ['tests/bmi.test.js',      '11',     'calcBMI + getBMICategory: 7 категорій'],
  ['tests/health-score.test.js', '9',  'calcHealthScore: BP/pulse/pills/BMI, veto'],
], { colWidths: [180, 60, 259] });
p('Усі 28 тестів проходять. Тривалість прогону ≈ 1 секунда.');

h2('3.8 · Інше');
bullet('BP-, BMI- і pulse-пороги (60/80, 130/85, 18.5, 25, ...) свідомо НЕ винесено у constants — вони щільно пов\'язані з рендером міток і копірайтом ("Норма" / "Гіпертензія І" тощо). Окремий рефакторинг доцільніше робити одночасно з винесенням рендерної копії у словники i18n.');

// ─── Architecture diagram ──────────────────────────────────
h1('4 · Поточна структура src/');
code([
  'src/',
  '├── core/',
  '│   ├── state.js        — спільний стан + LS persistence',
  '│   ├── constants.js    — всі магічні константи (NEW)',
  '│   ├── utils.js        — чисті helpers (РОЗШИРЕНО)',
  '│   └── platform.js     — web vs Capacitor abstraction (NEW)',
  '├── i18n/',
  '│   ├── index.js        — setLang, t, T, словники (РОЗШИРЕНО)',
  '│   ├── ui.uk.js, ui.ru.js',
  '│   ├── welcome-disclaimer.js',
  '│   └── pdf.js',
  '├── features/',
  '│   ├── pressure/  ├── meds/    ├── steps/',
  '│   ├── charts/    ├── analytics/ ├── history/',
  '│   ├── export/    ├── settings/  └── pwa/',
  '├── app.js          — 254 рядки entry-point (тонкий)',
  '└── main.js         — bootstrap',
  '',
  'styles/',
  '├── app.css         — barrel (12 рядків з @import)',
  '├── base.css        ├── layout.css     ├── components.css',
  '├── charts.css      ├── features.css   ├── modal.css',
  '└── welcome.css',
  '',
  'tests/',
  '├── setup.js        — localStorage stub',
  '├── bp-norm.test.js (8)',
  '├── bmi.test.js (11)',
  '└── health-score.test.js (9)',
].join('\n'));

// ─── Verification ──────────────────────────────────────────
h1('5 · Верифікація проти звіту');
p('Кожен пункт PDF-звіту перевірено:');
table([
  ['Вимога звіту',                            'Результат'],
  ['Виправити typo HealtPro → HealthPro',     '✓ папка + 6 файлів'],
  ['node_modules з git',                      '✓ .gitignore оновлено'],
  ['capacitor.config webDir: dist',           '✓ вже було'],
  ['FOUC fix у index.html',                   '✓ inline <style>'],
  ['core/constants.js',                       '✓ створено + 5 файлів'],
  ['core/utils.js (formatTime, avg)',         '✓ розширено'],
  ['core/platform.js',                        '✓ повний API'],
  ['setLang/t у i18n/',                       '✓ перенесено'],
  ['7 css-файлів',                            '✓ розпил'],
  ['Vitest для 3 формул',                     '✓ 28/28'],
], { colWidths: [310, 189] });
badge('ВІДПОВІДНІСТЬ ЗВІТУ: 100%', COLOR_OK);

// ─── Next steps ────────────────────────────────────────────
h1('6 · Що далі');
h2('Фаза 2 — Capacitor (нативна збірка)');
bullet('Згенерувати ios/ та android/ через npx cap add ios / android.');
bullet('Підключити плагіни: @capacitor/local-notifications, @capacitor/share, @capacitor/preferences (платформа вже їх обгортає).');
bullet('Замінити прямі виклики Notification / navigator.share у фічах на функції з core/platform.js (вже готові).');
bullet('Налаштувати іконки/splash через @capacitor/assets.');

h2('Етап 5 — SQLite (надійне сховище)');
bullet('@capacitor-community/sqlite: створити core/db/sqlite.js (open, migrate, run, get).');
bullet('Міграція localStorage → SQLite з резервною копією.');
bullet('Оновити state.measurements / pills / pillsTaken на запити з in-memory кешем.');

h2('Опційно');
bullet('Винести BP/BMI/pulse-пороги у constants одночасно з міграцією копірайту в словники i18n.');
bullet('Розширити покриття тестами: getBPStatus, getBMICategory edge cases, isPillDueToday для weekdays.');
bullet('Додати CI (GitHub Actions): npm run build + npm test на push.');

// ─── Footer ───────────────────────────────────────────────
const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_GRAY);
  doc.text(`HealthPro · Фінальний звіт Фази 1 · стор. ${i} з ${totalPages}`, MARGIN, PAGE_H - 24);
}

fs.writeFileSync(OUT_FILE, Buffer.from(doc.output('arraybuffer')));
console.log('PDF written:', OUT_FILE);
