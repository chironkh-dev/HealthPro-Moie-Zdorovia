# HealthPro · Моє Здоров'я

Офлайн-перший персональний щоденник здоров'я для пацієнтів 50+ з гіпертонією/хронічними захворюваннями, орієнтований на СНД-ринок.

## Run & Operate

```bash
npm run dev      # Vite dev-сервер, порт 5000
npm run build    # Продакшн збірка → ../dist/
npm run test     # Vitest
npm run version  # Генерація src/core/version.gen.js (авто перед build через prebuild)
```

Змінні середовища: відсутні.

## Build & Deploy (ОБОВ'ЯЗКОВО читати перед кожною командою)

### Структура репозиторію ("матрьошка")
```
~/workspace/                          ← Capacitor root
  capacitor.config.json               ← єдиний конфіг Capacitor
  package.json                        ← залежності Capacitor + плагіни
  android/                            ← Android проєкт
  dist/                               ← збірка Vite (webDir)
  HealthPro-Moie-Zdorovia/            ← весь JS/CSS/HTML код
    package.json                      ← залежності Vite + npm
    src/                              ← вихідний код
    vite.config.js                    ← outDir: '../dist'
```

### Правила (порушення = плагіни не працюють)
| Команда | Де виконувати |
|---|---|
| `npm install <plugin>` | `~/workspace/` І `~/workspace/HealthPro-Moie-Zdorovia/` |
| `npm run build` | `~/workspace/HealthPro-Moie-Zdorovia/` |
| `npm run version` | `~/workspace/HealthPro-Moie-Zdorovia/` |
| `npx cap sync android` | `~/workspace/` |
| `git add/commit/push` | `~/workspace/` |

### Повний flow (копіювати без змін)
```bash
# 1. Новий плагін — ОБИДВІ папки!
cd ~/workspace && npm install <plugin>
cd ~/workspace/HealthPro-Moie-Zdorovia && npm install <plugin>

# 2. Змінити код в src/

# 3. Зібрати
cd ~/workspace/HealthPro-Moie-Zdorovia && npm run build && npm run version

# 4. Синхронізувати
cd ~/workspace && npx cap sync android

# 5. Push
git add . && git commit -m "vX.X.X" && git push origin main
```

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
    styles/                   — стилі (базові, макет, компоненти)
    assets/                   — статичні ресурси (зображення, JSON порад)
  scripts/
    gen-version.js            — скрипт генерації version.gen.js
  android/app/src/main/java/ua/healthpro/app/ — Android-специфічний код (сервіси)
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
- **Версії додатку генеруються ВРУЧНУ користувачем.** На початку кожної нової сесії — обов'язково запитати у користувача поточний номер версії (наприклад: "Яка поточна версія?") для коректного формування звітів та changelog.

## Changelog

### v5.3.17 (2026-05-12) — Сесія: Роадмап 5 задач

