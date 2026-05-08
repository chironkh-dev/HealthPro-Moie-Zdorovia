# HealthPro · Моє Здоров'я

Офлайн-перший персональний щоденник здоров'я: тиск, пульс, ліки, кроки, аналітика ІЗ.
Без сервера та хмари. Аудиторія: пацієнти 50+, гіпертонія/хронічні захворювання, СНД-ринок.

---

## Run & Operate

```bash
cd HealthPro-Moie-Zdorovia
npm run dev      # Vite dev-сервер, порт 5000
npm run build    # Продакшн збірка → ../dist/
npm run test     # Vitest
npm run version  # Генерація src/core/version.gen.js (авто перед build через prebuild)
```

Змінні середовища: **немає** (офлайн-додаток, без зовнішніх API).

---

## Stack

| Шар | Технологія |
|-----|-----------|
| Фреймворк | Vanilla JS (ES-modules), Vite 5 |
| Мобільна обгортка | Capacitor 8 (Android) |
| Зберігання | SQLite (`@capacitor-community/sqlite`, схема v2) + localStorage (кеш старту) |
| Графіки | ECharts tree-shaking: `echarts/core` + SVGRenderer / CanvasRenderer |
| PDF / Зображення | `jspdf`, `html2canvas` |
| PDF звіти сесій | Python `reportlab` (DejaVu Sans — кирилиця) |
| Тести | Vitest 4.1.5 |

---

## Принцип пріоритизації (ОБОВ'ЯЗКОВО читати перед кожною сесією)

```
БЕЗПЕКА  →  CORE DATA  →  АНАЛІТИКА  →  UX  →  КОСМЕТИКА
```

Фільтр для кожного нового завдання:
> "Це вирішує проблему користувача чи прикрашає інтерфейс?"

**Заморожено** до появи 10+ реальних користувачів: Telegram-бот, хмарний бекап,
голосовий ввід, англомовний інтерфейс, будь-яка косметика UI.

---

## Where things live

```
HealthPro-Moie-Zdorovia/
  index.html
  vite.config.js              — manualChunks: echarts+zrender → окремий chunk
  package.json                — version: 5.0.0; scripts: version, prebuild
  src/
    app.js                    — dispatcher, init, _setStateRef(state) → db.js
    core/
      constants.js            — версія, ключі, пороги ВООЗ
      version.gen.js          — АВТОГЕНЕРОВАНИЙ (npm run version) — не редагувати
      storage.js              — bootstrapStorage → migrateV1toV2
      state.js                — стан, toast, event bus
      db.js                   — уніфікований DB API (SQLite native / in-memory web)
      sqlite.js               — схема v2: DDL, CRUD, migrateV1toV2
      charts.js               — ECharts factory (WeakMap, createChart, disposeChart)
      platform.js             — Capacitor-обгортки
    i18n/
      ui.uk.js                — переклад: українська
      ui.ru.js                — переклад: російська
      pdf.js                  — словник для PDF-звітів
    features/
      pressure/               — тиск, пульс, write-through → measurements
      meds/                   — ліки, write-through → medications, med_taken
      steps/                  — крокомір, _persistSteps() → steps_log
      analytics/
        index.js              — renderAnalytics() → renderIZChart()
        health-score.js       — calcHealthScore, getBPThresholds, getPulseThresholds
        iz-chart.js           — ІЗ-тренд 30 днів (ECharts LineChart + SVGRenderer)
        trend-modal.js        — модал тиску sys+dia (ECharts, disposeChart при закритті)
        scatter.js            — [TODO v5.1] ScatterChart кроки↔тиск
        bp-zones.js           — [TODO v5.1] BarChart розподіл ВООЗ
        adherence.js          — [TODO v5.2] adherence-трекер ліків
        bmi.js
        recommendations.js
      tips/
        index.js              — [TODO v5.1] analyzeTrends, renderTips (офлайн JSON)
        cache.js              — [TODO v5.1] read/write tips з SQLite tips_cache
      export/                 — PDF / CSV / JSON
    styles/
      base.css                — Reset, CSS-змінні, теми
      layout.css              — Сітка, навігація, bento-картки
      features.css            — Компоненти (крокомір SVG-кільце, тиск, ліки...)
      tips.css                — [TODO v5.1] блок рекомендацій
    assets/
      ic_running.png          — іконка бігуна (крокомір)
      tips/
        tips_uk.json          — [TODO v5.1] верифіковані поради (ВООЗ/МОЗ)
        tips_ru.json          — [TODO v5.1] поради: російська
  scripts/
    gen-version.js            — генератор version.gen.js
  android/app/src/main/java/ua/healthpro/app/
    StepCounterService.java   — Android Foreground Service кроків
    BootReceiver.java
  android/app/src/main/res/drawable/
    ic_stat_running.xml       — монохромна іконка бігуна (сповіщення)
    logo_splash.xml
```

