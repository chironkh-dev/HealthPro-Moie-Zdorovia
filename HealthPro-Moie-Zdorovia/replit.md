# HealthPro · Моє Здоров'я

Офлайн-перший персональний щоденник здоров'я для пацієнтів 50+ з гіпертонією/хронічними захворюваннями, орієнтований на СНД-ринок.

## Run & Operate

```bash
npm run dev      # Vite dev-сервер, порт 5000
npm run build    # Продакшн збірка → ../dist/
npm run test     # Vitest (513 тестів / 16 файлів)
npm run version  # Генерація src/core/version.gen.js (авто перед build через prebuild)
```

Змінні середовища: відсутні.

## Stack

- **Фреймворк:** Vanilla JS (ES-modules), Vite 5
- **Мобільна обгортка:** Capacitor 8 (Android)
- **Зберігання:** SQLite (`@capacitor-community/sqlite`, схема v2), localStorage
- **Графіки:** ECharts (tree-shaking, SVGRenderer/CanvasRenderer)
- **PDF / Зображення:** `jspdf`, `html2canvas`
- **PDF звіти:** Python `reportlab` (DejaVu Sans)
- **Тести:** Vitest 4.1.5

## Where things live

```
HealthPro-Moie-Zdorovia/
  index.html
  vite.config.js              — конфігурація з manualChunks
  package.json                — метадані проекту, скрипти
  src/
    app.js                    — dispatcher, ініціалізація
    core/                     — ядро (константи, стан, БД, графіки, платформа)
      constants.js            — версія, ключі, пороги ВООЗ
      version.gen.js          — АВТОГЕНЕРОВАНИЙ файл версії
      storage.js              — логіка сховища та міграцій
      state.js                — глобальний стан, toast, event bus
      db.js                   — уніфікований DB API (SQLite native / in-memory web)
      sqlite.js               — схема v2: DDL, CRUD, SQLCipher
      charts.js               — ECharts factory (WeakMap)
      platform.js             — Capacitor-обгортки
    i18n/                     — файли перекладів
    features/                 — модулі функціоналу (тиск, ліки, кроки, аналітика, експорт)
      pressure/
        norm.js               — getBPDotClass(), getBPStatus() (ESC2024/AHA2017 standard-aware)
        who.js                — getWHOCategory() (standard-aware)
      analytics/
        index.js              — renderAnalytics() з standard-aware WHO label
        iz-chart.js           — ІЗ-трендовий графік (bottom-sheet модалка)
        bp-zones.js           — BarChart розподіл зон, динамічні мітки ESC/AHA
        scatter.js            — ScatterChart Кроки↔Тиск (bottom-sheet модалка)
      tips/
        index.js              — getBPCategory() + updateTipsTitle() standard-aware
    styles/
      components.css          — iz-action-btn стилі
      tips.css                — tips-toggle, tips-body, chevron анімація
  scripts/
    gen-version.js            — скрипт генерації version.gen.js
  android/app/src/main/java/ua/healthpro/app/ — Android-специфічний код
```

**Джерело правди для DB schema:** `src/core/sqlite.js`

## Architecture decisions

- **No `window.X` & No inline handlers:** Модулі через ES-imports, єдиний делегований `event listener` у `app.js`.
- **Event Bus:** `emit('event:name')` / `on('event:name', cb)` для міжмодульної комунікації.
- **i18n Enforcement:** Всі рядки через `t()` / `tt()`, хардкод UI-текстів заборонено.
- **Offline-First:** Дані локальні, без бекенду чи хмари.
- **Єдине джерело версії:** `package.json` → `npm run version` → `version.gen.js` → `constants.js`.
- **SQLite реляційна схема v2:** 5 таблиць, `write-through` з feature-модулів, автоматична міграція v1→v2.
- **SQLCipher (v5.1):** Шифрування БД на Android через `getOrCreateKey()` та Android Keystore.
- **ECharts tree-shaking:** Використання `echarts/core` та лише необхідних компонентів. SVGRenderer для ліній, CanvasRenderer для scatter. WeakMap для управління інстансами.
- **manualChunks:** `echarts+zrender` винесено в окремий chunk для кращого кешування.
- **Офлайн поради:** Верифіковані поради ВООЗ з `assets/tips/tips_uk.json`, без зовнішніх запитів.
- **Standard-aware (v5.2):** `getBPDotClass()`, `getBPStatus()`, `getWHOCategory()`, `getBPCategory()` перевіряють `state.settings.bpStandard` (ESC2024/AHA2017).

## Product