- **README бейджі (Задача 1):** Додано `[![CI](...)]` та `[![Android APK](...)]` бейджі у `README.md` відразу після заголовка. Репо: `chironkh-dev/HealthPro-Moie-Zdorovia`.
- **`steps/api.js` (Задача 2 — новий файл):** Архітектурний рефакторинг — виокремлено `_stepCount`, `getStepCount()`, `_setStepCount()` без жодних browser-залежностей. `health-score.js` тепер імпортує `getStepCount` з `steps/api.js` (0 транзитивних deps) замість `steps/index.js` (→ charts → zrender → navigator). `steps/index.js` синхронізує `_setStepCount` у 4 точках: `_persistSteps`, `_checkDayRollover`, `enableSteps`, `restoreSteps`. Три тестові файли оновлено: `vi.mock(steps/api.js)` замість `steps/index.js`. Всі 513/513 тестів ✅.
- **5-хв таймер блокування (Задача 3):** `platform.js` — новий `onPause()` хелпер (Capacitor App appStateChange). `app.js` — `_bgTimestamp`, `BG_LOCK_TIMEOUT_MS = 5 * 60 * 1000`. `onPause` записує timestamp при згортанні. `onResume` блокує PIN лише якщо `elapsed >= 5 хв`. Cold start → `_bgTimestamp = 0` → `Infinity` → завжди блокує (безпечно).
- **Середні кроки (Задача 4):** `refreshStepAvg()` / `_renderStepAvg()` у `steps/index.js`. TTL-кеш 5 хвилин для `queryStepLog`. `#stepWeekAvg` та `#stepMonthAvg` у `index.html` під `.step-goal-row`. i18n: `st-week-avg`, `st-month-avg` (uk+ru).
- **Автобекап нагадування (Задача 5):** `backup.js` — після export: `state.settings.lastBackupDate = today(); saveData()`. `app.js` — `_checkAutoBackupReminder()` при init: якщо 7+ днів → `setTimeout(showToast, 4000)`. i18n: `bk-auto-remind` (uk+ru). `defaultSettings.lastBackupDate: ''` (вже було у `storage.js`).
- **`package.json`:** версія 5.3.16 → 5.3.17. `npm run version` → `version.gen.js` оновлено.
- **Тести:** 513/513 ✅ (16/16 файлів).

### v5.3.16 (2026-05-12) — Сесія: CI Fix — тести + APK збірка

- **`ci.yml` Node 20 → 22:** GitHub Actions node-version оновлено до LTS 22. Node 20 позначений deprecated у GitHub runners; zrender (ECharts) звертався до `navigator` при старті, якого немає у Node < 22.
- **`tests/mocks/charts.js` (новий файл):** Стаб-замінник `src/core/charts.js`. Повторює публічний API (`createChart`, `disposeChart`, `resizeAllCharts`, `COLORS`) без будь-яких browser-globals.
- **`vitest.config.js` — глобальний alias:** `resolve.alias` з regex `/\/src\/core\/charts\.js$/` → перенаправляє будь-який імпорт `charts.js` (прямий або транзитивний) на стаб. Всі 8 тестових файлів, що падали через ланцюжок `health-score.js → steps/index.js → charts.js → zrender → navigator`, тепер проходять без змін вихідного коду.
- **`tests/setup.js` — navigator стаб:** Другий рівень захисту: `globalThis.navigator = { userAgent: 'node' }` на випадок якщо alias не перехопить інший browser-залежний модуль.
- **`android-apk.yml` SDK 35 → 36:** `platforms;android-35` виправлено на `platforms;android-36` — відповідає `compileSdkVersion = 36` у `android/variables.gradle` (AGP 8.13.0). `build-tools;35.0.0` залишається (сумісні з SDK 36, стабільніші).
- **`vite.config.js` — видалено дублікат `test`:** Секція `test: { environment: 'jsdom' }` у `vite.config.js` конфліктувала з авторитетним `vitest.config.js` (environment: 'node'). Видалено.
- **Root `package.json` — очищено:** Версія 5.2.0 → 5.3.16; видалено `jspdf ^4.2.1` (не потрібен для cap sync), `jsdom`, `vitest` (тести лише у inner), `@capacitor/motion` (не в inner); root lock оновлено.
- **Тести:** 513/513 ✅ локально (16/16 файлів).

### v5.3.16 (2026-05-12) — Сесія: Скидання кроків опівночі + Графік по днях

