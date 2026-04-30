const fs = require('fs');
const path = require('path');
const { jsPDF } = require(path.join(__dirname, '..', 'HealthPro-Moie-Zdorovia', 'node_modules', 'jspdf'));

const FONT_REG_PATH  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const OUT_DIR  = path.join(__dirname, '..', 'attached_assets');
const OUT_FILE = path.join(OUT_DIR, 'HealthPro_APK_BugFix_Round3_Continuation.pdf');

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
      lines.slice(0,2).forEach((l, li) => doc.text(l, x+6, y+li*10));
      x += cw[i];
    });
    y += rh;
  });
  y += 6;
}

// ─── Cover ────────────────────────────────────────────────────
doc.setFillColor(...COLOR_PRIMARY);
doc.rect(0, 0, PAGE_W, 110, 'F');
doc.setFont('NotoSans','bold'); doc.setFontSize(22); doc.setTextColor(255,255,255);
doc.text('HealthPro · Моє Здоров\'я', MARGIN, 56);
doc.setFontSize(13); doc.setFont('NotoSans','normal');
doc.text('APK Bug Fix · Раунд 3 (продовження, 14 задач)', MARGIN, 80);
doc.setFontSize(10); doc.setTextColor(220,225,255);
const dt = new Date().toLocaleDateString('uk-UA', { day:'2-digit', month:'long', year:'numeric' });
doc.text('Звіт від ' + dt, MARGIN, 98);
y = 140;

// ─── 1. Контекст ───────────────────────────────────────────────
h1('1. Контекст');
p('Після першого APK-тесту користувач надіслав 14 нових зауважень: критичний баг із кнопками в модалці дозволу сповіщень, відсутні нативні дії для Email/SMS-нагадувань, залишки хардкоду мови, неточний крокомір, що «вигадує» кроки в спокої, відсутні Android-дозволи для фонової роботи нагадувань і застарілий аудит бази препаратів. Цей звіт фіксує всі виправлення, готові до повторної збірки APK.');

h1('2. Зведення задач');
table([
  ['№','Задача','Результат'],
  ['#1','Кнопки модалки дозволу сповіщень не реагують','Виправлено'],
  ['#2','Email/SMS нагадування через нативний intent','Готово'],
  ['#3','i18n: залишки хардкоду в data.js / critical.js','Готово'],
  ['#4','Native LocalNotifications через ESM','Раніше (T4)'],
  ['#5','Експорт CSV/PDF через Filesystem+Share','Раніше (T5)'],
  ['#6','Модалка дозволу сповіщень після дисклеймера','Раніше (T6)'],
  ['#7','AndroidManifest: дозволи фонових нагадувань','Готово'],
  ['#8','Посилання на класифікацію ВООЗ','Підтверджено робочим'],
  ['#9','Посилання в рекомендаціях','Підтверджено робочим'],
  ['#10','Видалити застарілі тексти PWABuilder/VAPID','Готово'],
  ['#11','Хардверна кнопка «Назад»','Раніше (T3)'],
  ['#12','Іконка та сплеш-екран для APK','Згенеровано (74 файли)'],
  ['#13','Крокомір «вигадує» кроки в спокої','Виправлено'],
  ['#14','Аудит drug-db.js: зрозумілі попередження','Переписано 80+ записів'],
], { colWidths: [40, 360, 99], rowHeight: 22 });

// ─── 3. Деталі виправлень ─────────────────────────────────────
h1('3. Деталі виправлень');

h2('#1. Модалка дозволу сповіщень — кнопки');
p('Атрибут onclick="event.stopPropagation()" на .modal-sheet перехоплював клік раніше, ніж document-level dispatcher app.js знаходив елемент із data-action. Кнопки «Дозволити» / «Не зараз» не реагували.');
bullet('Замінено onclick="event.stopPropagation()" на data-action="stop" (no-op у dispatcher).');
bullet('ID елементів модалки приведено у відповідність ключам i18n: nt-perm-title / nt-perm-text / nt-perm-allow / nt-perm-deny.');

h2('#2. Email/SMS нагадування');
p('Замість застарілого Google Calendar / VAPID / push-сервера додано нативний механізм відкриття стандартних додатків через App.openUrl().');
bullet('Новий модуль src/features/settings/email-sms.js з функціями sendEmailReminder() / sendSmsReminder() / renderEmailSmsTargets().');
bullet('platform.openUrl(url): на нативі — Capacitor App.openUrl (intent picker), у браузері — window.open.');
bullet('Кнопки в settings використовують data-action="sendEmailReminder" / "sendSmsReminder", цілі — поля профілю + контакти екстреної допомоги.');
bullet('AndroidManifest містить <queries> для mailto:/sms:/tel:/https — обов\'язково для Android 11+.');

h2('#3. i18n хардкод (фінальний прохід)');
bullet('data.js: confirm() використовує t(\'data-clear-confirm\').');
bullet('critical.js: SMS-тіло, тестовий SMS, ім\'я екстреного контакту — всі через tt() / t().');
bullet('Додано всі нові ключі в UA та RU словники i18n/ui.uk.js та i18n/ui.ru.js.');

