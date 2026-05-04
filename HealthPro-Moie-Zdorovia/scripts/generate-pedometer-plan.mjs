// Генератор PDF-плану: Крокомір як невбиваний процес (Foreground Service)
// Шрифт: DejaVu Sans (Arial не встановлено в Replit-середовищі)
// Запуск: node scripts/generate-pedometer-plan.mjs

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT      = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const OUT       = path.join(__dirname, '..', 'HealthPro_Pedometer_ForegroundService_Plan.pdf');

const doc = new PDFDocument({ margin: 50, size: 'A4' });
doc.pipe(fs.createWriteStream(OUT));

doc.registerFont('R', FONT);
doc.registerFont('B', FONT_BOLD);

// ── Palette ─────────────────────────────────────────────────────────────────
const C = {
  navy:   '#1e3a5f',
  blue:   '#2563eb',
  green:  '#16a34a',
  amber:  '#d97706',
  red:    '#dc2626',
  purple: '#7c3aed',
  gray:   '#64748b',
  light:  '#f1f5f9',
  white:  '#ffffff',
  black:  '#0f172a',
  border: '#cbd5e1',
  teal:   '#0d9488',
};

const W  = doc.page.width  - 100;
const ML = 50;

// ── Helpers ──────────────────────────────────────────────────────────────────
function h1(text) {
  doc.moveDown(0.5)
     .font('B').fontSize(16).fillColor(C.navy)
     .text(text, ML, doc.y, { width: W })
     .moveDown(0.2);
  rule(C.navy, 1.5);
  doc.moveDown(0.4);
}

function h2(text, color = C.blue) {
  doc.moveDown(0.5)
     .font('B').fontSize(12).fillColor(color)
     .text(text, ML, doc.y, { width: W })
     .moveDown(0.15);
}

function h3(text) {
  doc.moveDown(0.3)
     .font('B').fontSize(10).fillColor(C.navy)
     .text(text, ML, doc.y, { width: W })
     .moveDown(0.1);
}

function body(text, color = C.black, indent = 0) {
  doc.font('R').fontSize(9.5).fillColor(color)
     .text(text, ML + indent, doc.y, { width: W - indent, lineGap: 2 })
     .moveDown(0.2);
}

function bullet(text, color = C.black, indent = 16) {
  const y0 = doc.y;
  doc.font('B').fontSize(9).fillColor(C.blue).text('•', ML + indent - 10, y0, { lineBreak: false });
  doc.font('R').fontSize(9.5).fillColor(color)
     .text(text, ML + indent, y0, { width: W - indent, lineGap: 1.5 });
  doc.moveDown(0.1);
}

function rule(color = C.border, h = 0.5) {
  const y = doc.y;
  doc.moveTo(ML, y).lineTo(ML + W, y).lineWidth(h).strokeColor(color).stroke();
}

function noteBox(text, bcolor = C.amber, bgHex = '#fefce8') {
  const boxY = doc.y;
  // measure text height
  const textH = doc.font('R').fontSize(9).heightOfString(text, { width: W - 28 });
  const boxH = textH + 20;
  doc.roundedRect(ML, boxY, W, boxH, 5).fill(bgHex);
  doc.rect(ML, boxY, 4, boxH).fill(bcolor);
  doc.font('R').fontSize(9).fillColor(C.black)
     .text(text, ML + 14, boxY + 10, { width: W - 24, lineGap: 2 });
  doc.y = boxY + boxH + 6;
}

function stepBox(num, title, detail, color = C.blue) {
  const y0 = doc.y;
  // circle number
  doc.circle(ML + 12, y0 + 12, 12).fill(color);
  doc.font('B').fontSize(10).fillColor(C.white)
     .text(String(num), ML + 8, y0 + 7, { width: 12, lineBreak: false });
  doc.font('B').fontSize(10).fillColor(color)
     .text(title, ML + 30, y0 + 6, { width: W - 30 });
  doc.font('R').fontSize(9).fillColor(C.gray)
     .text(detail, ML + 30, doc.y + 2, { width: W - 30, lineGap: 1.5 });
  doc.moveDown(0.5);
  rule(C.border, 0.3);
}