- **`_checkDayRollover()` (JS):** нова функція у `steps/index.js` — при зміні `today()` синхронно скидає `stepCount=0`, зберігає вчорашній підсумок у `steps_log` (idempotent upsert), записує 0 для нового дня, перезапускає Foreground Service з `initialSteps=0`. Викликається з `_persistSteps()`, `restoreSteps()`, та `onResume`-хелс-чеку.
- **`_lastStepDate` (JS):** нова module-level змінна — зберігається у localStorage (`stepLastDate`), ініціалізується при `restoreSteps()`.
- **`StepCounterService.java`:** додано `currentDate` поле + перевірка зміни дати в `onSensorChanged` — захист на випадок якщо JS-шар вимкнено (сервіс живий вночі): скидає `initialSteps=0`, `currentSteps=0`, `baselineSteps=rawSteps`, бродкастить 0.
- **Графік «Кроки по днях»:** `renderStepsDayChart()` / `disposeStepsDayChart()` / `openStepsDayModal()` / `closeStepsDayModal()` у `steps/index.js`. ECharts bar chart (SVG) за останні 30 днів — стовпчики зелені (ціль досягнута) або cyan (не досягнута), пунктирна лінія мети, tooltip з датою та кількістю.
- **Нова кнопка «Кроки по днях»:** поруч з «Кроки ↔ Тиск» у flex-обгортці у блоці активності (`index.html`).
- **Модалка `#stepsDayModal`:** bottom-sheet, та сама структура що й `scatterModal`.
- **`app.js`:** імпорт + ACTIONS `openStepsDayModal`/`closeStepsDayModal`, dispose при навігації між вкладками.
- **i18n uk/ru:** нові ключі `t-btn-steps-day`, `t-steps-day-modal-title`, `t-steps-day-empty`.
- **Тести:** 513/513 ✅, збірка Vite без помилок.

### v5.3.16 (2026-05-12) — Сесія: Архітектурне виправлення біометрії
- **`lockCheck()` → синхронна:** прибрано авто-виклик `authenticate()` при старті — головна причина зависання Samsung A24.
- **Кнопка `#lockBioBtn` на lockScreen:** `authenticate()` тепер викликається ТІЛЬКИ по тапу користувача (згідно з Samsung BiometricPrompt best practices).
- **Mutex `_bioLockBusy`:** блокує подвійний виклик при швидких повторних тапах.
- **Timeout 8с:** `Promise.race([authenticate(), timeout(8000)])` — захист від зависання BiometricPrompt.
- **Delay 400мс:** перед `authenticate()` — Samsung потребує паузу після Activity transitions.
- **`onResume`:** тепер тільки показує lockScreen (без авто-auth), кнопка відбитка чекає на тап.
- **i18n uk/ru:** новий ключ `lock-bio-btn` — підпис кнопки відбитка.
- **`npm install` у `~/workspace/`:** виправлено відсутні залежності Capacitor CLI для `npx cap sync android`.

### v5.3.2 (2026-05-09) — Сесія: Крокомір + Біометрія поверх PIN
- **ForegroundStepPlugin.java `getSteps()`:** якщо плагін не bound після перезапуску — читає кроки з SharedPrefs (не повертає 0); ініціює `bindService()` якщо `wasRunning=true`.
- **ForegroundStepPlugin.java `handleOnResume()`:** при поверненні додатку з фону — auto-bind до живого сервісу + реєстрація stepReceiver.
- **StepCounterService.java `onTaskRemoved()`:** `saveStepState(currentSteps)` як перший рядок — точний знімок кроків перед kill.
- **biometric.js:** `allowDeviceCredential: false` (тільки відбиток/обличчя, не системний PIN); `checkBiometry().isAvailable` замість `deviceIsSecure`.
- **AndroidManifest.xml:** додано `USE_BIOMETRIC` + `USE_FINGERPRINT` permissions.
- **app.js `lockCheck()`:** нова async функція — спочатку `authenticate()` (відбиток), при відмові/помилці → PIN-пад.
- **app.js `toggleBiometric`:** розрізняє PIN-кнопку (`biometricToggle`) та checkbox відбитка (`bioToggle`); при вимкненні PIN — скидає також `biometricEnabled`.
- **app.js init:** `checkBiometric().then()` — показує `bioToggleRow` тільки при наявності апаратного відбитка; `lockCheck()` замість прямого показу lockScreen.
- **index.html:** `bioToggleRow` (прихований за замовчуванням) — рядок налаштування відбитка з checkbox.
- **i18n uk/ru:** нові ключі `bio-toggle`, `bio-toggle-hint`.

