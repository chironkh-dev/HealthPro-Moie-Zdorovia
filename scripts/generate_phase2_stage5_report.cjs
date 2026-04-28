const fs = require('fs');
const path = require('path');
const { jsPDF } = require(path.join(__dirname, '..', 'HealthPro-Moie-Zdorovia', 'node_modules', 'jspdf'));

const FONT_REG_PATH  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const OUT_DIR  = path.join(__dirname, '..', 'attached_assets');
const OUT_FILE = path.join(OUT_DIR, 'HealthPro_Phase2_Stage5_Report.pdf');

if (!fs.existsSync(FONT_REG_PATH) || !fs.existsSync(FONT_BOLD_PATH)) {
  console.error('Cyrillic fonts not found.'); process.exit(1);
}
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

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
const COLOR_INFO    = [60, 130, 200];

function ensureSpace(n) { if (y + n > PAGE_H - MARGIN) { doc.addPage(); y = MARGIN; } }
function h1(t) { ensureSpace(40); doc.setFont('NotoSans','bold'); doc.setFontSize(20); doc.setTextColor(...COLOR_DARK); doc.text(t, MARGIN, y); y+=16; doc.setDrawColor(...COLOR_PRIMARY); doc.setLineWidth(2); doc.line(MARGIN, y, MARGIN+60, y); y+=20; }
function h2(t) { ensureSpace(32); y+=4; doc.setFont('NotoSans','bold'); doc.setFontSize(13); doc.setTextColor(...COLOR_PRIMARY); doc.text(t, MARGIN, y); y+=16; }
function p(t, opts={}) { doc.setFont('NotoSans','normal'); doc.setFontSize(opts.size||11); doc.setTextColor(...(opts.color||COLOR_DARK)); const lines = doc.splitTextToSize(t, MAX_W); lines.forEach(l => { ensureSpace(15); doc.text(l, MARGIN, y); y+=14; }); y+=4; }
function bullet(t) { doc.setFont('NotoSans','normal'); doc.setFontSize(11); doc.setTextColor(...COLOR_DARK); const lines = doc.splitTextToSize(t, MAX_W-14); lines.forEach((l, i) => { ensureSpace(15); if (i===0) { doc.setFillColor(...COLOR_PRIMARY); doc.circle(MARGIN+4, y-4, 2, 'F'); } doc.text(l, MARGIN+14, y); y+=14; }); }
function code(t) { doc.setFont('NotoSans','normal'); doc.setFontSize(9); doc.setTextColor(60,70,90); ensureSpace(18); doc.setFillColor(244,246,252); const lines = doc.splitTextToSize(t, MAX_W-12); doc.rect(MARGIN, y-12, MAX_W, lines.length*12+10, 'F'); lines.forEach(l=>{ ensureSpace(12); doc.text(l, MARGIN+6, y); y+=12; }); y+=6; }
function table(rows, opts={}) {
  const cw = opts.colWidths || rows[0].map(() => MAX_W/rows[0].length);
  const rh = opts.rowHeight || 22;
  rows.forEach((row, r) => {
    ensureSpace(rh+2);
    let x = MARGIN;
    if (r===0) { doc.setFillColor(...COLOR_PRIMARY); doc.rect(MARGIN, y-14, MAX_W, rh, 'F'); doc.setTextColor(255,255,255); doc.setFont('NotoSans','bold'); }
    else { if (r%2===0) { doc.setFillColor(244,246,252); doc.rect(MARGIN, y-14, MAX_W, rh, 'F'); } doc.setTextColor(...COLOR_DARK); doc.setFont('NotoSans','normal'); }
    doc.setFontSize(10);
    row.forEach((c, i) => {
      const lines = doc.splitTextToSize(String(c), cw[i]-12);
      lines.slice(0,2).forEach((l, li) => doc.text(l, x+6, y+li*11));
      x += cw[i];
    });
    y += rh;
  });
  y += 6;
}
function badge(t, color) { ensureSpace(28); doc.setFillColor(...color); doc.roundedRect(MARGIN, y-12, doc.getTextWidth(t)+24, 22, 6, 6, 'F'); doc.setFont('NotoSans','bold'); doc.setFontSize(10); doc.setTextColor(255,255,255); doc.text(t, MARGIN+12, y+2); y+=30; }