- **Цільова аудиторія:** Пацієнти 50+, гіпертонія/діабет, Україна/СНД, без Google-акаунту.
- **Головна цінність:** Систематизовані дані для лікаря та офлайн-приватність.
- **Відмінності:** Локалізація СНД, норми ВООЗ/МОЗ, офлайн, звіт для лікаря.
- **Заморожені фічі до 10+ користувачів:** Telegram-бот, хмарний бекап, голосовий ввід, англомовний інтерфейс, будь-яка косметика UI.

## User preferences

- Спілкування виключно українською мовою!
- Вся документація українською.
- Після кожного великого етапу — PDF-звіт сесії (`reportlab`, DejaVu Sans) та оновлення replit.md.
- Готовий приймати поради та архітектурні рішення.

## Changelog

### v5.2.0 (2026-05-08) — Сесія Part 3

- **Task 1 (Tabletki.ua):** `searchPharmacy()` → тільки tabletki.ua; `openDrugWarnModal()` — `<a href>` замінено на `<button data-action="searchTabletki">`, emoji ⚠️ → inline SVG; новий i18n ключ `m-search-source`.
- **Task 2 (Biometric):** `src/core/biometric.js` — Capacitor BiometricAuth wrapper (web-safe). `#lockScreen` overlay + `.lock-screen` CSS. Toggle у налаштуваннях (секція «Безпека»). `app.js`: lockCheck при init, `toggleBiometric` / `unlockApp` actions. `@aparajita/capacitor-biometric-auth` встановлено.
- **Task 3 (Adherence):** `src/features/analytics/adherence.js` — ECharts LineChart добової adherence з `state.pillsTaken`. Bento-карта «Прийом ліків» → tap → `#adherenceModal` (bottom-sheet). `renderAdherenceChart` / `disposeAdherenceChart` re-exported з analytics/index.
- **Task 4 (Notes):** Підтверджено як реалізоване в v5.1 ✅.
- **Task 5 (PDF Doctor):** `src/features/export/pdf-report.js` — `generateDoctorReport()` (html2canvas + jsPDF). Inline SVG BP chart + adherence bar chart + таблиця вимірів + ліки + дисклеймер. Журнал «Друк» та Налаштування «PDF» → `generateDoctorReport`. `svg2pdf.js` встановлено.
- **Task 6 (Days-picker):** `select#pillDays` → `.days-picker` (chips-кнопки: Щодня / Пн/Ср/Пт / Вт/Чт/Сб/Нд / Будні / Дата). `selectPillDay(el)` у meds/index.js. CSS: `.days-btn`, `.days-btn.active`.
- **Task 7 (gen-version):** `scripts/gen-version.js` — PATCH `padStart(3,'0')`, `APP_DATE` DD.MM.YYYY, `APP_BUILD_FULL` `v5.2.000 / 08.05.2026`. `constants.js` — re-export `APP_VERSION`, `APP_DATE`. `npm run version` → `version.gen.js` v5.2.000.

### v5.3.1 (2026-05-09) — Сесія Part 2 (PIN + Backup bugfix)
- **П1 — Автономний PIN-замок:** `src/core/pin.js` — `isPINSet/setPIN/verifyPIN/clearPIN` (SHA-256 + salt, localStorage). Замінює Capacitor Biometric Plugin повністю.
- **Б1 — Файловий пікер:** `accept="*/*"` в `importBackupFile` — відкриває всі типи файлів на Android (не лише .hpb).
- **Б2/Б4 — Захист backup.js:** `exportBackup(null)` — незашифрований шлях без пароля; `openBackupFile(content,null)` — no-password .hpb читається автоматично; `await sql.init()` guard + defensive state checks у `restoreBackup()`.
- **Б3 — bpStandard sync:** `init()` синхронізує кнопки `#bp-std-esc/#bp-std-aha` після перезавантаження/відновлення.
- **Emoji cleanup:** 🔑 ✅ 🔔 ⚠️ → SVG-іконки або видалені з усіх i18n-рядків uk/ru.
- **Lock Screen → PIN Pad:** Кнопка «Розблокувати» замінена 12-кнопковим PIN-падом (0-9 + backspace + 4 крапки), id `lpd0-lpd3`.
- **PIN Setup Modal:** `#pinSetupModal` — двокроковий ввід нового PIN (enter+confirm), id `spd0-spd3`.
- **Backup Export Modal:** Новий toggle `#bkUsePasswordToggle` + `#bkPasswordFields` — пароль стає необов'язковим.
- **app.js ACTIONS:** `toggleBiometric` → openPINSetup; нові: `lockPinKey/Del`, `pinSetupKey/Del`, `cancelPINSetup`, `toggleBkPassword`; оновлені: `doExportBackup`, `onImportBackupFile`, `doRestoreBackup`.
- **base.css:** `.pin-dots`, `.pin-dot`, `.pin-pad`, `.pin-btn`, `.pin-btn-del`, `.pin-error`.

