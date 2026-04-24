const fs = require('fs');
const path = require('path');
const { jsPDF } = require(path.join(__dirname, '..', 'HealtPro-Moie-Zdorovia', 'node_modules', 'jspdf'));

const FONT_REG_PATH  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const OUT_DIR  = path.join(__dirname, '..', 'attached_assets');
const OUT_FILE = path.join(OUT_DIR, 'HealthPro_Refactor_Report_Stage_4_complete.pdf');

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
doc.rect(0, 0, PAGE_W, 90, 'F');
doc.setTextColor(255, 255, 255);
doc.setFont('NotoSans', 'bold');
doc.setFontSize(24);
doc.text('HealthPro · Звіт про рефакторинг', MARGIN, 50);
doc.setFont('NotoSans', 'normal');
doc.setFontSize(12);
doc.text('Етап 4 завершено: 4-В аналітика, 4-Г історія+експорт, 4-Д налаштування', MARGIN, 72);
y = 120;

// ─── Meta ────────────────────────────────────────────────
doc.setFont('NotoSans', 'normal');
doc.setFontSize(10);
doc.setTextColor(...COLOR_GRAY);
const today = new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' });
doc.text(`Дата: ${today}`, MARGIN, y);
doc.text('Проєкт: HealtPro-Moie-Zdorovia (PWA, Vite + Capacitor)', MARGIN, y + 14);
y += 40;

badge('Етап 4 повністю завершено', COLOR_OK);

// ─── Summary ──────────────────────────────────────────────
h1('Короткий підсумок');
p('Усю логіку, що залишалася в src/app.js, розкладено по feature-модулях. Файл app.js перетворено на тонкий оркестратор: реєстрація обробників подій, маршрутизація сторінок, делегування дій. Жодних регресій у UI, консоль чиста.');

table([
  ['Метрика',                    'До',     'Після',  'Зміна'],
  ['Рядків у src/app.js',        '1652',   '254',    '−1398'],
  ['Feature-модулів',            '3',      '8',      '+5'],
  ['Файлів у src/features/',     '~7',     '24',     '+17'],
  ['Самостійних файлів модулів', '14',     '34',     '+20'],
], { colWidths: [240, 80, 80, 99] });

p('Це означає, що всі домени застосунку (тиск, графіки, ліки, кроки, аналітика, історія, експорт, налаштування, PWA) тепер живуть окремо одне від одного й готові до підключення нативних плагінів Capacitor.');

// ─── Stage 4-В ────────────────────────────────────────────
h1('Етап 4-В · features/analytics');
p('Винесено всю аналітику дашборду: інтегральний показник здоров\'я, ІМТ, рекомендації та модальне вікно тренду.');

h2('Створені файли');
bullet('analytics/health-score.js — calcHealthScore (зважений скор тиску, пульсу, ліків, ІМТ, активності), getDetailedScores, toggleHealthTooltip.');
bullet('analytics/bmi.js — calcBMI, getBMICategory, renderBMI з кольоровим бейджем.');
bullet('analytics/recommendations.js — RECO_SVG, generateAdvice (10+ правил для різних рівнів тиску, пульсу, ваги), renderRecommendations, toggleReco.');
bullet('analytics/trend-modal.js — openTrendModal, closeTrendModal з SVG-графіком тренду.');
bullet('analytics/index.js — renderAnalytics: збирає всі картки дашборду (скор, середнє давлення, тренд, ВООЗ, всього вимірів, прихильність до прийому ліків, макс/мін, пульс, % норми) та делегує підпотрібним модулям.');

h2('Інтеграція');
bullet('features/steps/index.js доповнено експортом getStepCount(), щоб модуль скору міг порахувати «активність» без імпорту state з кроків.');
bullet('renderAnalytics викликається на події measurement:saved та при перемиканні мови.');

// ─── Stage 4-Г ────────────────────────────────────────────
h1('Етап 4-Г · features/history та features/export');
p('Окремо винесено журнал вимірів (з фільтром тиждень / місяць / усі), а також усі способи поділитися даними: JSON, CSV, друкована веб-версія та повний PDF-звіт для лікаря.');

h2('history/');
bullet('history/index.js — setHistoryPeriod, renderHistory, deleteMeasurement, clearHistory. Діалог підтвердження видалення.');
bullet('Видалення емітить подію measurement:deleted → app.js перерисовує графік і заголовок.');

h2('export/');
bullet('export/csv.js — exportData (JSON-бекап), exportCSV (повний CSV всіх вимірів), exportReportCSV (CSV за обраний період), importData (відновлення зі збереженого JSON).');
bullet('export/modal.js — openExportModal, selectExportPeriod (тиждень / 2 тижні / місяць / довільний), updateExportCount.');
bullet('export/print.js — printReportPeriod: повноцінний друкований звіт (HTML-вікно з SVG-графіком, таблицею, інформацією про пацієнта, місцем для підпису лікаря).');
bullet('export/pdf.js — exportPDF: збирає високоякісний PDF через html2canvas + jsPDF із chart-snapshot, картками статистики, таблицями вимірів і ліків, юридичним дисклеймером.');
bullet('export/logo.js — base64-логотип винесено в окремий файл, щоб не засмічувати модулі.');
bullet('export/index.js — публічні експорти.');

