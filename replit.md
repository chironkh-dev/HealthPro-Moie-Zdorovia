# HealthPro · Моє Здоров'я

Офлайн-перший персональний щоденник здоров'я: тиск, пульс, ліки, кроки, аналітика ІЗ. Без сервера та хмари.

## Run & Operate

```bash
cd HealthPro-Moie-Zdorovia
npm run dev      # Vite dev-сервер, порт 5000
npm run build    # Продакшн збірка → ../dist/
npm run test     # Vitest
npm run version  # Генерація src/core/version.gen.js (авто перед build)
```

Змінні середовища: **немає** (офлайн-додаток).

## Stack

| Шар | Технологія |
|-----|-----------|
| Фреймворк | Vanilla JS (ES-modules), Vite 5 |
| Мобільна обгортка | Capacitor 8 (Android) |
| Зберігання | IndexedDB (`HealthProDB`), localStorage, SQLite (`@capacitor-community/sqlite`) |
| Графіки | **ECharts** (tree-shaking: `echarts/core` + SVGRenderer) |
| PDF / Зображення | `jspdf`, `html2canvas` |
| PDF звіти сесій | Python `reportlab` (DejaVu Sans — кирилиця) |
| Тести | Vitest 4.1.5 |

## Where things live

```
HealthPro-Moie-Zdorovia/
  index.html                  — головний HTML
  vite.config.js              — manualChunks: echarts → окремий chunk
  src/
    main.js                   — bootstrap
    app.js                    — dispatcher, init, _setStateRef(state) → db.js
    core/
      constants.js            — версія, ключі, пороги
      version.gen.js          — АВТОГЕНЕРОВАНИЙ (npm run version)
      storage.js              — 3-рівнева персистентність + bootstrapStorage → migrateV1toV2
      state.js                — стан, toast, event bus
      db.js                   — уніфікований DB API (SQLite native / in-memory web)
      sqlite.js               — SQLite схема v2, DDL, CRUD, migrateV1toV2
      charts.js               — ECharts factory (WeakMap, createChart, disposeChart)
      platform.js             — Capacitor-обгортки
    i18n/                     — ui.uk.js, ui.ru.js, pdf.js
    features/
      pressure/               — тиск, пульс, write-through → measurements
      meds/                   — ліки, write-through → medications, med_taken
      steps/                  — крокомір, _persistSteps() → steps_log
      analytics/
        index.js              — renderAnalytics() → renderIZChart()
        health-score.js       — calcHealthScore, getBPThresholds, getPulseThresholds
        iz-chart.js           — ІЗ-тренд 30 днів (ECharts LineChart + SVGRenderer)
        trend-modal.js        — модал тиску sys+dia (ECharts, disposeChart при закритті)
        bmi.js
        recommendations.js
  scripts/gen-version.js      — генератор version.gen.js
android/app/src/main/java/ua/healthpro/app/   — StepCounterService, BootReceiver
android/app/src/main/res/drawable/            — ic_stat_running.xml, logo_splash.xml
assets/ic_running.png                         — іконка бігуна (крокомір)
```

## Architecture decisions

- **No `window.X`** — всі модулі через ES-imports.
- **No inline handlers** — `data-action` / `data-change` + єдиний делегований listener у `app.js`.
- **Event Bus** — `emit('event:name')` / `on('event:name', cb)` для міжмодульної комунікації.
- **i18n Enforcement** — всі рядки через `t()` / `tt()`. Жодного хардкоду UI-текстів.
- **Offline-First** — дані локально; немає бекенду чи хмари.
- **Версія — єдине джерело** — `package.json` → `npm run version` → `version.gen.js` → `constants.js`.
- **SQLite реляційна схема v2** — таблиці `measurements`, `medications`, `med_taken`, `steps_log`, `kv_state`. Write-through з feature-модулів. Міграція v1→v2 — автоматично при старті (ідемпотентна).
- **db.js без циклічних залежностей** — `_setStateRef(state)` з `app.js`; in-memory fallback на вебі.
- **ECharts tree-shaking** — `import { init, use } from 'echarts/core'` + тільки потрібні компоненти. SVGRenderer для ліній (HiDPI), CanvasRenderer резерв для scatter. WeakMap інстансів — без витоків пам'яті.
- **manualChunks** — `echarts` + `zrender` → окремий chunk (~205 кБ gzip), кешується незалежно.

## Product

- **Моніторинг здоров'я** — тиск, пульс, ліки, кроки.
- **Аналітика** — Індекс Здоров'я (ІЗ), ІМТ, персоналізовані рекомендації.
- **Графіки** — ІЗ-тренд 30 днів (iz-chart.js), тиск 14 днів (trend-modal.js) — обидва на ECharts.
- **PDF-звіти** — генерація та шерінг звітів для лікаря.
- **Нагадування про ліки** — push-повідомлення за розкладом.
- **Крокомір** — фоновий режим (Android Foreground Service) + активний режим (DeviceMotion).
- **Персоналізовані норми** — налаштування порогів тиску і пульсу.

## User preferences

- **Спілкування виключно українською мовою!**
- **Вся документація українською.**
- **Після кожного великого етапу — PDF-звіт та оновлення replit.md.**
- Готовий приймати поради та рішення з розвитку проекту.

## Gotchas

- **PDF шрифти** — лише DejaVu Sans (Arial/Arial-Bold через TTFont). Не Roboto, не Helvetica.
- **ECharts потребує `<div>`, не `<canvas>`** — `<canvas id="trendChart">` замінено на `<div>`.
- **ECharts потребує явної висоти** — `el.style.height = '180px'` перед `createChart(el)`.
- **disposeChart(el)** при закритті модалів — інакше повторний `openTrendModal` дасть порожній графік.
- **Пріоритет даних крокоміра** — Foreground Service завжди має пріоритет над локальною БД.
- **version.gen.js — не редагувати вручну.** Генерується `npm run version`.
- **ic_stat_running.xml** — іконка сповіщення Android (не ic_stat_steps).
- **Сплеш-скрін** — HTML/CSS (не Capacitor). Клас `.hidden` → CSS transition opacity → 0 → `display:none` через 420 мс.

## Поточні пропозиції розвитку

- **Високий пріоритет:** ScatterChart «Кроки ↔ Тиск» (db.queryStepPressureCorrelation готово), BarChart розподіл ВООЗ (db.countByBPCategory готово), фільтр журналу за датою.
- **Середній:** Нотатки до вимірювань (поле note у measurements є), adherence-графік, повторення розкладу ліків, PDF-звіт для лікаря з ECharts.
- **Низький:** Блокування PIN/біометрія, вкладки «Вага» та «Сон».

## Pointers

- PDF звіти сесій: `HealthPro-Moie-Zdorovia/generate_session_report_*.py`
- Остання сесія: `generate_session_report_may2026_sqlite_echarts.py` → `HealthPro_Session_May2026_SQLite_ECharts.pdf`
- Android сервіс: `android/app/src/main/java/ua/healthpro/app/StepCounterService.java`
- Версія: `scripts/gen-version.js` → `src/core/version.gen.js`
- DB API: `src/core/db.js` — джерело правди для аналітичних запитів
- Charts API: `src/core/charts.js` — factory для всіх ECharts-графіків