---

## Architecture decisions

- **No `window.X`** — всі модулі через ES-imports.
- **No inline handlers** — `data-action` / `data-change` + єдиний делегований listener у `app.js`.
- **Event Bus** — `emit('event:name')` / `on('event:name', cb)` для міжмодульної комунікації.
- **i18n Enforcement** — всі рядки через `t()` / `tt()`. Жодного хардкоду UI-текстів.
- **Offline-First** — дані локально; немає бекенду чи хмари. Зовнішніх API-запитів немає.
- **Версія — єдине джерело** — `package.json` → `npm run version` → `version.gen.js` → `constants.js`.
- **SQLite реляційна схема v2** — 5 таблиць: `measurements`, `medications`, `med_taken`, `steps_log`, `kv_state`. Write-through з feature-модулів. Міграція v1→v2 автоматична (ідемпотентна).
- **db.js без циклічних залежностей** — `_setStateRef(state)` з `app.js`; in-memory fallback на вебі.
- **ECharts tree-shaking** — `import { init, use } from 'echarts/core'` + тільки потрібні компоненти. SVGRenderer для ліній (HiDPI, <500 точок), CanvasRenderer для scatter з великим датасетом. WeakMap інстансів — без витоків.
- **manualChunks** — `echarts+zrender` → окремий chunk (~205 КБ gzip), кешується незалежно.
- **Поради — офлайн JSON** — НЕ зовнішній пошук (Brave/Google). Тільки верифіковані матеріали ВООЗ/МОЗ в `assets/tips/tips_uk.json`. Причина: безпека, офлайн, юридична чистота.

---

## SQLite db.js API (джерело правди для аналітики)

```js
// Читання
queryMeasurements({days?, from?, to?, limit?, order?})   // виміри тиску/пульсу
calcHealthIndexTrend(days)                                // добовий ІЗ-скор → графік
countByBPCategory()                                       // розподіл по 6 зонах ВООЗ
queryStepLog({days?, from?, to?})                        // денні кроки
queryStepPressureCorrelation()                           // JOIN для scatter
calcAdherence()                                          // % прийому ліків за 30 днів

// Запис (write-through з feature-модулів)
insertMeasurement(m)                    // → measurements
saveMedication(p) / removeMedication(id) // → medications
saveMedTaken(id, date, taken)           // → med_taken
saveStepLog({date, steps})             // → steps_log + localStorage mirror
```

---

## Безпека даних (КРИТИЧНО — реалізувати у v5.1 першим)

| Компонент | Поточний стан | Цільовий стан |
|---|---|---|
| SQLite at-rest | ❌ Незашифрований | SQLCipher (`encryption: true` у `@capacitor-community/sqlite`) |
| Ключ шифрування | — | Android Keystore / iOS Keychain, генерація при першому запуску |
| Блокування додатку | ❌ Відсутнє | Capacitor BiometricAuth (PIN + відбиток пальця) |

**Реалізація SQLCipher (v5.1, перший пункт):**
```js
// sqlite.js — змінити ініціалізацію:
await sqlite.createConnection('healthpro', true, 'secret', 2, false);
// Ключ брати з Capacitor SecureStorage, не хардкодити
```

---

## Tips — верифіковані офлайн поради (v5.1)

**Архітектура:** НЕ зовнішній API. Офлайн JSON-файл з категоризованими порадами.

```json
// assets/tips/tips_uk.json
[
  {
    "category": "pressure_high_2",
    "who_level": "Grade 2",
    "tips": [
      { "title": "...", "body": "...", "source": "ВООЗ 2023", "source_url": "who.int/..." }
    ]
  }
]
```

**Логіка відображення:**
```
analyzeTrends() → {category: 'pressure_high_2'}
→ фільтр tips_uk.json за category
→ renderTips() → блок рекомендацій у вкладці «Аналіз»
```

**Джерела (тільки офіційні):** `who.int`, `moz.gov.ua`
**Дисклеймер у кожній картці:** "Інформаційний характер. Зверніться до лікаря."

---

## ECharts — правила використання

