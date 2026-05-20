# HealthPro · Сесія v5.3.22 → v5.3.23
## Технічне завдання для агента

---

## ПРАВИЛА СЕСІЇ (обов'язково читати перед стартом)

1. **Виконувати блоки СТРОГО по черзі.** Не переходити до наступного блоку без підтвердження користувача.
2. **НЕ робити `git commit` до отримання явного дозволу** ("можеш комітити").
3. **Після кожного блоку** — показати три команди і дочекатись відповіді:
   ```bash
   npm test
   git diff --stat
   grep -n "конкретний рядок" файл.js
   ```
4. **Не додумувати.** Якщо задача незрозуміла — питати, не імпровізувати.
5. **Не чіпати файли** що не вказані в задачі.
6. **Шляхи файлів у звіті** — тільки ті що перевірені через `ls` або `grep`.

---

## БЛОК 1 — PDF звіт: критичні виправлення
### Задачі: PDF-i18n, PDF-days, PDF-dose, PDF-gender

---

### PDF-1 · Дні тижня — українська мова

**Файл:** `src/features/export/pdf-report.js`

**Проблема:** У таблиці ліків дні тижня відображаються російською:
`"Вторник, Четверг, Суббота, Воскресенье"`

**Виправлення:**
Замість прямого рядка — використовувати вже існуючу функцію `getDayName()` з `src/features/meds/index.js`. Вона вже має i18n підтримку.

```js
// Імпортувати:
import { getDayName } from '../meds/index.js';

// Використовувати замість p.days напряму:
getDayName(p)  // повертає локалізований рядок
```

**Перевірка після:**
```bash
grep -n "getDayName" src/features/export/pdf-report.js
```

---

### PDF-2 · Одиниця дози — "мг"

**Файл:** `src/features/export/pdf-report.js`

**Проблема:** У таблиці ліків дозування без одиниці: `"50"`, `"1200"`.

**Виправлення:**
Поле `p.dose` вже містить одиницю якщо користувач ввів її. Але якщо ні — placeholder має підказувати. Перевірити де в шаблоні відображається доза і чи не обрізається одиниця.

Якщо `p.dose` не містить одиниці — не додавати автоматично (бо невідомо мг чи мл).
Замість цього: переконатись що placeholder поля "Дозування" в `index.html` містить `'напр. 50 мг'` — це вже має бути зроблено в v5.3.20 (MED-1).

**Перевірка:**
```bash
grep -n "placeholder" index.html | grep -i "доз"
grep -n "p.dose" src/features/export/pdf-report.js
```

---

### PDF-3 · Стать пацієнта — показувати текстом

**Файл:** `src/features/export/pdf-report.js`

**Проблема:** Стать відображається як `"–"` замість `"Чоловіча"` / `"Жіноча"`.

**Виправлення:**
```js
// Знайти де використовується settings.gender і замінити на:
const genderLabel = settings.gender === 'm'
  ? t('pr-gender-male')    // або прямо: state.lang === 'uk' ? 'Чоловіча' : 'Мужской'
  : settings.gender === 'f'
  ? t('pr-gender-female')
  : '—';
```

**Перевірка:**
```bash
grep -n "gender" src/features/export/pdf-report.js
```

---

### PDF-4 · Мова звіту = мова інтерфейсу

**Файл:** `src/features/export/pdf-report.js`

**Проблема:** Звіт генерується мішаною мовою — частина UA, частина RU.

**Виправлення:**
Всі рядки у HTML-шаблоні звіту мають іти через `PDF_LABELS[state.lang]`.
`PDF_LABELS` вже існує в `src/i18n/pdf.js`.

Перевірити які рядки в шаблоні хардкодовані (не через `PDF_L.щось`) і перенести їх у `pdf.js` словник для обох мов (uk + ru).

```bash
# Знайти хардкодовані рядки в шаблоні:
grep -n "'Норма\|'Гіпертен\|'Лікар\|'Нотатки" src/features/export/pdf-report.js
```

Кожен знайдений рядок:
1. Додати в `PDF_LABELS.uk` та `PDF_LABELS.ru` у `src/i18n/pdf.js`
2. Замінити в шаблоні на `PDF_L.ключ`

**Перевірка:**
```bash
grep -n "PDF_L\." src/features/export/pdf-report.js | wc -l
# Число має збільшитись
```

---

### ✅ Після Блоку 1 — показати:
```bash
npm test
git diff --stat
```
**Чекати підтвердження перед Блоком 2.**

---

## БЛОК 2 — WHO-2 Модалка: виправлення змісту
### Задачі: WHO-fix-1, WHO-fix-2

---

### WHO-fix-1 · Виправити "<115/75 за ESC"

**Файл:** той де реалізована WHO-2 модалка (знайти через `grep -rn "115/75" src/`)

**Проблема:** Написано *"Норма при домашньому вимірі на 5 мм рт. ст. нижча (<115/75 за ESC)"* — це **неточно і заплутує** користувача.

**Правильне формулювання:**
```
Поріг гіпертензії при домашньому вимірі:
≥135/85 мм рт. ст. (замість ≥140/90 у клініці)

Тобто: якщо вдома тиск ≥135/85 — це вже гіпертензія,
навіть якщо в клініці було б "норма".
```

**Перевірка:**
```bash
grep -rn "115/75" src/
# Після виправлення — рядок не повинен знайтись
```

---

### WHO-fix-2 · "Elevated" → "Підвищений"

**Файл:** той самий файл WHO-2 модалки

**Проблема:** У таблиці порівняння ESC/AHA слово `"Elevated"` залишилось англійською.

**Виправлення:**
- UA: `"Підвищений (120–129/<80)"`
- RU: `"Повышенный (120–129/<80)"`

