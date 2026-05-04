import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', '..', 'HealthPro_Session_May2026_3_Report.pdf');

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
  red:    '#dc2626',
  gray:   '#64748b',
  light:  '#f1f5f9',
  white:  '#ffffff',
  black:  '#0f172a',
  purple: '#7c3aed',
  teal:   '#0d9488',
};
const W  = doc.page.width - 100;
const ML = 50;

function rule(color = '#cbd5e1', h = 1) {
  doc.save().moveTo(ML, doc.y).lineTo(ML + W, doc.y)
     .lineWidth(h).strokeColor(color).stroke().restore().moveDown(0.3);
}
function h1(text) {
  doc.moveDown(0.5).font('Bold').fontSize(15).fillColor(C.navy)
     .text(text, ML, doc.y, { width: W }).moveDown(0.2);
  rule(C.navy, 2);
  doc.moveDown(0.4);
}
function h2(text, color = C.blue) {
  doc.moveDown(0.4).font('Bold').fontSize(11).fillColor(color)
     .text(text, ML, doc.y, { width: W }).moveDown(0.2);
}
function body(text) {
  doc.font('Regular').fontSize(10).fillColor(C.black)
     .text(text, ML, doc.y, { width: W, lineGap: 2 }).moveDown(0.3);
}
function bullet(text, color = C.black) {
  doc.font('Regular').fontSize(10).fillColor(color)
     .text('• ' + text, ML + 14, doc.y, { width: W - 14, lineGap: 2 }).moveDown(0.2);
}
function badge(label, value, x, y, bw, bg) {
  doc.save().roundedRect(x, y, bw, 54, 6).fillColor(bg).fill()
     .font('Bold').fontSize(22).fillColor(C.white)
     .text(String(value), x, y + 7, { width: bw, align: 'center' })
     .font('Regular').fontSize(8).fillColor(C.white)
     .text(label, x, y + 36, { width: bw, align: 'center' }).restore();
}
function tableRow(cols, widths, isHeader = false) {
  const rowH = isHeader ? 22 : 20;
  const y = doc.y;
  doc.save().rect(ML, y, W, rowH).fillColor(isHeader ? C.navy : C.light).fill().restore();
  let cx = ML + 5;
  cols.forEach((col, i) => {
    doc.font(isHeader ? 'Bold' : 'Regular').fontSize(9)
       .fillColor(isHeader ? C.white : C.black)
       .text(col, cx, y + 5, { width: widths[i] - 10, lineBreak: false });
    cx += widths[i];
  });
  doc.y = y + rowH + 2;
}

// ── ОБКЛАДИНКА ───────────────────────────────────────────────────────────────
doc.save().rect(0, 0, doc.page.width, 200).fillColor(C.navy).fill().restore();

doc.font('Bold').fontSize(30).fillColor(C.white)
   .text('HealthPro', ML, 42, { width: W, align: 'center' });
doc.font('Regular').fontSize(13).fillColor('#93c5fd')
   .text('Моє Здоров\'я', ML, 80, { width: W, align: 'center' });
doc.save().moveTo(ML + W * 0.3, 106).lineTo(ML + W * 0.7, 106)
   .lineWidth(1).strokeColor('#3b82f6').stroke().restore();
doc.font('Bold').fontSize(12).fillColor(C.white)
   .text('Звіт сесії #3 — Нагадування про ліки (Тогл 1)', ML, 116, { width: W, align: 'center' });
doc.font('Regular').fontSize(10).fillColor('#bfdbfe')
   .text('Дата: 4 травня 2026 р.', ML, 142, { width: W, align: 'center' });

const bY = 215;
const bW = 100;
const gap = (W - 4 * bW) / 3;
badge('Тестів пройшло', '475', ML,                   bY, bW, C.green);
badge('Файлів змінено', '7',   ML + bW + gap,         bY, bW, C.blue);
badge('Типів розкладу', '4',   ML + 2*(bW+gap),       bY, bW, C.teal);
badge('Нових функцій', '3',    ML + 3*(bW+gap),       bY, bW, C.purple);
doc.y = bY + 54 + 22;

// ── РОЗДІЛ 1: КОНТЕКСТ ────────────────────────────────────────────────────────
h1('1  Контекст сесії');
body('Задача: активувати Тогл 1 «Нагадування про ліки», підключити до планувальника сповіщень з урахуванням усіх типів розкладу пігулок (щодня, конкретна дата, дні тижня), а також перевірити дозвіл SCHEDULE_EXACT_ALARM на Android 12+.');