- **`<div>`, не `<canvas>`** — ECharts не працює з canvas-елементами.
- **Явна висота перед init** — `el.style.height = '260px'` перед `createChart(el)`.
- **disposeChart(el)** при закритті модалів і переходах між вкладками — завжди.
- **SVGRenderer** для графіків ≤500 точок (лінії тиску, ІЗ, BarChart).
- **CanvasRenderer** для scatter кроків якщо >500 точок: `createChart(el, 'canvas')`.
- **WeakMap** у `charts.js` — не зберігати інстанси окремо, тільки через `createChart/disposeChart`.

---

## Gotchas (важливо для кожного агента)

- **PDF шрифти** — лише `DejaVu Sans` через TTFont. Не Roboto, не Helvetica, не системні.
- **version.gen.js — не редагувати вручну.** Тільки через `npm run version`.
- **ic_stat_running.xml** — іконка сповіщення Android. Не ic_stat_steps.
- **Сплеш-скрін** — HTML/CSS анімація, не Capacitor plugin. Клас `.hidden` → opacity 0 → `display:none` через 420мс.
- **Пріоритет кроків** — Android Foreground Service завжди має пріоритет над локальною БД.
- **ECharts empty state** — якщо `queryMeasurements()` повертає < 3 записів, показати повідомлення "Додайте 3+ виміри", не порожній графік.
- **Scatter пустий стан** — `queryStepPressureCorrelation()` < 10 парних записів → не будувати графік, показати підказку.
- **tips_cache TTL** — `expires_at = fetched_at + 86400` (24 год). Завжди перевіряти `Math.floor(Date.now()/1000) < expires_at` перед оновленням.
- **migrateV1toV2** — ідемпотентна, не змінювати логіку міграції.
- **_setStateRef(state)** — виклик з `app.js` після init, до першого використання db.js.

---

## Поточний бекло (пріоритизовано)

### 🔴 v5.1 — КРИТИЧНО (наступна сесія)
1. **SQLCipher** — шифрування SQLite at-rest + Android Keystore ключ
2. **ScatterChart** «Кроки↔Тиск» — `db.queryStepPressureCorrelation()` готово → `analytics/scatter.js`
3. **BarChart зони ВООЗ** — `db.countByBPCategory()` готово → `analytics/bp-zones.js`
4. **Офлайн поради** — `assets/tips/tips_uk.json` + `features/tips/index.js` (analyzeTrends, renderTips)
5. **Фільтр журналу** — date-range picker + фільтр-вкладки, `queryMeasurements({from,to})` готово

### 🟡 v5.2 — ВАЖЛИВО
6. Нотатки до вимірювань — textarea при збереженні, поле `note` у `measurements` є
7. Adherence-трекер ліків — `db.calcAdherence()` готово → `analytics/adherence.js`
8. Повторення розкладу ліків — поле `days` у `medications` є, потрібна логіка UI
9. PDF-звіт для лікаря з лікарським шаблоном + ECharts SVG → PDF

### 🟢 v5.3 — БАЖАНО
10. PIN-код / біометрія — Capacitor BiometricAuth
11. Вкладка «Вага» — нова таблиця + графік ІМТ
12. Вкладка «Сон» — новий трекер, кореляція з тиском

---

## Product context

- **Цільова аудиторія:** пацієнт 50+, гіпертонія/діабет, Україна/СНД, без Google-акаунту
- **Головна цінність:** систематизовані дані для лікаря + офлайн-приватність
- **НЕ є:** фітнес-трекером, конкурентом Samsung Health на їх полі
- **Диференціація:** локалізація СНД, норми ВООЗ/МОЗ, офлайн, звіт для лікаря

## User preferences

- **Спілкування виключно українською мовою!**
- **Вся документація українською.**
- **Після кожного великого етапу — PDF-звіт сесії (`reportlab`, DejaVu Sans) та оновлення replit.md.**
- Готовий приймати поради та архітектурні рішення.

---

## Pointers

- PDF звіти сесій: `HealthPro-Moie-Zdorovia/generate_session_report_*.py`
- Остання сесія: `generate_session_report_may2026_sqlite_echarts.py`
- Android сервіс: `android/app/src/main/java/ua/healthpro/app/StepCounterService.java`
- Версія: `scripts/gen-version.js` → `src/core/version.gen.js`
- DB API: `src/core/db.js`
- Charts API: `src/core/charts.js`
- Поточна версія: `v5.0.0` (git: d4f0d8d)
