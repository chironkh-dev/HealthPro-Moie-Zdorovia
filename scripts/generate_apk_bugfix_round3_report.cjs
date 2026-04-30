const fs = require('fs');
const path = require('path');
const { jsPDF } = require(path.join(__dirname, '..', 'HealthPro-Moie-Zdorovia', 'node_modules', 'jspdf'));

const FONT_REG_PATH  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const OUT_DIR  = path.join(__dirname, '..', 'attached_assets');
const OUT_FILE = path.join(OUT_DIR, 'HealthPro_APK_BugFix_Round3.pdf');

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

// ─── Cover ────────────────────────────────────────────────────
doc.setFillColor(...COLOR_PRIMARY);
doc.rect(0, 0, PAGE_W, 110, 'F');
doc.setFont('NotoSans','bold'); doc.setFontSize(22); doc.setTextColor(255,255,255);
doc.text('HealthPro · Моє Здоров\'я', MARGIN, 56);
doc.setFontSize(13); doc.setFont('NotoSans','normal');
doc.text('APK Bug Fix · Раунд 3 (T1–T7)', MARGIN, 80);
doc.setFontSize(10); doc.setTextColor(220,225,255);
const dt = new Date().toLocaleDateString('uk-UA', { day:'2-digit', month:'long', year:'numeric' });
doc.text('Звіт від ' + dt, MARGIN, 98);
y = 140;

h1('1. Контекст');
p('Перед наступним тестом APK на пристрої виконано 7 завдань (T1–T7), що усувають хардкод мови у фічах, додають хардверну кнопку «Назад», переводять сповіщення на ESM-плагін LocalNotifications, додають збереження CSV/PDF через Filesystem + Share, а також показ модалки дозволу сповіщень одразу після прийняття дисклеймера.');

h1('2. Зведення задач');
table([
  ['Код','Задача','Результат'],
  ['T1','Усунення хардкоду UA/RU + рефакторинг у i18n','Готово'],
  ['T2','Модалка ВООЗ — повний переклад через i18n','Готово'],
  ['T3','Хардверна кнопка «Назад» (Capacitor App)','Готово'],
  ['T4','LocalNotifications через ESM (без window.Capacitor.Plugins)','Готово'],
  ['T5','PDF/CSV — Filesystem.writeFile + Share.share','Готово'],
  ['T6','Модалка дозволу сповіщень після дисклеймера','Готово'],
  ['T7','Verify (npm test 41/41, build, cap sync) + звіт','Готово'],
], { colWidths: [50, 320, 130] });

h1('3. T1 — i18n рефакторинг');
p('Видалено усі гілки `state.lang === "ru" ? ... : ...` та `isRu()` з фіч. Натомість додано близько 30 нових ключів у `src/i18n/ui.uk.js` та `ui.ru.js` (групи `notif-*`, `discl-*`, `profile-*`, `app-*`, `t-notif-perm-*`).');
p('Локалі для `toLocaleDateString` тепер беремо через єдиний хелпер:');
code("// src/core/utils.js\nexport function getLocale() {\n  return state.lang === 'ru' ? 'ru-UA' : 'uk-UA';\n}");
p('Файли, охоплені рефакторингом: pressure/*, analytics/*, charts/bp-chart.js, history/index.js, meds/index.js, steps/index.js, settings/{profile.js, disclaimer.js, notifications.js}, export/{csv.js, pdf.js, print.js, modal.js}, app.js.');
p('Перевірено grep: лишилися лише два легітимні випадки `state.lang === \'ru\'` — для toggle CSS-класу `active` на кнопках мови та для атрибуту `<html lang>` у шаблоні друку.');

h1('4. T2 — Модалка ВООЗ');
p('У `src/features/pressure/who.js` усі рядки взято з `WHO_T[state.lang]` словника. Модалка перекладається миттєво при перемиканні мови.');

h1('5. T3 — Хардверна кнопка «Назад»');
p('Додано в `core/platform.js`:');
code("export function onBackButton(handler) { /* App plugin addListener('backButton') */ }\nexport async function minimizeApp() { /* App.minimizeApp() */ }");
p('У `app.js` зареєстровано обробник з логікою:');
bullet('Якщо є відкрита модалка (.modal-overlay.show / .critical-wrap.show / .disclaimer-modal.show) — закрити її та звільнити overflow.');
bullet('Інакше якщо поточна вкладка не «Тиск» — повернутися на «Тиск».');
bullet('Інакше — `minimizeApp()` (на Android — згортання у фон).');