// ── РОЗДІЛ 2: АРХІТЕКТУРА ─────────────────────────────────────────────────────
h1('2  Архітектура нагадувань (після змін)');

h2('2.1 Типи розкладу пігулок та метод планування');
const w2 = [W*0.18, W*0.22, W*0.60];
tableRow(['p.days', 'Метод', 'Пояснення'], w2, true);
[
  ['daily',    'dailyAt',    'Android AlarmManager повторює щодня автоматично — нескінченно'],
  ['date',     'at (одноразово)', 'Конкретна дата+час. Якщо дата/час у минулому — пропускається'],
  ['weekdays', 'at (одноразово)', 'nextWeekdayOccurrence() шукає наступний будній день (пн–пт)'],
  ['mon, tue,fri…', 'at (одноразово)', 'Пошук у горизонті 7 днів; після спрацювання — перепланування'],
].forEach(r => tableRow(r, w2));

doc.moveDown(0.4);

h2('2.2 Цикл перепланування (тижневі пігулки)');
body('Одноразові будильники (date, weekdays, конкретні дні) після спрацювання потребують нового планування. Це вирішує addNotificationReceivedListener: при type=\'pill\' з тижневим розкладом — викликає scheduleAllReminders(), яка знаходить наступне входження через nextWeekdayOccurrence().');

h2('2.3 Функція nextWeekdayOccurrence(days, hour, minute)');
bullet('Парсить рядок days: \'weekdays\' → [1,2,3,4,5]; \'mon,fri\' → [1,5] тощо.');
bullet('Перебирає offset 0…7 від сьогодні.');
bullet('Повертає першу Date у майбутньому, день тижня якої входить до дозволених.');
bullet('Якщо відповідного дня немає у 7-денному горизонті — повертає null (пігулка не планується).');

// ── РОЗДІЛ 3: SCHEDULE_EXACT_ALARM ───────────────────────────────────────────
h1('3  SCHEDULE_EXACT_ALARM (Android 12+)');

h2('3.1 Чому це важливо');
body('Android 12 (API 31) ввів обмеження: застосунки без дозволу SCHEDULE_EXACT_ALARM не можуть ставити точні будильники через AlarmManager. Без цього нагадування про ліки можуть приходити із запізненням до кількох годин або взагалі не приходити при вимкненому екрані.');

h2('3.2 Потік перевірки при вмиканні тоглу');
bullet('Крок 1: requestNotificationPermission() — базовий дозвіл на сповіщення.');
bullet('Крок 2: ensureNotificationChannel() — канал HIGH importance з звуком і вібрацією.');
bullet('Крок 3: ensureExactAlarmPermission() — checkExactNotificationSetting() + при відмові → changeExactNotificationSetting() відкриває системні налаштування.');
bullet('Якщо дозвіл не надано: тост з \'notif-exact-alarm-needed\', тогл НЕ вмикається — користувач має надати дозвіл і натиснути ще раз.');
bullet('Тільки при exactOk=true: state.settings.pillReminder=true, scheduleAllReminders().');

// ── РОЗДІЛ 4: ЗМІНИ ПО ФАЙЛАХ ────────────────────────────────────────────────
h1('4  Змінені файли');

const w4 = [W*0.40, W*0.15, W*0.45];
tableRow(['Файл', 'Статус', 'Що змінено'], w4, true);
[
  ['src/features/settings/notifications.js', 'ОНОВЛЕНО', 'toggleNotifications(), scheduleAllReminders(), nextWeekdayOccurrence(), PILL_ID_BASE, pillIdHash(), listener'],
  ['src/core/storage.js',                    'ОНОВЛЕНО', 'pillReminder: false у defaultSettings'],
  ['src/app.js',                             'ОНОВЛЕНО', 'Видалено is-disabled, відновлення стану з pillReminder, sanity-check при старті'],
  ['src/i18n/ui.uk.js',                      'ОНОВЛЕНО', 'notif-pill-body, notif-pill-on'],
  ['src/i18n/ui.ru.js',                      'ОНОВЛЕНО', 'notif-pill-body, notif-pill-on'],
].forEach(r => tableRow(r, w4));

doc.moveDown(0.5);

