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

### v5.3.15 (2026-05-12) — Сесія: Архітектурне виправлення біометрії
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