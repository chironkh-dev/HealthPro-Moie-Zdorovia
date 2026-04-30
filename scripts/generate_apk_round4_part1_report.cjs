const fs = require('fs');
const path = require('path');
const { jsPDF } = require(path.join(__dirname, '..', 'HealthPro-Moie-Zdorovia', 'node_modules', 'jspdf'));

const FONT_REG_PATH  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const OUT_DIR  = path.join(__dirname, '..', 'attached_assets');
const OUT_FILE = path.join(OUT_DIR, 'HealthPro_APK_Round4_Part1_BackgroundNotifications.pdf');

if (!fs.existsSync(FONT_REG_PATH) || !fs.existsSync(FONT_BOLD_PATH)) { console.error('Fonts not found.'); process.exit(1); }
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const doc = new jsPDF({ unit: 'pt', format: 'a4' });
doc.addFileToVFS('NotoSans-Regular.ttf', fs.readFileSync(FONT_REG_PATH).toString('base64'));
doc.addFileToVFS('NotoSans-Bold.ttf',    fs.readFileSync(FONT_BOLD_PATH).toString('base64'));
doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
doc.addFont('NotoSans-Bold.ttf',    'NotoSans', 'bold');

const PAGE_W = doc.internal.pageSize.getWidth();
const PAGE_H = doc.internal.pageSize.getHeight();
const MARGIN = 48;
const MAX_W  = PAGE_W - MARGIN * 2;
let y = MARGIN;

const COLOR_PRIMARY = [70, 90, 220];
const COLOR_DARK    = [20, 30, 60];
const COLOR_GRAY    = [110, 120, 140];
const COLOR_OK      = [16, 160, 80];
const COLOR_WARN    = [200, 60, 60];

function ensureSpace(n) { if (y + n > PAGE_H - MARGIN) { doc.addPage(); y = MARGIN; } }
function h1(t) { ensureSpace(40); doc.setFont('NotoSans','bold'); doc.setFontSize(18); doc.setTextColor(...COLOR_DARK); doc.text(t, MARGIN, y); y+=14; doc.setDrawColor(...COLOR_PRIMARY); doc.setLineWidth(2); doc.line(MARGIN, y, MARGIN+60, y); y+=18; }
function h2(t) { ensureSpace(30); y+=4; doc.setFont('NotoSans','bold'); doc.setFontSize(12); doc.setTextColor(...COLOR_PRIMARY); doc.text(t, MARGIN, y); y+=15; }
function p(t, opts={}) { doc.setFont('NotoSans','normal'); doc.setFontSize(opts.size||10.5); doc.setTextColor(...(opts.color||COLOR_DARK)); const lines = doc.splitTextToSize(t, MAX_W); lines.forEach(l => { ensureSpace(14); doc.text(l, MARGIN, y); y+=13; }); y+=4; }
function bullet(t) { doc.setFont('NotoSans','normal'); doc.setFontSize(10.5); doc.setTextColor(...COLOR_DARK); const lines = doc.splitTextToSize(t, MAX_W-14); lines.forEach((l, i) => { ensureSpace(14); if (i===0) { doc.setFillColor(...COLOR_PRIMARY); doc.circle(MARGIN+4, y-4, 2, 'F'); } doc.text(l, MARGIN+14, y); y+=13; }); }
function code(t) { doc.setFont('NotoSans','normal'); doc.setFontSize(8.5); doc.setTextColor(60,70,90); ensureSpace(18); doc.setFillColor(244,246,252); const lines = doc.splitTextToSize(t, MAX_W-12); doc.rect(MARGIN, y-11, MAX_W, lines.length*11+8, 'F'); lines.forEach(l=>{ ensureSpace(11); doc.text(l, MARGIN+6, y); y+=11; }); y+=6; }
function table(rows, opts={}) {
  const cw = opts.colWidths || rows[0].map(() => MAX_W/rows[0].length);
  const rh = opts.rowHeight || 22;
  rows.forEach((row, r) => {
    ensureSpace(rh+2);
    let x = MARGIN;
    if (r===0) { doc.setFillColor(...COLOR_PRIMARY); doc.rect(MARGIN, y-14, MAX_W, rh, 'F'); doc.setTextColor(255,255,255); doc.setFont('NotoSans','bold'); }
    else { if (r%2===0) { doc.setFillColor(244,246,252); doc.rect(MARGIN, y-14, MAX_W, rh, 'F'); } doc.setTextColor(...COLOR_DARK); doc.setFont('NotoSans','normal'); }
    doc.setFontSize(9.5);
    row.forEach((c, i) => {
      const lines = doc.splitTextToSize(String(c), cw[i]-12);
      lines.slice(0,3).forEach((l, li) => doc.text(l, x+6, y+li*10));
      x += cw[i];
    });
    y += rh;
  });
  y += 6;
}