h2('#7. AndroidManifest — дозволи');
code(
`POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM, USE_EXACT_ALARM,
RECEIVE_BOOT_COMPLETED, WAKE_LOCK, VIBRATE, FOREGROUND_SERVICE,
ACTIVITY_RECOGNITION
+ <uses-feature> stepcounter / stepdetector / accelerometer (required=false)
+ <queries> mailto:, sms:, tel:, https`
);
p('Без цих дозволів локальні нагадування на Android 13+ не показуються, не переживають перезавантаження та не працюють у фоні.');

h2('#10. Видалення застарілих UI-блоків');
bullet('index.html: прибрано блок про PWABuilder / VAPID-ключ / push-сервер.');
bullet('ui.uk.js та ui.ru.js: прибрано всі i18n-ключі, що описували ці непрацюючі функції.');
bullet('На їх місці — нова секція Email/SMS нагадувань (#emailSmsTargets).');

h2('#12. Іконка та сплеш-екран');
p('Встановлено @capacitor/assets (devDependency). Згенеровано 74 файли з джерела HealthPro-Moie-Zdorovia/assets/icon.png (1024×1024).');
code('npx capacitor-assets generate --android --assetPath assets');
bullet('mipmap-mdpi…xxxhdpi/ic_launcher.png + ic_launcher_round.png + ic_launcher_foreground.png + ic_launcher_background.png.');
bullet('mipmap-anydpi-v26/ic_launcher.xml та ic_launcher_round.xml (адаптивна іконка Android 8+).');
bullet('drawable-port-* / drawable-land-* / *-night-* — 21 splash-варіант для всіх щільностей і темної теми.');

h2('#13. Крокомір — точний детектор кроків');
p('Старий поріг STEP_ACCEL_THRESHOLD=1.5 не враховував гравітаційну базову лінію (≈9.81 m/s²), тому будь-яка вібрація телефону на столі рахувалася як крок. Додано також дебаунс між двома кроками.');
bullet('Поріг піднято до 12 m/s² (типовий пік прискорення під час ходьби — 11–13).');
bullet('Дебаунс STEP_MIN_INTERVAL_MS=280 → не більше ~3.5 кроку/сек.');
bullet('handleMotion(): rising-edge детектор (acc>порог && lastAcc<=поріг && now-lastTs>=280).');
bullet('Підтримка події з @capacitor/motion (e.acceleration без гравітації) — додаємо +9.81 до z.');

h2('#14. Аудит drug-db.js');
p('Переписано 80+ записів препаратів. Жодних криптичних абревіатур.');
table([
  ['Було','Стало'],
  ['не натщесерце','Приймати після їжі'],
  ['контроль K+','Контролюйте рівень калію (аналіз крові)'],
  ['=еналаприл','Контролюйте рівень калію та функцію нирок (аналіз крові). Можливий сухий кашель.'],
  ['не різко відміняти','Не відміняти різко (поступово знижувати дозу)'],
  ['не при вагітності','Заборонено при вагітності'],
  ['контроль МНВ','Регулярно здавайте аналіз МНВ (INR)'],
], { colWidths: [180, 319], rowHeight: 30 });
bullet('Виправлено баг дублікату ключа \'периндоприл\' (UA-запис мовчки перезаписувався RU-варіантом, бо JS-обʼєкти не мають дублюючих ключів).');
bullet('Видалено всі крос-посилання типу =лозартан — кожен препарат тепер має повний текст застереження.');

// ─── 4. Перевірки ─────────────────────────────────────────────
h1('4. Перевірки');
bullet('npx vite build → ok, 0 помилок.');
bullet('npx cap sync android → ok, 9 Capacitor-плагінів, web-assets скопійовано.');
bullet('Workflow Start application — RUNNING без помилок.');
bullet('Превʼю головного екрана коректно відображається (UA, дисклеймер, 4 пункти + кнопка погодження).');

// ─── 5. Що далі ───────────────────────────────────────────────
h1('5. Збірка APK');
p('Усі джерельні зміни (web + android/) готові до коміту. Послідовність:');
code(
`# у Replit Shell:
git add -A
git commit -m "APK Round 3 (continuation): notif modal, email/sms, manifest, drug-db, icon"
git push origin main

# далі автоматично:
GitHub Actions → Build Android APK → Artifacts → HealthPro-debug-<sha>.apk`
);

// ─── Footer ───────────────────────────────────────────────────
ensureSpace(40);
y = PAGE_H - MARGIN;
doc.setFont('NotoSans','normal'); doc.setFontSize(8.5); doc.setTextColor(...COLOR_GRAY);
doc.text('HealthPro · Моє Здоров\'я · APK Bug Fix Round 3 (continuation)', MARGIN, y);
doc.text('Стор. ' + doc.getCurrentPageInfo().pageNumber, PAGE_W - MARGIN - 40, y);

doc.save(OUT_FILE);
fs.writeFileSync(OUT_FILE, Buffer.from(doc.output('arraybuffer')));
console.log('Wrote', OUT_FILE);