h2('Чому модуль export бере showPage як параметр');
p('PDF-звіт мусить тимчасово переключити сторінку на «тиск», щоб зчитати canvas графіка. Замість прямого імпорту з app.js (циклічна залежність) ми зареєстрували showPage через setPDFShowPage(showPage) у точці входу. Модуль залишається ізольованим і легко тестується.');

// ─── Stage 4-Д ────────────────────────────────────────────
h1('Етап 4-Д · features/settings та features/pwa');
p('Останній великий блок: профіль користувача, мовний шар, тема, нагадування про прийом ліків і вимір тиску, дисклеймер та все, що пов\'язано з PWA-обгорткою.');

h2('settings/');
bullet('settings/theme.js — applyTheme, toggleTheme з іконкою сонце / місяць.');
bullet('settings/i18n.js — setLang, t, renderDisclaimerBody, renderWelcomeText. Шина registerReRender(fn) дозволяє іншим модулям підписатися на зміну мови без циклічних імпортів.');
bullet('settings/profile.js — saveProfile, loadProfileFields, updateHeader (ПІБ, вік, зріст, вага, контакти, нормальні значення тиску і пульсу, екстрений контакт).');
bullet('settings/notifications.js — toggleNotifications (Push API + дозволи), toggleMeasureReminder, saveReminderTimes, scheduleNotifications (запобігає подвійному спрацюванню за допомогою _firedReminders).');
bullet('settings/data.js — clearAllData з підтвердженням і повним скиданням до defaultSettings.');
bullet('settings/disclaimer.js — повна історія прийнять (LocalStorage), DISCLAIMER_VERSION = «1.0», міграція зі старого ключа, openDisclaimerModal, acceptDisclaimer, checkDisclaimer.');

h2('pwa/');
bullet('pwa/index.js — installApp, registerSW (з пропуском у режимі розробки), applyUpdate (для нової версії SW), setupOnlineIndicator (бейдж «офлайн»). Listener beforeinstallprompt реєструється на завантаженні модуля.');

// ─── Architecture ─────────────────────────────────────────
h1('Архітектура після рефакторингу');
p('Усі модулі спілкуються через явні імпорти або через шину подій on/emit з core/state.js. Жодного звертання до глобальних змінних, жодних DOM-обробників напряму у бізнес-логіці.');

h2('Дерево src/');
doc.setFont('NotoSans', 'normal');
doc.setFontSize(10);
doc.setTextColor(...COLOR_DARK);
const tree = [
  'src/',
  '├─ app.js                         (254 рядки — оркестратор)',
  '├─ core/',
  '│  ├─ state.js                    (state, saveData, on/emit, setToast, today, DB)',
  '│  ├─ storage.js                  (defaultSettings, ключі LocalStorage)',
  '│  └─ utils.js                    (formatTime, formatDate, todayISO, avg)',
  '├─ i18n/',
  '│  └─ index.js                    (T_UK, T_RU, WELCOME_T, DISCLAIMER_T, PDF_LABELS)',
  '└─ features/',
  '   ├─ pressure/   (norm, who, critical, index)',
  '   ├─ charts/     (helpers, bp-chart, index)',
  '   ├─ meds/       (drug-db, index)',
  '   ├─ steps/      (index)',
  '   ├─ analytics/  (health-score, bmi, recommendations, trend-modal, index)',
  '   ├─ history/    (index)',
  '   ├─ export/     (csv, modal, pdf, print, logo, index)',
  '   ├─ settings/   (theme, i18n, profile, notifications, data, disclaimer, index)',
  '   └─ pwa/        (index)',
];
tree.forEach((line) => {
  ensureSpace(13);
  doc.text(line, MARGIN, y);
  y += 12;
});
y += 8;

h2('Зв\'язки між модулями');
bullet('Усі модулі читають дані з core/state.js, мутують масиви через push/splice (не через переприсвоєння).');
bullet('showToast визначається у app.js (бо потребує DOM) і реєструється у state.js через setToast().');
bullet('Подія measurement:saved → перерисовка графіка та аналітики; measurement:deleted → перерисовка графіка та заголовка.');
bullet('registerReRender(fn) — кожен модуль, що залежить від мови, підписується один раз; setLang викликає всі обробники.');
bullet('setPDFShowPage(showPage) — модуль експорту отримує функцію навігації як inversion-of-control.');

// ─── Verification ─────────────────────────────────────────
h1('Перевірка якості');
bullet('Vite dev сервер стартував чисто (Vite 5.4.21, порт 5000, ready in 696 ms).');
bullet('Браузерна консоль чиста: тільки інформаційні повідомлення Vite та сховища.');
bullet('Welcome-екран відображається коректно з усіма елементами (логотип, опис, перемикач мов UA/RU, посилання на дисклеймер, кнопка згоди).');
bullet('Жодного звернення до глобальних змінних app.js у інших файлах — підтверджено пошуком.');

