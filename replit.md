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

## Changelog

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

## Pointers

- **PDF звіти сесій:** `HealthPro-Moie-Zdorovia/generate_session_report_*.py`
- **Папка PDF звітів:** `HealthPro-Moie-Zdorovia/report/` — **усі** згенеровані PDF-файли (звіти сесій, лікарські звіти, тощо) зберігати виключно тут.
- **Android сервіс:** `android/app/src/main/java/ua/healthpro/app/StepCounterService.java`
- **Версія:** `scripts/gen-version.js` → `src/core/version.gen.js`
- **DB API:** `src/core/db.js`
- **Charts API:** `src/core/charts.js`