### v5.3.2 (2026-05-09) — Сесія: Toggle Bugfix + Backup Steps
- **Тогл PIN-замку (biometricToggle):** виправлено клас `.active` → `.on` у всіх 6 місцях `app.js` — тогл тепер коректно відображає стан увімкнено/вимкнено.
- **Тогл шифрування бекапу (bkUsePasswordToggle):** аналогічне виправлення `.active` → `.on` у `app.js` та `index.html` — тогл у модалці експорту бекапу тепер працює.
- **backup.js `restoreBackup()`:** `stepsEnabled` тепер скидається в `false` при відновленні бекапу (як і `biometricLock`) — запобігає краші при відновленні на чистому пристрої без дозволів крокоміра.
- **backup.js `collectData()`:** кроки тепер збираються з `localStorage` (`stepCount-*`) на вебі/без SQLite — дані кроків більше не втрачаються при експорті бекапу.
- **replit.md:** зафіксовано правило — версії вручну, питати на початку сесії.

### v5.3.1 (2026-05-09) — PIN Lock Backup Bugfix Part 2
- **П1:** PIN-замок (pin.js, SHA-256, без Capacitor Biometric)
- **Б1–Б4:** виправлення бекапу (.hpb) на реальному Android
- **Emoji cleanup:** SVG Lucide-іконки замість Unicode emoji

### v5.2.0 (2026-05-07) — Сесія Part 2
- **AHA 2017 підтримка:** `norm.js` — `getBPDotClass()` та `getBPStatus()` враховують `state.settings.bpStandard` (ESC2024 / AHA2017), нові i18n ключі `n-bp-aha-elevated`, `n-bp-aha-ht1`, `n-bp-aha-ht2`.
- **db.js `countByBPCategory()`** — standard-aware: AHA 2017 категорії маппуються до 5 ESC-слотів.
- **bp-zones.js** — динамічні мітки ESC/AHA, стандарт-підпис на графіку, фільтрація grade3 для AHA.
- **izTrendModal + scatterModal** — обидва графіки тепер у bottom-sheet модалках; аналітичні картки стали tap-тригерами (`openIZTrendModal`, `openScatterModal`).
- **38 unit-тестів** `tests/bp-dot-class.test.js` — покрите `getBPDotClass()` (ESC/AHA/граничні) та `getBPStatus()` (5+6 кейсів). Загальний набір: 513/513 ✅.
- **npm run version** → `version.gen.js` оновлено до v5.2.0 (d16bb5f).

## Gotchas

- **PDF шрифти:** Використовувати тільки `DejaVu Sans` через TTFont.
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

## Folders

| Папка | Призначення |
|---|---|
| `HealthPro-Moie-Zdorovia/report/` | PDF-звіти сесій агента (генеруються скриптом) |
| `HealthPro-Moie-Zdorovia/task_feedback/` | Завдання від користувача, фідбеки, скріншоти, референсні файли |
| `attached_assets/` | Тільки CI/yml конфіги середовища Replit |

## Pointers

- **Скрипт звіту сесії:** `HealthPro-Moie-Zdorovia/scripts/HealthPro_generate_session_report.py`
  - Єдиний шаблон для генерації PDF-звітів сесій. Всі старі скрипти видалено.
  - Налаштування на початку файлу: `VERSION`, `DESCRIPTION`, `PART` (None або 1, 2, …)
  - Запуск: `python3 scripts/HealthPro_generate_session_report.py`
  - Вихідний файл: `report/HealthPro_Session_v{VERSION}_{DESCRIPTION}_{PartN}_Report.pdf`
- **Папка звітів сесій:** `HealthPro-Moie-Zdorovia/report/` — лише PDF-звіти про виконану роботу агента (звіти сесій розробки). Лікарські PDF-звіти, які генерує сам застосунок, тут не зберігаються.
- **Android сервіс:** `android/app/src/main/java/ua/healthpro/app/StepCounterService.java`
- **Версія:** `scripts/gen-version.js` → `src/core/version.gen.js`
- **DB API:** `src/core/db.js`
- **Charts API:** `src/core/charts.js`