function fileRow(file, action, detail) {
  const y0 = doc.y;
  doc.font('B').fontSize(9).fillColor(C.navy)
     .text(file, ML + 4, y0, { width: 210, lineBreak: false });
  doc.font('B').fontSize(8).fillColor(action === 'НОВИЙ' ? C.green : C.amber)
     .text(action, ML + 220, y0, { width: 50, lineBreak: false });
  doc.font('R').fontSize(9).fillColor(C.gray)
     .text(detail, ML + 275, y0, { width: W - 280, lineBreak: false });
  doc.y = y0 + 14;
  rule(C.border, 0.3);
}

// ════════════════════════════════════════════════════════════════════════════
// COVER PAGE
// ════════════════════════════════════════════════════════════════════════════
doc.rect(0, 0, doc.page.width, 160).fill(C.navy);

// Logo circle
doc.circle(ML + 24, 50, 24).fill(C.blue);
doc.font('B').fontSize(16).fillColor(C.white).text('HP', ML + 14, 41, { lineBreak: false });

doc.font('B').fontSize(22).fillColor(C.white)
   .text('HealthPro — Крокомір', ML + 60, 28, { width: W - 60 });
doc.font('R').fontSize(12).fillColor('#93c5fd')
   .text('План реалізації невбиваного процесу (Foreground Service)', ML + 60, 58, { width: W - 60 });
doc.font('R').fontSize(9.5).fillColor('#cbd5e1')
   .text('Android Capacitor · Vanilla JS · Vitest · v4.1+', ML + 60, 82, { width: W - 60 });
doc.font('R').fontSize(9).fillColor('#94a3b8')
   .text('Дата: 04 травня 2026  |  Статус: ЧЕРНЕТКА — потребує узгодження', ML + 60, 104, { width: W - 60 });

doc.y = 176;

// Статус-блок
const statusY = doc.y;
doc.roundedRect(ML, statusY, W, 52, 6).fill(C.light);
doc.font('B').fontSize(11).fillColor(C.amber).text('⚠ Статус: ПЛАН — ДО УЗГОДЖЕННЯ', ML + 14, statusY + 8, { width: W - 28 });
doc.font('R').fontSize(9).fillColor(C.gray)
   .text('Цей документ є технічним планом для узгодження перед початком реалізації. Після підтвердження — перетворюється на технічне завдання.', ML + 14, statusY + 26, { width: W - 28, lineGap: 2 });
doc.y = statusY + 60;
doc.moveDown(0.4);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 0 — BMI FIX (виконано в поточній сесії)
// ════════════════════════════════════════════════════════════════════════════
h1('0. Що було доробленo у цій сесії (BMI)');

noteBox(
  'Аналіз попередньої сесії виявив розбіжність: scoreBMI() в health-score.js коректно ' +
  'застосовував норми 65+ (22–27), але getBMICategory() в bmi.js завжди ' +
  'відображав стандартні пороги (18.5–24.9). Виправлено у цій сесії.',
  C.green, '#f0fdf4'
);

doc.moveDown(0.2);
h2('Що було виправлено:', C.green);

bullet('getBMICategory(bmi, age) — додано параметр age. Для 65+ норма 22–27, дефіцит < 19.');
bullet('renderBMI() — відображення ідеальної ваги тепер вираховується з вікових порогів (22–27 для 65+).');
bullet('renderBMI() — для 65+ показується синя мітка "Норми ІМТ скориговані для 65+ (22–27)".');
bullet('ui.uk.js та ui.ru.js — додано ключ b-age-note-65.');
bullet('bmi.test.js — додано 12 нових тестів для 65+ категорій з граничними значеннями.');
bullet('Усі 412/412 тестів зелені після виправлень (було 412, тест-suite розширено).');