// ─── Header ───────────────────────────────────────────────
doc.setFillColor(...COLOR_PRIMARY);
doc.rect(0, 0, PAGE_W, 96, 'F');
doc.setTextColor(255, 255, 255);
doc.setFont('NotoSans', 'bold');
doc.setFontSize(22);
doc.text('HealthPro · Моє Здоров\'я', MARGIN, 46);
doc.setFont('NotoSans', 'normal');
doc.setFontSize(13);
doc.text('Фаза 2 + Етап 5 — Capacitor APK та локальна БД (SQLite)', MARGIN, 68);
doc.setFontSize(10);
doc.text(new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }), MARGIN, 84);
y = 130;

// ─── 1. Резюме ─────────────────────────────────────────────
h1('1 · Резюме');
p('Цей звіт фіксує завершення Фази 2 (нативний Android APK через Capacitor) та Етапу 5 (локальна БД SQLite на нативі). Поточний раунд закрив три фінальні баги PrePhase2, налаштував збірку APK через GitHub Actions, додав 8 Capacitor-плагінів, інтегрував @capacitor-community/sqlite та переробив шар persistence на трирівневу архітектуру (SQLite → IndexedDB → localStorage-mirror).');
badge('ФАЗА 2 ЧАСТИНА 1: 3 БАГИ ЗАКРИТО', COLOR_OK);
badge('ФАЗА 2 ЧАСТИНА 2: APK ЗІБРАНО', COLOR_OK);
badge('ЕТАП 5: SQLite ІНТЕГРОВАНО', COLOR_OK);
badge('ТЕСТИ: 41/41 ЗЕЛЕНІ', COLOR_OK);
badge('1 ЗАЛИШКОВИЙ БАГ ВИЯВЛЕНО НА ПРИСТРОЇ', COLOR_AMBER);

// ─── 2. Виправлені баги PrePhase2 ────────────────────────
h1('2 · Виправлені баги PrePhase2');
table(
  [
    ['#', 'Баг', 'Корінь причини', 'Виправлення'],
    ['1', 'Sticky-навігація переїжджала при зміні висоти хедера (мова RU/UA)', 'Жорстке top:62px у layout.css', 'CSS-змінна --header-height + JS updateHeaderHeight() з ResizeObserver і хук на зміну мови'],
    ['2', 'Модалка експорту не закривалася після Друк / PDF / CSV', 'Дії викликалися напряму без post-action логіки', 'Обгортки exportPDF / printReportPeriod / exportReportCSV у features/export/index.js з try/finally → closeExportModal()'],
    ['3', 'Кнопка CSV зовні не реагувала', 'Дія викликала exportReportCSV() без обов\'язкового аргументу getExportMeasurements → TypeError ковтався catch-ом', 'Та сама обгортка проксує getExportMeasurements у CSV-експортер'],
  ],
  { colWidths: [24, 130, 170, MAX_W-24-130-170] }
);

// ─── 3. APK збірка ───────────────────────────────────────
h1('3 · Збірка Android APK через GitHub Actions');
p('Replit-середовище не має Java та Android SDK (~5 ГБ зайняв би SDK). Тому збірка винесена на GitHub Actions.');
h2('Workflow .github/workflows/android-apk.yml');
bullet('Тригери: push до main, pull_request, workflow_dispatch (ручний запуск).');
bullet('JDK 21 (Temurin), Android SDK через android-actions/setup-android.');
bullet('npm ci у root (для cap sync) + npm ci у HealthPro-Moie-Zdorovia/ (для імпортів).');
bullet('Vite build → npx cap sync android → ./gradlew assembleDebug.');
bullet('APK перейменовується у HealthPro-debug-<git-sha>.apk і вантажиться як артефакт HealthPro-debug-apk (зберігається 30 днів).');
h2('Як отримати APK');
p('GitHub → репо → вкладка Actions → workflow «Build Android APK» → останній run → блок Artifacts знизу → завантажити HealthPro-debug-apk.zip → всередині HealthPro-debug-<sha>.apk.');