// Cover
doc.setFillColor(...COLOR_PRIMARY);
doc.rect(0, 0, PAGE_W, 110, 'F');
doc.setFont('NotoSans','bold'); doc.setFontSize(22); doc.setTextColor(255,255,255);
doc.text('HealthPro · Моє Здоров\'я', MARGIN, 56);
doc.setFontSize(13); doc.setFont('NotoSans','normal');
doc.text('APK Round 4 · Частина 1 — фонові сповіщення + іконка', MARGIN, 80);
doc.setFontSize(10); doc.setTextColor(220,225,255);
const dt = new Date().toLocaleDateString('uk-UA', { day:'2-digit', month:'long', year:'numeric' });
doc.text('Звіт від ' + dt, MARGIN, 98);
y = 140;

h1('1. Контекст');
p('Користувач після другого APK-тесту повідомив 4 проблеми: (1) дефолтна іконка лаунчера, (2) сповіщення працюють тільки в фореграунді й без звуку, (3) кнопка вмикання нагадувань неактивна, (4) Email/SMS треба надсилати автоматично. Цей звіт документує виправлення проблем 1, 2 і 3 (заразом — підчистка структури проекту: видалення дубль android/ та capacitor.config.json + правки AndroidManifest за рекомендацією Gemini). Email/SMS — окремою задачею після узгодження варіанту.');

h1('2. Знахідка: дві Android-папки');
p('У репозиторії знайдено дві паралельні Android-збірки:');
table([
  ['Шлях','Стан','Що робив'],
  ['android/ (корінь)','РЕАЛЬНА збірка','GitHub Actions використовує цю папку для cap sync і assembleDebug.'],
  ['HealthPro-Moie-Zdorovia/android/','застарілий дубль','Залишок міграції — генератор іконок помилково писав сюди.'],
], { colWidths: [180, 110, 209], rowHeight: 32 });
p('Через це нова іконка опинилася не в тому Android-проекті, а APK з GitHub Actions — зі старою. Дубль видалено, тепер єдина android/ у корені.');
code('rm -rf HealthPro-Moie-Zdorovia/android HealthPro-Moie-Zdorovia/capacitor.config.json\nmkdir -p assets && cp HealthPro-Moie-Zdorovia/assets/icon.png assets/\nnpx capacitor-assets generate --android --assetPath assets   # → 74 файли в android/');

h1('3. Виправлення');

h2('#1. Іконка лаунчера');
bullet('Згенеровано 74 файли в правильну android/app/src/main/res (mipmap-mdpi…xxxhdpi + drawable-port/land/night-* для splash).');
bullet('ic_launcher.png у xxxhdpi: 22 KB (раніше 9 KB — дефолтна капасіторова).');
bullet('Створено адаптивні mipmap-anydpi-v26/ic_launcher.xml + ic_launcher_round.xml для Android 8+.');
bullet('Sphash-екран теж оновлено (21 варіант щільності + темна тема).');