Якщо рядок хардкодований — перенести в i18n.
Якщо вже є i18n ключ — перевірити що обидві мови заповнені.

**Перевірка:**
```bash
grep -rn "Elevated" src/
# Після виправлення — не повинно знайтись
```

---

### ✅ Після Блоку 2 — показати:
```bash
npm test
git diff --stat
grep -rn "115/75" src/
grep -rn "Elevated" src/
```
**Чекати підтвердження перед Блоком 3.**

---

## БЛОК 3 — PDF: модальне вікно вибору звіту
### Задача: PDF-modal

---

### PDF-modal · Модалка вибору перед генерацією

**Контекст:** Зараз кнопка "Звіт" одразу генерує PDF за 30 днів без будь-якого вибору.

**Що потрібно:** Модальне вікно яке відкривається ПЕРЕД генерацією з трьома групами вибору:

**Вибір 1 — Період:**
- [ ] 7 днів
- [ ] 14 днів
- [x] 30 днів *(за замовчуванням)*
- [ ] 90 днів

**Вибір 2 — Формат:**
- [x] PDF для лікаря *(за замовчуванням)*
- [ ] CSV для Excel

**Вибір 3 — Секції PDF** *(активні тільки якщо обрано PDF)*:
- [x] Графік динаміки тиску
- [x] Журнал вимірів
- [x] Ліки та розклад
- [x] Adherence (прийом ліків)
- [x] Блок лікаря (підпис, нотатки)

> Усі секції увімкнені за замовчуванням.
> Якщо обрано CSV — група "Секції" ховається (display:none).

**Кнопки:**
- "Скасувати" — закрити модалку
- "Згенерувати звіт" — запустити з обраними параметрами

**Технічна реалізація:**
1. HTML модалки — додати в `index.html` (за зразком інших модалок проєкту)
2. Стилі — в `styles/modal.css` (вже є базові стилі модалок)
3. Логіка — в `src/features/export/modal.js` (файл вже існує, перевірити)
4. Передати параметри у функцію:
```js
generateDoctorReport({
  days: 30,           // з вибору Період
  format: 'pdf',      // 'pdf' або 'csv'
  sections: {
    chart: true,
    journal: true,
    meds: true,
    adherence: true,
    doctorBlock: true,
  }
})
```
5. `generateDoctorReport` та `exportCSV` мають приймати ці параметри замість хардкоду

**i18n — додати ключі в `ui.uk.js` та `ui.ru.js`:**
```js
// uk
'rpt-modal-title':  'Звіт для лікаря',
'rpt-period':       'Період',
'rpt-format':       'Формат виводу',
'rpt-sections':     'Секції звіту',
'rpt-pdf':          'PDF для лікаря',
'rpt-csv':          'CSV для Excel',
'rpt-sec-chart':    'Графік тиску',
'rpt-sec-journal':  'Журнал вимірів',
'rpt-sec-meds':     'Ліки та розклад',
'rpt-sec-adh':      'Прийом ліків (adherence)',
'rpt-sec-doctor':   'Блок лікаря',
'rpt-cancel':       'Скасувати',
'rpt-generate':     'Згенерувати звіт',

// ru — аналогічно
```

**Перевірка:**
```bash
grep -n "generateDoctorReport" src/features/export/pdf-report.js | head -3
grep -n "rpt-modal-title" src/i18n/ui.uk.js
grep -n "rpt-modal-title" src/i18n/ui.ru.js
grep -n "sections" src/features/export/modal.js
```

---

### ✅ Після Блоку 3 — показати:
```bash
npm test
git diff --stat
```
**Чекати підтвердження перед Блоком 4.**

---

## БЛОК 4 — Filesystem+Share для Android
### Задача: PDF-share

---

### PDF-share · Share через нативний Android

**Файл:** `src/core/platform.js`

**Проблема:** Зараз після генерації PDF використовується `pdf.save(fileName)` як fallback — це `[a download]` який не працює на Android APK.

**Виправлення:**
```js
// В platform.js — функція download():
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export async function download(fileName, blob, mimeType) {
  if (isNative()) {
    try {
      // Конвертувати blob у base64
      const base64 = await blobToBase64(blob);
      
      // Зберегти у тимчасову папку
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });
      
      // Відкрити Share sheet
      await Share.share({
        title: fileName,
        url: result.uri,
        dialogTitle: 'Зберегти або надіслати звіт',
      });
    } catch (e) {
      console.error('[platform.download]', e);
      throw e;
    }
  } else {
    // Web fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

**Перевірка:**
```bash
grep -n "Filesystem\|Share.share\|blobToBase64" src/core/platform.js
```

---

### ✅ Після Блоку 4 — показати:
```bash
npm test
git diff --stat
```

---

## ФІНАЛ СЕСІЇ

Після підтвердження всіх 4 блоків:

```bash
# 1. Фінальні тести
npm test

# 2. Переглянути всі зміни сесії
git diff --stat

# 3. Підняти версію
npm run version

# 4. Перевірити нову версію
grep "version" package.json

# 5. Тільки після дозволу користувача:
git add .
git commit -m "v5.3.23: PDF i18n, WHO-2 fix, report modal, Android Share"
git push origin main
```

**Генерувати PDF-звіт сесії** з коректними шляхами файлів (перевірити кожен через `ls` перед написанням у звіт).

---

## Що НЕ робити в цій сесії

- ❌ Не чіпати `health-score.js` — ІЗ логіка не в цій сесії
- ❌ Не додавати нові тести якщо не попросили
- ❌ Не переробляти CSV — окрема наступна сесія
- ❌ Не змінювати структуру модулів
- ❌ Не комітити без дозволу

---

*HealthPro v5.3.22 → v5.3.23 · Сесія підготовлена: 17.05.2026*