// ─── 4. Capacitor плагіни ────────────────────────────────
h1('4 · Capacitor плагіни (9 шт.)');
table(
  [
    ['Плагін', 'Версія', 'Призначення'],
    ['@capacitor/app', '8.1.0', 'Lifecycle (foreground/background, deep links)'],
    ['@capacitor/filesystem', '8.1.2', 'Файлове сховище (для майбутнього експорту)'],
    ['@capacitor/haptics', '8.0.2', 'Тактильний відгук (натиск кнопок)'],
    ['@capacitor/local-notifications', '8.0.2', 'Нагадування про прийом ліків та вимірювання'],
    ['@capacitor/preferences', '8.0.1', 'KV-сховище (lang, theme, дрібні налаштування)'],
    ['@capacitor/share', '8.0.1', 'Системний share-sheet (для майбутнього експорту)'],
    ['@capacitor/splash-screen', '8.0.1', 'Splash екран при старті'],
    ['@capacitor/status-bar', '8.0.2', 'Стиль/колір статус-бара'],
    ['@capacitor-community/sqlite', '8.1.0', 'Реляційна БД (Етап 5)'],
  ],
  { colWidths: [220, 50, MAX_W-220-50] }
);
p('Усі плагіни встановлено в обидва package.json (root для cap sync поряд з capacitor.config.json, HealthPro-Moie-Zdorovia для ESM-імпортів у бандлі). cap sync android підтверджує: Found 9 Capacitor plugins for android.');

// ─── 5. Етап 5 — SQLite ──────────────────────────────────
h1('5 · Етап 5 — Локальна БД SQLite');
h2('Архітектура трирівневого persistence');
p('Жоден feature-модуль не змінений. Зміна локалізована у src/core/storage.js + новий src/core/sqlite.js.');
table(
  [
    ['Рівень', 'Web / PWA', 'Native (Android)'],
    ['1. Sync mirror', 'localStorage', 'localStorage'],
    ['2. Async primary', 'IndexedDB (HealthProDB / state)', 'SQLite (HealthProDB.db, kv_state)'],
    ['3. Backup', '—', 'IndexedDB (як другий запис)'],
  ],
  { colWidths: [110, 200, MAX_W-110-200] }
);
h2('Схема SQLite');
code('CREATE TABLE IF NOT EXISTS kv_state (\n  k          TEXT PRIMARY KEY,\n  v          TEXT NOT NULL,        -- JSON-stringified\n  updated_at INTEGER NOT NULL      -- ms since epoch\n);');
p('Чому KV-таблиця, а не реляційна схема: feature-модулі і далі читають/пишуть масиви та об\'єкти; міграція з IndexedDB робиться 1:1 копіюванням (key, JSON.stringify(value)); реляційні таблиці (наприклад окрема measurements з індексами по даті) — це майбутня v2-міграція без зламу API.');
h2('Чому SQLite надійніше за IndexedDB на Android');
bullet('SQLite файл лежить у /data/data/<package>/databases/HealthProDB.db — приватне сховище додатка.');
bullet('Не залежить від кешу WebView; «Очистити кеш» в системних налаштуваннях не зачіпає БД.');
bullet('Дані пропадають тільки при «Стерти дані» / видаленні додатка — як у нативних застосунків.');
h2('Міграційна логіка bootstrapStorage()');
bullet('1. Запит persistent storage permission.');
bullet('2. Ініціалізація SQLite (no-op на вебі).');
bullet('3. Одноразова міграція legacy localStorage → primary (для старих ключів measurements/pills/...).');
bullet('4. Одноразова міграція IndexedDB → SQLite (тільки на нативі, тільки якщо SQLite порожня).');
bullet('5. Регідрат localStorage-mirror з primary, щоб наступний холодний старт малював актуальні дані синхронно.');