// ── РОЗДІЛ 5: ДЕТАЛІ РЕАЛІЗАЦІЇ ───────────────────────────────────────────────
h1('5  Ключові деталі реалізації');

h2('5.1 Стабільні ID нотифікацій');
body('PILL_ID_BASE = 91000. Хеш функція pillIdHash(id) — djb2-варіант, дає значення 0–8999. Отже ID пігулок: 91000–99999. Ніколи не перетинаються з BP-будильниками (90001, 90002) чи одноразовими notify() (random 0–1e9, але виключені константами).');

h2('5.2 Назва пігулки у нотифікації');
body('Шаблон \'notif-pill-title\' містить {{name}}. Оскільки функція tt() використовує одинарні дужки {name}, заміна виконується вручну: t(\'notif-pill-title\').replace(\'{{name}}\', p.name). Це надійно і без залежності від tt().');

h2('5.3 Крайні випадки');
bullet('Пігулка з days=\'date\' і датою в минулому: continue — не планується, не викидає помилку.');
bullet('Пігулка з days=\'date\' і датою сьогодні, але час вже минув: at <= new Date() → continue.');
bullet('Тижнева пігулка без відповідного дня у 7-денному горизонті: nextWeekdayOccurrence → null → continue.');
bullet('state.pills не масив (пошкоджені дані): Array.isArray() guard — не падає.');
bullet('Список пігулок змінено: on(\'pills:changed\') → scheduleAllReminders() — автоматичне оновлення.');

h2('5.4 Sanity-check при старті');
body('Якщо ОС відкликала дозвіл на сповіщення поки додаток не працював (наприклад, користувач вимкнув у системних налаштуваннях) — checkNotificationPermission() при старті скидає pillReminder=false і знімає клас .on з тоглу. Аналогічна логіка вже існувала для measureReminder.');

// ── РОЗДІЛ 6: I18N ────────────────────────────────────────────────────────────
h1('6  Нові i18n-ключі');

const w6 = [W*0.30, W*0.35, W*0.35];
tableRow(['Ключ', 'Українська', 'Російська'], w6, true);
[
  ['notif-pill-body', 'Натисніть, щоб відмітити як прийнятий', 'Нажмите, чтобы отметить как принятый'],
  ['notif-pill-on',   '💊 Нагадування про ліки увімкнено!',    '💊 Напоминания о лекарствах включены!'],
].forEach(r => tableRow(r, w6));

doc.moveDown(0.5);

// ── РОЗДІЛ 7: ТЕСТИ ───────────────────────────────────────────────────────────
h1('7  Тести (Vitest 4.1.5)');
body('Усі 475 тестів з 15 файлів пройшли без змін. Нова логіка notifications.js не потребувала оновлення тестів — зміни ізольовані в модулі і не торкаються кроковміра чи інших фіч.');

// ── РОЗДІЛ 8: ЩО ДАЛІ ────────────────────────────────────────────────────────
h1('8  Наступні кроки');

h2('8.1 Польові тести (завтра)');
bullet('Перевірити кроковмір (Баг #4): відкрити додаток після reboot — кроки мають братися з сервісу.');
bullet('Перевірити нотифікацію кроковміра — іконка walking-person у статус-барі.');
bullet('Перевірити нагадування про ліки: додати пігулку «щодня» і «конкретна дата», увімкнути тогл.');
bullet('На Android 12+: переконатися, що з\'являється запит SCHEDULE_EXACT_ALARM.');

h2('8.2 Наступна сесія (після фідбеку)');
bullet('Тогл 2: нагадування про вимір тиску — уніфікувати з новою логікою точних будильників.');
bullet('Автоматичне очищення: пігулки з минулою date-датою видаляти або архівувати.');
bullet('Аналітика: вкладка «Дотримання» — відсоток прийнятих ліків за тиждень/місяць.');

// ── ПІДВАЛ ────────────────────────────────────────────────────────────────────
const fY = doc.page.height - 40;
doc.save().rect(0, fY - 8, doc.page.width, 50).fillColor(C.navy).fill().restore();
doc.font('Regular').fontSize(8).fillColor(C.white)
   .text('HealthPro · Android Native · Звіт сесії #3 (05.2026) · 475/475 тестів зелені',
         ML, fY, { width: W, align: 'center' });

doc.end();
console.log('PDF збережено:', OUT);