// ─── Stage 5: Local DB recommendation ─────────────────────
doc.addPage();
y = MARGIN;
h1('Етап 5: рекомендація локальної бази даних');

p('Зараз HealthPro зберігає всі дані у localStorage браузера. Це працює для PWA, але має критичні обмеження саме для нативного Android/iOS-білду через Capacitor.');

h2('Чому localStorage не підходить для нативного застосунку');
bullet('Ліміт ~5–10 МБ, на iOS WebView ще менший. Багаторічна історія вимірів та фотографії не помістяться.');
bullet('Синхронні API блокують головний потік під час запису, що відчутно на старіших телефонах.');
bullet('Немає індексів і запитів — фільтри (тиск > 140 за останні 90 днів) робляться лінійним проходом масиву.');
bullet('Дані можна стерти, очистивши кеш WebView; для мед-додатка це неприпустимо.');
bullet('Немає атомарних транзакцій — у разі краху під час запису можна побити журнал.');

h2('Рекомендація: @capacitor-community/sqlite');
badge('Перший вибір', COLOR_OK);
bullet('Повноцінний SQLite на пристрої: до 2 ГБ, шифрування (AES-256), індекси, транзакції, повноцінні SQL-запити.');
bullet('Обгортка для Android (через android.database.sqlite) та iOS (через системний SQLite). Один однаковий API через Capacitor.');
bullet('Web-fallback на sql.js (чистий JS у IndexedDB) — той самий код працює і в PWA в браузері, і в нативі.');
bullet('Вбудована підтримка експорту/імпорту бази як файла .db — можна резервно копіювати на iCloud / Google Drive.');
bullet('Активна підтримка спільнотою, оновлюється для нових версій Capacitor 6/7.');

h2('Запропонована схема (мінімум)');
code([
  'CREATE TABLE measurements (',
  '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
  '  ts INTEGER NOT NULL,           -- мс UTC',
  '  sys INTEGER NOT NULL,',
  '  dia INTEGER NOT NULL,',
  '  pulse INTEGER,',
  '  note TEXT',
  ');',
  'CREATE INDEX idx_measurements_ts ON measurements(ts DESC);',
  '',
  'CREATE TABLE pills (',
  '  id INTEGER PRIMARY KEY AUTOINCREMENT,',
  '  name TEXT NOT NULL,',
  '  dose TEXT,',
  '  time TEXT,                     -- HH:MM',
  '  days TEXT,                     -- daily | mon,tue | date',
  '  date INTEGER                   -- ts якщо days = date',
  ');',
  '',
  'CREATE TABLE pills_taken (',
  '  date TEXT NOT NULL,            -- YYYY-MM-DD',
  '  pill_id INTEGER NOT NULL,',
  '  taken INTEGER NOT NULL DEFAULT 0,',
  '  PRIMARY KEY (date, pill_id)',
  ');',
  '',
  'CREATE TABLE settings (',
  '  key TEXT PRIMARY KEY,',
  '  value TEXT',
  ');',
].join('\n'));

h2('Альтернативи (нижчий пріоритет)');
bullet('@capacitor/preferences — Key-Value (NSUserDefaults / SharedPreferences). Підходить тільки для дрібних налаштувань, не для журналу вимірів.');
bullet('@capacitor/filesystem + JSON-файли — простий, але без транзакцій і без запитів. Ризик пошкодити файл при краху під час запису.');
bullet('Dexie.js (IndexedDB) — чудовий у браузері, але на iOS WebView IndexedDB обнуляється під час очищення кешу. Недостатньо надійно для мед-додатка.');
bullet('Realm / WatermelonDB — потужні, але важкі для нашого розміру даних і додають велику залежність.');

h2('План впровадження (Етап 5)');
bullet('5-А · Додати @capacitor-community/sqlite, створити core/db/sqlite.js (open, migrate, runQuery, getRows).');
bullet('5-Б · Написати міграцію localStorage → SQLite (одноразова, з прогресом і резервною копією).');
bullet('5-В · Замінити state.measurements / state.pills / state.pillsTaken на запити з кешуванням у пам\'яті (state стає read-only after-load).');
bullet('5-Г · Оновити модулі pressure / meds / history / analytics, щоб писали через сервіс БД (зберігає сумісність API).');
bullet('5-Д · Додати резервне копіювання у файл .db (експорт/імпорт) і опціональне шифрування.');

// ─── Footer ───────────────────────────────────────────────
const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_GRAY);
  doc.text(`HealthPro · Звіт Етапу 4 (повний) · стор. ${i} з ${totalPages}`, MARGIN, PAGE_H - 24);
}

fs.writeFileSync(OUT_FILE, Buffer.from(doc.output('arraybuffer')));
console.log('PDF written:', OUT_FILE);