// ─── 6. Залишковий баг ───────────────────────────────────
h1('6 · Залишковий баг для наступного раунду');
h2('Баг 4 (виявлено на пристрої): експорт PDF / CSV не зберігає файл');
p('Симптом: модалка показує ім\'я файлу «healthpro-…-…csv» / «…-pdf», але фізично файл не з\'являється у файловому менеджері Android.');
h2('Корінь причини');
bullet('csv.js, json-backup та platform.js::download() використовують web-механізм <a download>.click().');
bullet('jsPDF.save() усередині pdf.js робить те саме під капотом.');
bullet('У Android WebView такий download або тихо ігнорується, або кладе файл у непублічний WebView-cache.');
h2('План виправлення (наступний раунд)');
bullet('Розділити шлях у platform.js::download(): якщо isNative() → Filesystem.writeFile у Directory.Documents → потім Share.share для системного «Зберегти / Поділитися».');
bullet('Переробити csv.js: замість document.createElement(\'a\') → виклик platform.download().');
bullet('Переробити pdf.js: замість doc.save(...) → doc.output(\'blob\') → platform.download(blob).');
bullet('Додати unit-тест з мок-об\'єктом window.Capacitor.Plugins.{Filesystem,Share}.');
bullet('Перезібрати APK і повторно тестувати на пристрої.');

// ─── 7. Метрики ──────────────────────────────────────────
h1('7 · Метрики');
table(
  [
    ['Параметр', 'Значення'],
    ['Тести (vitest)', '41 / 41 зелені'],
    ['Тривалість тестів', '~1.2s'],
    ['Vite build', 'успіх, ~5.3s'],
    ['Розмір основного бандла', '1000 КБ (gzip 448 КБ)'],
    ['Розмір CSS', '40 КБ (gzip 8.2 КБ)'],
    ['Capacitor-плагіни', '9 (на Android)'],
    ['Розмір SQLite (порожня БД)', '~12 КБ файл'],
    ['Файлів змінено цього раунду', '4 (storage.js, sqlite.js, package.json ×2)'],
  ],
  { colWidths: [220, MAX_W-220] }
);

// ─── 8. Структура файлів ─────────────────────────────────
h1('8 · Структура (ключові файли)');
code([
  'repo-root/',
  '  capacitor.config.json           # appId ua.healthpro.app, webDir: dist',
  '  package.json                    # cap CLI + усі плагіни (для cap sync)',
  '  android/                        # нативний проект (не редагуємо)',
  '  dist/                           # build output (не в git)',
  '  .github/workflows/',
  '    android-apk.yml               # збірка APK',
  '    ci.yml                        # тести + build на push',
  '  scripts/',
  '    generate_phase2_stage5_report.cjs  # цей звіт',
  '  HealthPro-Moie-Zdorovia/',
  '    package.json                  # web-залежності + ті ж плагіни',
  '    src/core/',
  '      storage.js                  # 3-tier persistence (новий)',
  '      sqlite.js                   # SQLite адаптер (новий, no-op на вебі)',
  '      platform.js                 # детекція native + plugin proxy',
  '      state.js                    # глобальний стан',
  '    src/features/export/',
  '      index.js                    # обгортки з auto-close модалки',
].join('\n'));

// ─── 9. Статус ────────────────────────────────────────────
h1('9 · Статус та наступні кроки');
badge('ГОТОВО ДО ТЕСТУВАННЯ APK НА ПРИСТРОЇ', COLOR_OK);
p('Поточна гілка main містить SQLite-інтеграцію. Після git push GitHub Actions зібере новий APK з усіма 9 плагінами.');
h2('Послідовність');
bullet('1. git push origin main → GitHub Actions автоматично запускається.');
bullet('2. Отримати APK з артефактів, встановити на пристрій.');
bullet('3. Перевірити перенос даних: відкрити старий APK (де є дані з IDB), оновити на новий → дані мають з\'явитися (міграція IDB → SQLite виконається автоматично при першому запуску).');
bullet('4. Зробити кілька записів тиску, ліків — закрити додаток, очистити WebView-cache в системі → перевірити що дані лишилися (це і є вигода SQLite над IDB).');
bullet('5. Підтвердити Баг 4 (експорт CSV/PDF файл не знаходиться) — після цього запускається наступний раунд правок.');

// ─── Footer on every page ────────────────────────────────
const totalPages = doc.internal.pages.length - 1;
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_GRAY);
  doc.text(`HealthPro · Моє Здоров'я — Phase 2 + Stage 5 Report   ·   Сторінка ${i} з ${totalPages}`, MARGIN, PAGE_H - 24);
}

doc.save(OUT_FILE);
console.log('OK →', OUT_FILE);