doc.moveDown(0.2);
body('Тест-матриця (до/після для 65+):');
const bmiMatrixY = doc.y;
[['ІМТ', 'Вік < 65 (стандарт)', 'Вік 65+ (скоригований)'],
 ['18.5', 'Норма', 'Дефіцит маси'],
 ['22.0', 'Норма', 'Норма'],
 ['26.0', 'Надмірна вага ← ПОМИЛКА', 'Норма ✓ ← ВИПРАВЛЕНО'],
 ['27.0', 'Надмірна вага', 'Норма (верхня межа)'],
 ['30.0', 'Ожиріння І ст.', 'Надмірна вага'],
].forEach((row, ri) => {
  const ry = doc.y;
  const bg = ri === 0 ? C.navy : (ri % 2 === 0 ? C.white : C.light);
  doc.rect(ML, ry, W, 16).fill(bg);
  const cols = [50, 190, 230];
  const rowHasWrong = row.some(c => c.includes('← ПОМИЛКА'));
  const rowHasFixed = row.some(c => c.includes('← ВИПРАВЛЕНО'));
  row.forEach((cell, ci) => {
    const isWrong = cell.includes('← ПОМИЛКА');
    const isFixed = cell.includes('← ВИПРАВЛЕНО');
    const fg = ri === 0 ? C.white : isWrong ? C.red : isFixed ? C.green : C.black;
    doc.font(ri === 0 || ci === 0 ? 'B' : 'R').fontSize(8.5).fillColor(fg)
       .text(cell.replace(' ← ПОМИЛКА','').replace(' ← ВИПРАВЛЕНО',' ✓'), ML + (ci === 0 ? 4 : cols[ci-1] + 4), ry + 4, { width: (ci === 0 ? cols[0] : cols[ci] - cols[ci-1]) - 8, lineBreak: false });
  });
  if (ri > 0 && (rowHasWrong || rowHasFixed)) {
    const markText = row[2].includes('ВИПРАВЛЕНО') ? '← ВИПРАВЛЕНО' : row[1].includes('ПОМИЛКА') ? '← ПОМИЛКА' : '';
    const markColor = markText.includes('ВИПРАВЛЕНО') ? C.green : C.red;
    if (markText) {
      doc.font('B').fontSize(7).fillColor(markColor)
         .text(markText, ML + cols[1] + 4 + doc.font('R').fontSize(8.5).widthOfString(row[2].split(' ←')[0]) + 4, ry + 5, { lineBreak: false });
    }
  }
  doc.rect(ML, ry, W, 16).lineWidth(0.3).strokeColor(C.border).stroke();
  doc.y = ry + 16;
});
doc.moveDown(0.6);

doc.addPage();

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1 — ПРОБЛЕМА
// ════════════════════════════════════════════════════════════════════════════
h1('1. Проблема: крокомір вбивається системою Android');

noteBox(
  'Поточна реалізація (features/steps/index.js) слухає подію devicemotion через ' +
  'window.addEventListener("devicemotion", handleMotion). Коли Android вбиває процес ' +
  'WebView або переводить додаток у "deep sleep" — слухач зникає, лічильник обнуляється. ' +
  'Користувач втрачає всі кроки за день. Це неприйнятно для модуля Активності (10% від Індексу Здоров\'я).',
  C.red, '#fef2f2'
);

doc.moveDown(0.2);
h2('Симптоми проблеми:');
bullet('Лічильник кроків обнуляється при відкритті інших додатків або блокуванні екрану.');
bullet('Android Doze mode (з Android 6+) призупиняє JS-процес WebView.');
bullet('Android 12+ агресивно вбиває фонові процеси без Foreground Service.');
bullet('На веб (PWA в браузері) — тільки поки вкладка активна. Браузер замороджує фонові вкладки.');

h2('Чому DeviceMotion не вирішення у фоні:');
bullet('devicemotion — браузерний API, прив\'язаний до JS-потоку WebView.');
bullet('WebView живе лише поки Android-процес активний.');
bullet('Без Foreground Service Android має право вбити процес у будь-який момент.');

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — РІШЕННЯ
// ════════════════════════════════════════════════════════════════════════════
h1('2. Технічне рішення: Android Foreground Service');

noteBox(
  'Android Foreground Service — сервіс з постійним системним сповіщенням. ' +
  'ОС гарантує, що процес НЕ БУДЕ ВБИТИЙ, поки сповіщення відображається. ' +
  'Використовується Google Fit, Samsung Health, Garmin та іншими фітнес-додатками.',
  C.blue, '#eff6ff'
);