### v5.3.0 (2026-05-08) — Сесія Part 4
- **Бекап `.hpb` (AES-256-GCM):** `src/features/export/backup.js` — `exportBackup()`, `openBackupFile()`, `restoreBackup()`, `getBackupStats()`. SubtleCrypto без бібліотек, PBKDF2 100k ітерацій, SHA-256 checksum, Schema 2 з SQLite-таблиць.
- **Формат бекапу:** `healthpro-backup-YYYY-MM-DD.hpb` — зашифрований JSON з полями: `measurements`, `medications`, `med_taken`, `steps_log`, `settings` (з `bpStandard`, `notif`, `measureReminder`, `pillReminder`, `morningTime`, `eveningTime`), `theme`, `lang`. `biometricLock` навмисно виключено.
- **Підтримка старого формату v4.0:** при імпорті `{ version: '4.0' }` — автоматична трансформація без пароля.
- **UI бекапу:** секція Налаштувань замінена — кнопка HPB (синя), CSV, Відновити (.hpb/.json). 3 брендованих модалки: export-password, import-password, confirm-restore.
- **sqlite.js `clearAll()`:** очищення таблиць measurements/medications/med_taken/steps_log перед відновленням.
- **storage.js defaultSettings:** додано `biometricLock: false` та `bpStandard: 'ESC2024'`.
- **biometric.js fix:** `checkBiometric()` тепер перевіряє `info?.isAvailable || info?.deviceIsSecure` — тоглер PIN-only пристроїв тепер працює.
- **i18n:** 33 нових ключі `bk-*` та `bio-err-unavailable` (uk + ru).
- **app.js:** хардкод `'Біометрія недоступна'` замінено на `t('bio-err-unavailable')`.

### v5.2.0 (2026-05-07) — Сесія Part 2
- **AHA 2017 підтримка:** `norm.js` — `getBPDotClass()` та `getBPStatus()` враховують `state.settings.bpStandard` (ESC2024 / AHA2017), нові i18n ключі `n-bp-aha-elevated`, `n-bp-aha-ht1`, `n-bp-aha-ht2`.
- **db.js `countByBPCategory()`** — standard-aware: AHA 2017 категорії маппуються до 5 ESC-слотів.
- **bp-zones.js** — динамічні мітки ESC/AHA, стандарт-підпис на графіку, фільтрація grade3 для AHA.
- **izTrendModal + scatterModal** — обидва графіки тепер у bottom-sheet модалках; аналітичні картки стали tap-тригерами (`openIZTrendModal`, `openScatterModal`).
- **38 unit-тестів** `tests/bp-dot-class.test.js` — покрите `getBPDotClass()` (ESC/AHA/граничні) та `getBPStatus()` (5+6 кейсів). Загальний набір: 513/513.
- **Реструктурована вкладка «Аналіз»:**
  - ІЗ-блок → кнопка `iz-action-btn` «Тренд 30 днів»
  - WHO-картка (full-width) → кнопки «Класифікація» + «Розподіл по зонах»
  - step-bento → wide + кнопка «Кроки↔Тиск»
  - Tips → згорнутий блок з chevron-toggle (`toggleTipsBlock`)
- **Standard-aware WHO/Tips:** `getWHOCategory()`, `getBPCategory()`, `updateTipsTitle()` враховують поточний стандарт.
- **setBPStandard перерендер:** після зміни ESC/AHA → `renderAnalytics()`, `renderJournal()`, `renderHistory()`.
- **i18n +8 нових ключів** (uk+ru): `tips-title-aha`, `t-btn-iz-trend`, `t-btn-who-class`, `t-btn-bp-zones`, `t-btn-scatter`, `t-who-cat-aha`, `n-bp-aha-elevated/ht1/ht2`.
- **CSS:** `iz-action-btn` в `components.css`; `tips-toggle/tips-body/chevron` в `tips.css`; overdue pills червоний фон.
- **npm run version** → `version.gen.js` оновлено до v5.2.0.

### v5.1.1 (2026-05-06) — BugFix
- Зникнення графіків після перемикання вкладок — `disposeChart(el)` перед `innerHTML` у `iz-chart.js`, `scatter.js`, `bp-zones.js`.
- `app.js`: `disposeIZChart()` при виході з вкладки «Аналіз».

### v5.1.0 (2026-05-06)
- SQLCipher: `getOrCreateKey()` + Android Keystore.
- ScatterChart Кроки↔Тиск → `analytics/scatter.js`.
- BarChart розподіл зон ВООЗ → `analytics/bp-zones.js`.
- Офлайн поради ВООЗ → `features/tips/index.js` + JSON файли.
- Журнал date-range picker → `features/journal/index.js`.
- i18n uk/ru +15 нових ключів.