h1('6. T4 — LocalNotifications через ESM');
p('Замість `window.Capacitor.Plugins.LocalNotifications` тепер використовується dynamic import `@capacitor/local-notifications`. Це дає tree-shaking і чіткіші помилки.');
code("// platform.js\nasync function _ln() {\n  if (!isNative()) return null;\n  try { const m = await import('@capacitor/local-notifications'); return m.LocalNotifications || null; }\n  catch { return null; }\n}\n\nexport async function notify(title, options = {}) {\n  const ln = await _ln();\n  if (ln && typeof ln.schedule === 'function') {\n    await ln.schedule({ notifications: [{\n      id: options.id ?? Math.floor(Math.random()*1e9),\n      title, body: options.body || '',\n      schedule: options.at ? { at: options.at } : undefined,\n    }] });\n    return true;\n  }\n  /* web fallback: new Notification(title, options) */\n}");
p('Додано також `checkNotificationPermission()` (без запиту) та `cancelNotifications(ids)` для майбутнього перепланування.');
p('`features/settings/notifications.js` повністю переписаний: усі тости через `t()`, виклики native — через `notify()`. Якщо дозвіл не наданий — показується тост `notif-denied`.');

h1('7. T5 — Експорт CSV / PDF на нативі');
p('Раніше експорт використовував `<a download>`, що не працює в Android WebView. Тепер `platform.download()` async, на нативі:');
bullet('Якщо MIME — текст/json/csv → `Filesystem.writeFile({ encoding: UTF8 })`.');
bullet('Інакше (PDF) → конвертація blob → base64 → `Filesystem.writeFile({})`.');
bullet('Каталог — `Directory.Documents`. Після запису — `Share.share({ url: writeRes.uri })`.');
bullet('У web/PWA — fallback через `<a download>` (як було).');
p('`csv.js` та `pdf.js` тепер делегують збереження у `platformDownload(filename, blob, mime)` — жодних `<a>` лишилося.');

h1('8. T6 — Модалка дозволу сповіщень');
p('Новий модуль `src/features/settings/notif-perm.js` із трьома експортами: `maybeShowNotifPermModal`, `acceptNotifPerm`, `declineNotifPerm`.');
p('Стан зберігається у `prefs.set("notif_permission_asked", "true"|"false")` (Capacitor Preferences на нативі, localStorage у web). Модалка з`являється лише один раз — після першого прийняття дисклеймера.');
p('У `index.html` додано `#notifPermModal` з кнопками «Не зараз» / «Дозволити» (стилі `btn-outline` / `btn-blue`). У `app.js` зареєстровано обробники `acceptNotifPerm`, `declineNotifPerm`, `dismissNotifPerm`.');

h1('9. T7 — Перевірка');
table([
  ['Перевірка','Команда','Результат'],
  ['Юніт-тести','npm test','41 / 41 passed'],
  ['Build (Vite)','npm run build','built in ~4.7s'],
  ['Capacitor sync','npx cap sync android','9 plugins, ok'],
  ['Smoke (web)','workflow','стартовий екран UA рендериться'],
], { colWidths: [130, 200, 170] });

p('Зареєстровані Capacitor-плагіни на Android:');
bullet('@capacitor-community/sqlite@8.1.0');
bullet('@capacitor/app@8.1.0');
bullet('@capacitor/filesystem@8.1.2');
bullet('@capacitor/haptics@8.0.2');
bullet('@capacitor/local-notifications@8.0.2');
bullet('@capacitor/preferences@8.0.1');
bullet('@capacitor/share@8.0.1');
bullet('@capacitor/splash-screen@8.0.1');
bullet('@capacitor/status-bar@8.0.2');

h1('10. Що далі');
p('Готовий до збірки нового debug APK через GitHub Actions. На пристрої перевірити:');
bullet('Перший запуск: дисклеймер → модалка дозволу сповіщень → дозвіл або відмова → коректний тост.');
bullet('Хардверна «Назад»: закриває модалку, потім повертає на «Тиск», потім згортає додаток.');
bullet('Експорт PDF та CSV: відкривається системний Share із збереженим файлом.');
bullet('Перемикання UA/RU: усі екрани, тости, модалка ВООЗ, історія, експорт оновлюються.');

// Footer
const pages = doc.internal.getNumberOfPages();
for (let i = 1; i <= pages; i++) {
  doc.setPage(i);
  doc.setFont('NotoSans','normal'); doc.setFontSize(8); doc.setTextColor(...COLOR_GRAY);
  doc.text('HealthPro · APK Bug Fix Round 3 · стор. ' + i + ' / ' + pages, MARGIN, PAGE_H - 24);
}

doc.save(OUT_FILE);
console.log('Saved ' + OUT_FILE);