h2('#2. Фонові сповіщення зі звуком — головне виправлення');
p('Стара архітектура: setInterval(scheduleNotifications, 60000) у JS-коді → працює тільки коли веб-вʼю активне. notify() викликав LocalNotifications.schedule без channelId, тому Android 8+ застосовував дефолтний low-priority канал без звуку та без heads-up.');
p('Нова архітектура: пре-планування через Android AlarmManager — спрацьовує навіть коли додаток вбито з памʼяті.');
bullet('platform.ensureNotificationChannel() створює канал id="reminders" з importance=5 (HIGH), sound="default", vibration=true, lights=true. Викликається один раз після надання дозволу.');
bullet('platform.notify() приймає options.dailyAt = { hour, minute } → schedule.on={...}, allowWhileIdle=true. ОС повторює щодня без участі додатку.');
bullet('platform.cancelAllNotifications() — скасовує усі pending перед перепланом (через getPending() + cancel()).');
bullet('notifications.scheduleAllReminders() — нова функція. cancel(all) → schedule(...) для кожної таблетки (id 50000 + hash) + ранкового нагадування (id 90001) + вечірнього (id 90002).');
bullet('Тригери перепланування: toggleNotifications, toggleMeasureReminder, saveReminderTimes, on(\'pills:changed\').');
bullet('app.js: setInterval(scheduleNotifications, 60000) видалено. На старті — одноразовий scheduleNotifications().');
bullet('smallIcon: \'ic_launcher\' (раніше посилалися на ic_stat_icon_config_sample, який не bundleded плагіном — деякі версії Android тоді не показували сповіщення взагалі).');

h2('#3. Кнопка дозволу — порожня без активних дій');
bullet('platform.openAppSettings() — обгортка над App.openSettings() (Capacitor App плагін). Відкриває системну сторінку Settings → App → Notifications.');
bullet('Якщо користувач відмовив у дозволі — після toast "Відхилено" зʼявляється confirm() з пропозицією відкрити налаштування.');
bullet('Нові i18n ключі: notif-pill-title, notif-open-settings-confirm (UA + RU).');

h1('4. AndroidManifest — рекомендації Gemini');
table([
  ['Порада','Рішення'],
  ['Додати FOREGROUND_SERVICE_HEALTH (Android 14+)','Додано. Стара FOREGROUND_SERVICE залишена для сумісності.'],
  ['Додати <service BackgroundStepService>','Відхилено: немає Java-класу → APK не збереться. Потрібен окремий Capacitor-плагін на Java/Kotlin.'],
  ['Додати <receiver StepResetReceiver>','Відхилено з тієї ж причини. RECEIVE_BOOT_COMPLETED дозвіл вже додано — достатньо для Capacitor LocalNotifications, які самі переплановують після ребуту через @capacitor/local-notifications boot receiver.'],
], { colWidths: [220, 279], rowHeight: 36 });
code('<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />\n<uses-permission android:name="android.permission.FOREGROUND_SERVICE_HEALTH" />');

h1('5. Перевірки');
bullet('npx vite build → ok.');
bullet('npx cap sync android → ok, 9 Capacitor-плагінів.');
bullet('Workflow Start application — RUNNING без помилок.');
bullet('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png — 22 KB (свіжа іконка).');

h1('6. Що далі (наступна підзадача)');
p('Email/SMS автоматичне надсилання — потребує вашого вибору варіанту:');
bullet('A. mailto:/sms: у момент спрацювання нагадування → юзер тільки тиснe Send (1 клік).');
bullet('B. Resend API (безкоштовно 100 листів/день) — повністю автоматично, без кліків. Треба додати API-ключ через інтеграцію.');
bullet('C. Комбінація A+B (SMS через A, Email через B).');
p('Після вашого рішення — реалізую і випущу окремий звіт.');

h1('7. Послідовність збірки APK');
code('git add -A\ngit commit -m "Round 4 part1: real bg notifications + sound, app icon, FOREGROUND_SERVICE_HEALTH"\ngit push origin main\n# далі: GitHub Actions → Build Android APK → Artifacts → HealthPro-debug-<sha>.apk');
p('Після завантаження APK на телефон: видаліть СТАРУ копію HealthPro і встановіть нову. Android агресивно кешує іконки лаунчера — без видалення стара іконка може лишитись.', { color: COLOR_WARN });

ensureSpace(40);
y = PAGE_H - MARGIN;
doc.setFont('NotoSans','normal'); doc.setFontSize(8.5); doc.setTextColor(...COLOR_GRAY);
doc.text('HealthPro · Моє Здоров\'я · APK Round 4 · Part 1', MARGIN, y);
doc.text('Стор. ' + doc.getCurrentPageInfo().pageNumber, PAGE_W - MARGIN - 40, y);

doc.save(OUT_FILE);
fs.writeFileSync(OUT_FILE, Buffer.from(doc.output('arraybuffer')));
console.log('Wrote', OUT_FILE);
