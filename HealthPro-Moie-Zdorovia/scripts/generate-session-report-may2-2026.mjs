import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', '..', 'HealthPro_Session_May2026_2_Report.pdf');

const FONT_REG  = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const doc = new PDFDocument({ margin: 50, size: 'A4' });
doc.pipe(fs.createWriteStream(OUT));

doc.registerFont('Regular', FONT_REG);
doc.registerFont('Bold',    FONT_BOLD);

const C = {
  navy:   '#1e3a5f',
  blue:   '#2563eb',
  green:  '#16a34a',
  amber:  '#d97706',
  gray:   '#64748b',
  light:  '#f1f5f9',
  white:  '#ffffff',
  black:  '#0f172a',
  border: '#cbd5e1',
  purple: '#7c3aed',
};

const W  = doc.page.width - 100;
const ML = 50;

function rule(color = C.border, h = 1) {
  doc.save()
     .moveTo(ML, doc.y).lineTo(ML + W, doc.y)
     .lineWidth(h).strokeColor(color).stroke()
     .restore()
     .moveDown(0.3);
}

function h1(text) {
  doc.moveDown(0.4)
     .font('Bold').fontSize(16).fillColor(C.navy)
     .text(text, ML, doc.y, { width: W })
     .moveDown(0.2);
  rule(C.navy, 2);
  doc.moveDown(0.4);
}

function h2(text, color = C.blue) {
  doc.moveDown(0.4)
     .font('Bold').fontSize(11).fillColor(color)
     .text(text, ML, doc.y, { width: W })
     .moveDown(0.2);
}

function body(text) {
  doc.font('Regular').fontSize(10).fillColor(C.black)
     .text(text, ML, doc.y, { width: W, lineGap: 2 })
     .moveDown(0.3);
}

function bullet(text) {
  doc.font('Regular').fontSize(10).fillColor(C.black)
     .text('• ' + text, ML + 14, doc.y, { width: W - 14, lineGap: 2 })
     .moveDown(0.2);
}

function badge(label, value, x, y, bw, bg) {
  doc.save()
     .roundedRect(x, y, bw, 54, 6).fillColor(bg).fill()
     .font('Bold').fontSize(22).fillColor(C.white)
     .text(String(value), x, y + 7, { width: bw, align: 'center' })
     .font('Regular').fontSize(8).fillColor(C.white)
     .text(label, x, y + 36, { width: bw, align: 'center' })
     .restore();
}

function tableRow(cols, widths, isHeader = false) {
  const startX = ML;
  const rowH = isHeader ? 22 : 20;
  const y = doc.y;
  doc.save()
     .rect(startX, y, W, rowH)
     .fillColor(isHeader ? C.navy : C.light).fill()
     .restore();
  let cx = startX + 5;
  cols.forEach((col, i) => {
    doc.font(isHeader ? 'Bold' : 'Regular')
       .fontSize(9)
       .fillColor(isHeader ? C.white : C.black)
       .text(col, cx, y + 5, { width: widths[i] - 10, lineBreak: false });
    cx += widths[i];
  });
  doc.y = y + rowH + 2;
}

// ─── ОБКЛАДИНКА ──────────────────────────────────────────────────────────────

doc.save().rect(0, 0, doc.page.width, 200).fillColor(C.navy).fill().restore();

doc.font('Bold').fontSize(30).fillColor(C.white)
   .text('HealthPro', ML, 42, { width: W, align: 'center' });
doc.font('Regular').fontSize(13).fillColor('#93c5fd')
   .text('Моє Здоров\'я', ML, 80, { width: W, align: 'center' });

doc.save()
   .moveTo(ML + W * 0.3, 106).lineTo(ML + W * 0.7, 106)
   .lineWidth(1).strokeColor('#3b82f6').stroke()
   .restore();

doc.font('Bold').fontSize(12).fillColor(C.white)
   .text('Звіт сесії — Баг #4, Іконка, Видалення PWA', ML, 116, { width: W, align: 'center' });
doc.font('Regular').fontSize(10).fillColor('#bfdbfe')
   .text('Дата: 4 травня 2026 р.', ML, 140, { width: W, align: 'center' });

// Бейджі
const bY  = 215;
const bW  = 100;
const gap = (W - 4 * bW) / 3;
badge('Тестів пройшло', '475', ML,                      bY, bW, C.green);
badge('Файлів змінено', '8',   ML + bW + gap,            bY, bW, C.blue);
badge('Тестів оновлено', '5',  ML + 2 * (bW + gap),      bY, bW, C.amber);
badge('Багів виправлено', '3', ML + 3 * (bW + gap),      bY, bW, C.purple);

doc.y = bY + 54 + 22;

// ─── РОЗДІЛ 1: КОНТЕКСТ ──────────────────────────────────────────────────────

h1('1  Контекст сесії');
body('Попередня сесія (квітень 2026) виправила баги #1–3 кроковміра: розбіжність даних штовхання/додатка, хибні розрахунки кроків по екрану, зупинка сервісу. Після реального тестування виявлено баг #4 — дані БД перезаписували живий сервіс при відкритті додатку. Також прийнято рішення остаточно видалити PWA-шар і замінити іконку сповіщення.');

// ─── РОЗДІЛ 2: БАГ #4 ────────────────────────────────────────────────────────

h1('2  Баг #4 — Пріоритет даних сервісу');

h2('2.1 Симптом');
body('Після перезавантаження: BootReceiver запускав сервіс, сервіс нараховував, наприклад, 150 кроків. Користувач відкривав додаток — відображалося 0 (з БД), а startStepService() скидав лічильник сервісу до значення з БД.');