doc.moveDown(0.2);
h2('Тип сенсора для кроків у нативному сервісі:');

const sensorY = doc.y;
const sensorCols = [180, 160, W - 340];
[['Сенсор', 'Тип', 'Переваги'],
 ['TYPE_STEP_COUNTER', 'Hardware', 'Апаратний лічильник, мінімальний заряд батареї, не скидається при фоні'],
 ['TYPE_STEP_DETECTOR', 'Hardware', 'Подія "один крок", менша точність при тривалому фоні'],
 ['Accelerometer + алгоритм', 'Software', 'Поточна реалізація — не працює у фоні'],
].forEach((row, ri) => {
  const ry = doc.y;
  const bg = ri === 0 ? C.navy : ri === 1 ? '#f0fdf4' : ri === 2 ? C.light : C.white;
  doc.rect(ML, ry, W, ri === 0 ? 16 : 20).fill(bg);
  let x = ML;
  row.forEach((cell, ci) => {
    const colW = ci === 0 ? sensorCols[0] : ci === 1 ? sensorCols[1] : sensorCols[2];
    const fg = ri === 0 ? C.white : ci === 0 ? C.navy : C.black;
    doc.font(ri === 0 || ci === 0 ? 'B' : 'R').fontSize(8.5).fillColor(fg)
       .text(cell, x + 4, ry + (ri === 0 ? 4 : 5), { width: colW - 8, lineBreak: false });
    x += colW;
  });
  doc.rect(ML, ry, W, ri === 0 ? 16 : 20).lineWidth(0.3).strokeColor(C.border).stroke();
  doc.y = ry + (ri === 0 ? 16 : 20);
});
doc.moveDown(0.5);
body('Обраний підхід: TYPE_STEP_COUNTER — апаратний лічильник чіпа, не залежить від JS-процесу.', C.green);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — АНАЛОГІЯ З НОТИФІКАЦІЯМИ
// ════════════════════════════════════════════════════════════════════════════
doc.addPage();
h1('3. Аналогія: Foreground Service ≈ Нотифікації (вже реалізовано)');

body('Система нотифікацій HealthPro вже реалізує схожий патерн. Foreground Service повторює ту саму логіку на рівень нижче.', C.gray);
doc.moveDown(0.2);

const analogY = doc.y;
// Two-column layout
const col1W = (W - 20) / 2;
const col2W = (W - 20) / 2;

// Header
doc.roundedRect(ML, analogY, col1W, 18, 3).fill(C.blue);
doc.roundedRect(ML + col1W + 20, analogY, col2W, 18, 3).fill(C.purple);
doc.font('B').fontSize(9).fillColor(C.white)
   .text('Нотифікації (існуючий код)', ML + 8, analogY + 5, { lineBreak: false });
doc.font('B').fontSize(9).fillColor(C.white)
   .text('Foreground Service (новий)', ML + col1W + 28, analogY + 5, { lineBreak: false });
doc.y = analogY + 18;

const analogRows = [
  ['notifications.js → toggleMeasureReminder()', 'steps/index.js → toggleStepCounter()'],
  ['requestNotificationPermission()', 'ActivityRecognition.requestPermission()'],
  ['Modal: "Увімкнути нагадування?"', 'Modal: "Запустити крокомір у фоні?"'],
  ['ensureNotificationChannel()', 'startForegroundStepService()'],
  ['Persistent notification (нагадування)', 'Persistent notification (кроки: 2340/10000)'],
  ['cancelAllNotifications() → вимкнено', 'stopForegroundStepService() → вимкнено'],
  ['scheduleAllReminders() — перепланування', 'updateStepNotification(count, goal) — оновлення'],
  ['platform.js → notify() (абстракція)', 'platform.js → startStepService() (додати)'],
];