## Gotchas

- **PDF шрифти:** Використовувати тільки `DejaVu Sans` через TTFont. У `pdf-report.js` кирилиця рендериться через html2canvas (шрифт браузера) — DejaVu не потрібний у jsPDF.
- **`days-picker` #pillDays:** Тепер `<div class="days-picker">` — не `<select>`. Значення — `document.querySelector('#pillDays .days-btn.active')?.dataset.days ?? 'daily'`.
- **`biometric.js`:** Тільки на Android APK. На вебі завжди `false`. Пакет `@aparajita/capacitor-biometric-auth` встановлено для Vite-резолвінгу.
- **Adherence chart:** `computeDailyAdherence()` — синхронна, без async. Потребує 3+ днів даних у `state.pillsTaken`.
- **`version.gen.js`:** Не редагувати вручну, генерується через `npm run version`.
- **`ic_stat_running.xml`:** Це іконка сповіщення Android, не `ic_stat_steps`.
- **Сплеш-скрін:** Реалізовано через HTML/CSS анімацію, не Capacitor plugin.
- **Пріоритет кроків:** Android Foreground Service має пріоритет над локальною БД.
- **ECharts empty state:** Графіки відображають повідомлення "Додайте X+ вимірів" при недостатній кількості даних.
- **`disposeChart(el) ПЕРЕД innerHTML`:** Завжди викликати `disposeChart(el)` перед зміною `innerHTML` або висоти контейнера ECharts.
- **`tips_cache` TTL:** Кеш порад зберігається 24 години.
- **`migrateV1toV2`:** Ідемпотентна функція, не змінювати логіку.
- **`_setStateRef(state)`:** Викликається з `app.js` після ініціалізації, до першого використання `db.js`.
- **SQLCipher на вебі:** Не активний, тестувати лише на APK.
- **WelcomeScreen в браузері:** localStorage чистий → завжди показується welcome при першому відкритті в dev. Це норма.
- **`pctNormal` у analytics/index.js:** Рядок 185 — безпечно (null-check), елемент видалений з HTML в v5.2.

## Тести

| Параметр | Значення |
|---|---|
| Середовище | `vitest` / `node` (без jsdom) |
| Файлів тестів | **16** |
| Всього тестів | **513** |
| Стан | ✅ всі зелені |
| Час виконання | ~8.5 с |

## Крокомір — архітектура

### Два режими

| Режим | Клас | Поведінка при вбиванні |
|---|---|---|
| `'foreground'` | `StepCounterService` (Android FG Service) | Перезапускається через AlarmManager; BootReceiver після reboot |
| `'active-only'` | DeviceMotion listener у JS | Зупиняється при закритті вкладки |

### Алгоритм фільтрації кроків

```
DeviceMotion event (~50 Гц)
  → лінійне прискорення mag (м/с²)
  → mag >= 3.0 ? _peakSamples++ : _peakSamples = 0
  → _peakSamples >= 2 ? _inPeak = true    ← TAP FILTER (~40 мс мін.)
  → mag < 3.0 && _inPeak ? крок! (якщо debounce 250 мс пройшов)
```

### Стійкість FG-сервісу

| Сценарій | Захист |
|---|---|
| Свайп з Recent Apps | `stopWithTask=false` + `onTaskRemoved` → AlarmManager 2 с |
| Android Doze | `START_STICKY` + onResume health-check у JS |
| Reboot пристрою | `BootReceiver` (BOOT_COMPLETED) + SharedPreferences initialSteps |
| Оновлення APK | `BootReceiver` (MY_PACKAGE_REPLACED) |
| Samsung Max Power | одноразовий `requestBatteryOptExemption()` після першого старту |

## Поточний спринт — v5.3 (наступне)

- Нотатки до вимірювань (textarea при збереженні)
- Adherence-трекер ліків (`analytics/adherence.js`)
- Повторення розкладу ліків (UI для поля `days`)
- PDF-звіт для лікаря (ECharts SVG → reportlab)

## Pointers

- **PDF звіти сесій:** `HealthPro-Moie-Zdorovia/generate_session_report_*.py`
- **Android сервіс:** `android/app/src/main/java/ua/healthpro/app/StepCounterService.java`
- **Версія:** `scripts/gen-version.js` → `src/core/version.gen.js`
- **DB API:** `src/core/db.js`
- **Charts API:** `src/core/charts.js`
- **BP норми (standard-aware):** `src/features/pressure/norm.js`
- **WHO категорії:** `src/features/pressure/who.js`