h2('2.2 Першопричина');
body('enableSteps() та restoreSteps() завжди читали stepCount з БД і передавали це значення в startStepService() як initialSteps — навіть якщо сервіс вже працював і мав актуальніші дані.');

h2('2.3 Рішення (src/features/steps/index.js)');
bullet('Спочатку викликаємо getServiceStatus().');
bullet('Якщо running=true → беремо кроки З СЕРВІСУ, НЕ перезапускаємо, пишемо в БД.');
bullet('Якщо running=false → стартуємо з даними БД як initialSteps.');
bullet('restoreSteps(): аналогічна логіка + встановлює stepEnabled=true і підключає listener.');
bullet('Дані сервісу ЗАВЖДИ мають пріоритет над локальною БД.');

// ─── РОЗДІЛ 3: ІКОНКА ────────────────────────────────────────────────────────

h1('3  Оновлення іконки сповіщення');

h2('3.1 Вимоги Android');
body('Іконка статус-бару повинна бути: повністю біла на прозорому фоні, розміром 24×24 dp, без кольорових заливок (Android сам забарвлює під тему).');

h2('3.2 Зміни');
bullet('Файл: android/app/src/main/res/drawable/ic_stat_notification.xml');
bullet('Формат: Android Vector Drawable (масштабується без втрат на будь-якій щільності).');
bullet('Силует: людина що йде (Material Design "directions_walk") — чистий білий контур.');
bullet('StepCounterService.java залишився незмінним — вже посилався на R.drawable.ic_stat_notification.');

// ─── РОЗДІЛ 4: ВИДАЛЕННЯ PWA ─────────────────────────────────────────────────

h1('4  Видалення PWA');

h2('4.1 Мотивація');
body('Додаток є нативним Android-застосунком через Capacitor. PWA-функціонал (service worker, install banner, offline bar) більше не потрібен і створював зайвий код.');

h2('4.2 Змінені файли');
const w4 = [W * 0.35, W * 0.65];
tableRow(['Файл', 'Що видалено'], w4, true);
[
  ['index.html',                'apple-mobile-web-app-* meta, <link rel="manifest">, installBanner, updateBanner, offlineBar, "PWA" у версії'],
  ['src/app.js',                'Імпорт installApp/registerSW/applyUpdate/setupOnlineIndicator, виклики, дії ACTIONS'],
  ['src/core/constants.js',     '"PWA" з APP_BUILD_LABEL'],
  ['src/core/storage.js',       'Коментар "web/PWA"'],
  ['src/core/platform.js',      'Коментар "web (PWA)"'],
  ['src/features/pwa/index.js', 'Зачищено до порожньої заглушки (файл збережено для структури)'],
].forEach(r => tableRow(r, w4));

doc.moveDown(0.5);

// ─── РОЗДІЛ 5: ЗВЕДЕНА ТАБЛИЦЯ ───────────────────────────────────────────────

h1('5  Зведена таблиця змін');

const w5 = [W * 0.40, W * 0.13, W * 0.47];
tableRow(['Файл', 'Статус', 'Зміни'], w5, true);
[
  ['src/features/steps/index.js',        'ОНОВЛЕНО', 'Баг #4: enableSteps + restoreSteps — пріоритет сервісу'],
  ['android/.../ic_stat_notification.xml','ОНОВЛЕНО', 'Силует людини що йде, білий Vector Drawable'],
  ['index.html',                          'ОНОВЛЕНО', 'Видалено PWA-мета, банери, offline-bar, "PWA" у версії'],
  ['src/app.js',                          'ОНОВЛЕНО', 'Видалено імпорти PWA, registerSW, setupOnlineIndicator'],
  ['src/core/constants.js',              'ОНОВЛЕНО', '"PWA" видалено з APP_BUILD_LABEL'],
  ['src/features/pwa/index.js',          'ЗАЧИЩЕНО', 'Вміст видалено, файл збережено'],
  ['tests/foreground-step.test.js',      'ОНОВЛЕНО', '5 тестів оновлено під нову логіку'],
  ['replit.md',                          'ОНОВЛЕНО', 'Архітектура кроковміра, Баг #4, історія сесій'],
].forEach(r => tableRow(r, w5));

doc.moveDown(0.5);

// ─── РОЗДІЛ 6: ТЕСТИ ─────────────────────────────────────────────────────────

h1('6  Тести (Vitest 4.1.5)');

h2('6.1 Підсумок');
body('15 тестових файлів — усі пройшли. 475 тестів — 475 зелених, 0 червоних. Час генерації ≈ 3.5 с.');

h2('6.2 Оновлені тести (foreground-step.test.js)');
const w6 = [W * 0.70, W * 0.30];
tableRow(['Назва тесту', 'Зміна'], w6, true);
[
  ['calls startStepService when service is NOT running',               'Мок: running=false'],
  ['registers addStepUpdateListener when service starts fresh',        'disableSteps() скидає стан'],
  ['falls back to active-only when service not running and start fails','Мок: running=false + fail'],
  ['service data has priority even when lower than DB count (Bug #4)', 'Нова логіка: 200 > 500'],
  ['does NOT override DB count → перейменовано на priority test',     'Перероблено концептуально'],
].forEach(r => tableRow(r, w6));

doc.moveDown(0.5);

// ─── ПІДВАЛ ───────────────────────────────────────────────────────────────────

const fY = doc.page.height - 40;
doc.save().rect(0, fY - 8, doc.page.width, 50).fillColor(C.navy).fill().restore();
doc.font('Regular').fontSize(8).fillColor(C.white)
   .text(
     'HealthPro · Android Native · Звіт сесії #2 (05.2026) · 475/475 тестів зелені',
     ML, fY,
     { width: W, align: 'center' }
   );

doc.end();
console.log('PDF збережено:', OUT);