analogRows.forEach((row, ri) => {
  const ry = doc.y;
  const bg = ri % 2 === 0 ? C.light : C.white;
  doc.rect(ML, ry, col1W, 16).fill(bg);
  doc.rect(ML + col1W + 20, ry, col2W, 16).fill(bg);
  doc.font('R').fontSize(8).fillColor(C.black)
     .text(row[0], ML + 4, ry + 4, { width: col1W - 8, lineBreak: false });
  doc.font('R').fontSize(8).fillColor(C.purple)
     .text(row[1], ML + col1W + 24, ry + 4, { width: col2W - 8, lineBreak: false });
  doc.rect(ML, ry, col1W, 16).lineWidth(0.3).strokeColor(C.border).stroke();
  doc.rect(ML + col1W + 20, ry, col2W, 16).lineWidth(0.3).strokeColor(C.border).stroke();
  // Arrow
  doc.font('B').fontSize(10).fillColor(C.gray)
     .text('→', ML + col1W + 6, ry + 3, { lineBreak: false });
  doc.y = ry + 16;
});
doc.moveDown(0.5);

noteBox(
  'Ключова ідея: Foreground Service для кроків — це те саме, що нотифікації для ліків. ' +
  'Обидва показують постійне сповіщення, обидва живуть у фоні, обидва потребують явного дозволу користувача.',
  C.teal, '#f0fdfa'
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4 — ПОТОКИ УЗГОДЖЕННЯ КОРИСТУВАЧА
// ════════════════════════════════════════════════════════════════════════════
h1('4. Потоки узгодження користувача (Permission Flows)');

h2('4а. Узгодження роботи з крокоміром (ACTIVITY_RECOGNITION)');
noteBox('Android 10+ вимагає явного дозволу android.permission.ACTIVITY_RECOGNITION для доступу до сенсорів кроків. Без нього — TYPE_STEP_COUNTER недоступний.', C.amber, '#fefce8');

doc.moveDown(0.2);
body('Потік — аналогія з notif-perm.js:');

const flow1 = [
  ['1', 'Користувач натискає перемикач "Відстеження активності"', C.blue],
  ['2', 'Показується модальне вікно Modal-A (div#stepPermModal)', C.blue],
  ['3', 'Текст: "HealthPro хоче рахувати ваші кроки через сенсор телефону. Дані зберігаються лише на пристрої."', C.gray],
  ['4', 'Кнопки: [Так, дозволити] / [Ні, дякую]', C.gray],
  ['5', 'При "Так" → ActivityRecognition.requestPermission() (native) / enableSteps() (web)', C.green],
  ['6', 'При відмові системи → toast "Дозвіл відхилено. Відкрити налаштування?" + openAppSettings()', C.red],
];
flow1.forEach(([n, text, color]) => {
  const y0 = doc.y;
  doc.circle(ML + 8, y0 + 7, 7).fill(color);
  doc.font('B').fontSize(7).fillColor(C.white).text(n, ML + 5, y0 + 4, { lineBreak: false });
  doc.font('R').fontSize(9).fillColor(C.black).text(text, ML + 22, y0, { width: W - 22, lineGap: 1.5 });
  doc.moveDown(0.15);
});

doc.moveDown(0.3);
h2('4б. Узгодження роботи у фоні (Foreground Service Consent)');
noteBox('Окреме модальне вікно пояснює, що додаток буде відображати постійне системне сповіщення і споживати трохи більше батареї. Аналог — disclaimer при першому запуску.', C.purple, '#f5f3ff');

doc.moveDown(0.2);
const flow2 = [
  ['1', 'Після отримання ACTIVITY_RECOGNITION → показується Modal-B (div#stepFgModal)', C.purple],
  ['2', 'Текст: "Для точного підрахунку кроків у фоні HealthPro запустить невидимий сервіс. Ви побачите системне сповіщення \'HealthPro: рахую кроки\'. Батарея: +1–3% на день."', C.gray],
  ['3', 'Кнопки: [Зрозуміло, запустити] / [Тільки коли активний]', C.gray],
  ['4', 'При "Запустити" → ForegroundStepPlugin.start(goal, notifTitle, notifText)', C.green],
  ['5', 'При "Тільки активний" → enableSteps() зі звичайним devicemotion (існуюча логіка)', C.amber],
  ['6', 'Вибір зберігається у state.settings.stepMode: "foreground" | "active-only"', C.teal],
];
flow2.forEach(([n, text, color]) => {
  const y0 = doc.y;
  doc.circle(ML + 8, y0 + 7, 7).fill(color);
  doc.font('B').fontSize(7).fillColor(C.white).text(n, ML + 5, y0 + 4, { lineBreak: false });
  doc.font('R').fontSize(9).fillColor(C.black).text(text, ML + 22, y0, { width: W - 22, lineGap: 1.5 });
  doc.moveDown(0.15);
});

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5 — КРОКИ РЕАЛІЗАЦІЇ
// ════════════════════════════════════════════════════════════════════════════
doc.addPage();
h1('5. Покрокова реалізація (6 кроків)');

stepBox(1, 'Android Маніфест та дозволи',
  'AndroidManifest.xml: додати FOREGROUND_SERVICE, FOREGROUND_SERVICE_HEALTH (Android 14+), ' +
  'ACTIVITY_RECOGNITION (Android 10+). Зареєструвати StepCounterService як <service> з ' +
  'android:foregroundServiceType="health".',
  C.blue);

stepBox(2, 'Нативний Foreground Service (StepCounterService.java)',
  'Клас StepCounterService extends Service implements SensorEventListener. ' +
  'startForeground(NOTIF_ID, buildNotification(steps, goal)) — постійне сповіщення. ' +
  'Sensor TYPE_STEP_COUNTER (апаратний, ощадливий по батареї). ' +
  'Надсилає кроки назад у JS через intent/broadcast або Capacitor Plugin bridge.',
  C.teal);

stepBox(3, 'Capacitor Plugin Bridge (ForegroundStepPlugin.java)',
  'Plugin з методами: @PluginMethod start(goal, title, text), stop(), getSteps(), ' +
  'addListener("stepUpdate", handler). Реєстрація у MainActivity.java. ' +
  'Аналогія: так само як LocalNotifications plugin, але для кроків.',
  C.purple);

stepBox(4, 'Оновлення platform.js (абстракція)',
  'Додати функції: startStepService(goal), stopStepService(), getStepCount() (з сервісу), ' +
  'onStepUpdate(handler) (real-time listener). Web fallback — devicemotion (існуюча логіка).',
  C.amber);

stepBox(5, 'Оновлення features/steps/index.js (JS-логіка)',
  'toggleStepCounter() → requestActivityPermission() → showStepPermModal() → ' +
  'showFgConsentModal() → enableSteps(). ' +
  'enableSteps() з режимом: якщо native && stepMode==="foreground" → startStepService(); ' +
  'інакше → window.devicemotion (існуюча). ' +
  'Новий метод restoreSteps() → читає з сервісу при appResume.',
  C.green);

stepBox(6, 'UI: 2 нові модальні вікна + налаштування',
  'div#stepPermModal — запит ACTIVITY_RECOGNITION (аналог nt-perm modal). ' +
  'div#stepFgModal — пояснення Foreground Service (аналог disclaimer). ' +
  'Нова опція у Settings: "Режим крокоміра" [Фоновий / Тільки активний]. ' +
  'Постійне сповіщення: "HealthPro 🦶 2 340 / 10 000 кроків" з кнопкою "Стоп".',
  C.red);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 6 — ФАЙЛИ
// ════════════════════════════════════════════════════════════════════════════
h1('6. Файли для створення / зміни');

doc.moveDown(0.1);
// Header
const fHy = doc.y;
doc.rect(ML, fHy, W, 16).fill(C.navy);
doc.font('B').fontSize(8.5).fillColor(C.white).text('Файл / Клас', ML + 4, fHy + 4, { width: 210, lineBreak: false });
doc.font('B').fontSize(8.5).fillColor(C.white).text('Дія', ML + 220, fHy + 4, { width: 50, lineBreak: false });
doc.font('B').fontSize(8.5).fillColor(C.white).text('Опис', ML + 275, fHy + 4, { width: W - 280, lineBreak: false });
doc.y = fHy + 16;

fileRow('android/.../StepCounterService.java', 'НОВИЙ', 'Foreground Service з TYPE_STEP_COUNTER');
fileRow('android/.../ForegroundStepPlugin.java', 'НОВИЙ', 'Capacitor Plugin Bridge (start/stop/getSteps/onUpdate)');
fileRow('android/.../MainActivity.java', 'ЗМІНА', 'Реєстрація ForegroundStepPlugin');
fileRow('android/.../AndroidManifest.xml', 'ЗМІНА', 'FOREGROUND_SERVICE, ACTIVITY_RECOGNITION, <service>');
fileRow('src/core/platform.js', 'ЗМІНА', 'startStepService(), stopStepService(), onStepUpdate()');
fileRow('src/features/steps/index.js', 'ЗМІНА', 'Логіка вибору режиму, виклик нативного сервісу, модалі');
fileRow('index.html', 'ЗМІНА', 'div#stepPermModal, div#stepFgModal (2 нових модальних вікна)');
fileRow('src/i18n/ui.uk.js + ui.ru.js', 'ЗМІНА', '8+ нових ключів для модальних вікон і сповіщень');
fileRow('src/core/state.js', 'ЗМІНА', 'state.settings.stepMode: "foreground" | "active-only"');
fileRow('tests/foreground-step.test.js', 'НОВИЙ', 'Unit-тести для нової логіки enableSteps() / requestPermission()');

doc.moveDown(0.5);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 7 — РИЗИКИ ТА PWA
// ════════════════════════════════════════════════════════════════════════════
h1('7. Ризики та особливості');

h2('7а. iOS та Web (PWA)', C.amber);
noteBox(
  'Foreground Service — Android-only. На iOS та Web продовжує працювати devicemotion (існуюча логіка). ' +
  'iOS Background Processing API (BGTaskScheduler) має жорсткі обмеження — не підходить для real-time підрахунку кроків. ' +
  'Рекомендація для iOS: CoreMotion + CMPedometer через окремий Capacitor plugin (за межами цього плану).',
  C.amber, '#fefce8'
);

h2('7б. Споживання батареї', C.red);
bullet('TYPE_STEP_COUNTER: апаратний чіп, ~1–3% батареї на день. Прийнятно.');
bullet('Foreground Service без постійних обчислень — лише слухає hardware event.');
bullet('Оновлення сповіщення при кожному кроці — потенційний overhead. Throttle: оновлювати кожні 10 кроків.');

h2('7в. Android версії', C.teal);
bullet('Android 8+ (API 26): Foreground Service — обов\'язково через startForegroundService().');
bullet('Android 10+ (API 29): ACTIVITY_RECOGNITION — обов\'язковий дозвіл.');
bullet('Android 12+ (API 31): FOREGROUND_SERVICE permission у Manifest.');
bullet('Android 14+ (API 34): FOREGROUND_SERVICE_HEALTH — тип сервісу обов\'язковий.');

// ════════════════════════════════════════════════════════════════════════════
// SECTION 8 — ОЦІНКА
// ════════════════════════════════════════════════════════════════════════════
doc.addPage();
h1('8. Оцінка складності та часу');

const estimY = doc.y;
doc.roundedRect(ML, estimY, W, 130, 8).fill(C.light);

const estimItems = [
  ['Крок 1: Маніфест + дозволи', '2 год', C.green, 'Просто — додати рядки в XML'],
  ['Крок 2: StepCounterService.java', '6–8 год', C.amber, 'Середній — Java + Android Sensor API'],
  ['Крок 3: ForegroundStepPlugin.java', '4–6 год', C.amber, 'Середній — Capacitor plugin boilerplate'],
  ['Крок 4: platform.js', '2 год', C.green, 'Просто — абстракція за патерном існуючого коду'],
  ['Крок 5: steps/index.js + модалі', '4–5 год', C.amber, 'Середній — потоки дозволів, режими'],
  ['Крок 6: UI (2 модальних вікна)', '2–3 год', C.green, 'Аналог до існуючих модальних вікон'],
  ['Тести + QA', '3–4 год', C.amber, 'Vitest mock + тест на реальному пристрої'],
];

estimItems.forEach(([task, time, color, note], i) => {
  const ey = estimY + 10 + i * 17;
  doc.font('R').fontSize(9).fillColor(C.black).text(task, ML + 10, ey, { width: 200, lineBreak: false });
  doc.roundedRect(ML + 215, ey - 1, 55, 13, 3).fill(color);
  doc.font('B').fontSize(8).fillColor(C.white).text(time, ML + 218, ey + 2, { width: 50, lineBreak: false });
  doc.font('R').fontSize(8).fillColor(C.gray).text(note, ML + 278, ey, { width: W - 285, lineBreak: false });
});

doc.y = estimY + 140;

// Total
doc.roundedRect(ML, doc.y, W, 36, 6).fill(C.navy);
const totY = doc.y;
doc.font('B').fontSize(11).fillColor(C.white)
   .text('Загальна оцінка:', ML + 14, totY + 8, { lineBreak: false });
doc.font('B').fontSize(14).fillColor('#4ade80')
   .text('23–28 годин', ML + 170, totY + 5, { lineBreak: false });
doc.font('R').fontSize(9).fillColor('#cbd5e1')
   .text('(розробка + тестування на реальному пристрої)', ML + 310, totY + 10, { lineBreak: false });
doc.y = totY + 44;
doc.moveDown(0.4);

// ════════════════════════════════════════════════════════════════════════════
// SECTION 9 — ПОДАЛЬШИЙ РОЗВИТОК ЛОГІКИ (пропозиції)
// ════════════════════════════════════════════════════════════════════════════
h1('9. Подальший розвиток логіки (пропозиції агента)');

const proposals = [
  ['🏃', 'Автоматична класифікація активності',
   'Розрізняти ходьбу / біг / підйом сходами за частотою акселерації. ' +
   'Кожна активність дає різні бали (біг: ×1.5 від кроків). TYPE_STEP_COUNTER + TYPE_ACCELEROMETER combo.'],
  ['💓', 'Кореляція кроків і пульсу',
   'Якщо кроків > 8000 AND пульс > 90 → рекомендація "Чудова денна активність". ' +
   'Якщо кроків < 1000 AND пульс > 100 → попередження "Підвищений пульс без активності".'],
  ['📅', 'Тижнева статистика кроків',
   'Зберігати 7-денну історію кроків у DB (stepCount-YYYY-MM-DD). ' +
   'Відображати в аналітиці: мінімальний, максимальний, середній день.'],
  ['🎯', 'Динамічна ціль кроків',
   'Автоматично пропонувати ціль на основі попереднього тижня: якщо mid-week avg < 5000 → пропонуємо 6000 замість 10000.'],
  ['🔔', 'Мотиваційні нотифікації від сервісу',
   'Foreground Service може надсилати нотифікації: "Ви пройшли 50% цілі!", "Ще 2000 кроків до рекорду!". ' +
   'Аналогія: pill notifications, але тригер — progress events від сервісу.'],
  ['🌡', 'Вплив активності на індекс здоров\'я — підсилення',
   'При регулярності (7 днів поспіль > 8000 кроків) — бонус +5 до Activity module. ' +
   'Враховує не лише сьогодні, але і тренд.'],
];

proposals.forEach(([icon, title, desc]) => {
  const py = doc.y;
  doc.roundedRect(ML, py, W, 2).fill(C.border); // top rule
  doc.moveDown(0.1);
  doc.font('B').fontSize(10).fillColor(C.navy).text(icon + ' ' + title, ML + 4, doc.y, { width: W });
  doc.font('R').fontSize(9).fillColor(C.gray).text(desc, ML + 4, doc.y + 2, { width: W - 8, lineGap: 2 });
  doc.moveDown(0.4);
});

// ════════════════════════════════════════════════════════════════════════════
// FOOTER on last page
// ════════════════════════════════════════════════════════════════════════════
doc.moveDown(0.5);
rule(C.navy, 1);
doc.moveDown(0.3);
doc.font('R').fontSize(8).fillColor(C.gray)
   .text(
     'HealthPro v4.1+ · Крокомір Foreground Service Plan · Статус: ДО УЗГОДЖЕННЯ · ' +
     '04 травня 2026 · Реалізація починається після підтвердження плану.',
     ML, doc.y, { width: W, align: 'center' }
   );

doc.end();
console.log('PDF згенеровано:', OUT);
