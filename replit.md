# HealthPro · Моє Здоров'я

Офлайн-перший персональний щоденник здоров'я для відстеження тиску, пульсу, ліків, кроків та аналітики індексу здоров'я.

## Run & Operate

```bash
npm run dev      # Vite dev-сервер, порт 5000
npm run build    # Продакшн збірка → ../dist/
npm run test     # Vitest
npm run version  # Генерація src/core/version.gen.js
```

**Env Vars:** Немає (офлайн-додаток).

## Stack

- **Framework:** Vanilla JS (ES-modules), Vite 5
- **Mobile Wrapper:** Capacitor 8 (Android)
- **Storage:** SQLite (`@capacitor-community/sqlite`, схема v2) + localStorage
- **Charting:** ECharts (tree-shaking, SVGRenderer/CanvasRenderer)
- **PDF/Image:** `jspdf`, `html2canvas`
- **PDF Reports:** Python `reportlab` (DejaVu Sans)
- **Testing:** Vitest 4.1.5

## Where things live

```
HealthPro-Moie-Zdorovia/
  index.html
  vite.config.js              # Vite configuration with manualChunks
  package.json                # Project dependencies and scripts
  src/
    app.js                    # Main application dispatcher and initialization
    core/                     # Core utilities and APIs
      constants.js            # App constants, WHO thresholds
      version.gen.js          # AUTO-GENERATED app version
      storage.js              # Storage bootstrap and migration
      state.js                # Global state, toast, event bus
      db.js                   # Unified DB API (SQLite native / in-memory web)
      sqlite.js               # SQLite schema v2 DDL, CRUD, migrations
      charts.js               # ECharts factory with WeakMap
      platform.js             # Capacitor wrappers
    i18n/                     # Internationalization files
    features/                 # Feature-specific modules (pressure, meds, steps, analytics, export)
    styles/                   # CSS styles (base, layout, features)
    assets/                   # Static assets (images, tips JSON)
  scripts/
    gen-version.js            # Script to generate version.gen.js
  android/                    # Android-specific files
    StepCounterService.java   # Android Foreground Service for step counter
```
**Source of Truth:**
- DB Schema: `src/core/sqlite.js` (v2)
- API Contracts: `src/core/db.js` (Unified DB API)
- UI Text: `src/i18n/ui.uk.js`, `src/i18n/ui.ru.js`, `src/i18n/pdf.js`
- WHO/MoH Tips: `assets/tips/tips_uk.json`

## Architecture decisions

- **No `window.X` or Inline Handlers:** All modules use ES-imports; UI interactions are delegated via `data-action`/`data-change` to a single listener in `app.js`.
- **Event Bus:** Used for inter-module communication (`emit('event:name')` / `on('event:name', cb)`).
- **i18n Enforcement:** All UI strings are localized via `t()`/`tt()`.
- **Offline-First & Data Privacy:** No backend or cloud; all data stored locally. No external API requests.
- **Single Source of Truth for Version:** `package.json` → `npm run version` → `version.gen.js` → `constants.js`.
- **SQLite Relational Schema v2:** 5 tables (`measurements`, `medications`, `med_taken`, `steps_log`, `kv_state`) with automatic, idempotent v1→v2 migration.
- **ECharts Tree-shaking:** Imports only necessary ECharts components and renders with `SVGRenderer` (for lines) or `CanvasRenderer` (for scatter with large datasets) to optimize bundle size. Instances managed with `WeakMap` to prevent memory leaks.
- **Offline Tips:** Verified WHO/MoH tips are stored in local JSON files (`assets/tips/tips_uk.json`) for safety, offline access, and legal clarity.

## Product

- **Target Audience:** Patients 50+, hypertension/chronic diseases, CIS market, without Google accounts.
- **Core Value:** Systematized data for doctors and offline privacy.
- **Differentiation:** CIS localization, WHO/MoH norms, offline functionality, doctor's report.
- **Product Philosophy:** Prioritize **SECURITY → CORE DATA → ANALYTICS → UX → COSMETICS**. Avoid features that only "beautify the interface" until 10+ real users.

## User preferences

- Спілкування виключно українською мовою!
- Вся документація українською.
- Після кожного великого етапу — PDF-звіт сесії (`reportlab`, DejaVu Sans) та оновлення replit.md.
- Готовий приймати поради та архітектурні рішення.

## Gotchas

- **PDF Fonts:** Only `DejaVu Sans` via TTFont is supported for Cyrillic.
- **`version.gen.js`:** Do not edit manually; generated via `npm run version`.
- **Android Notification Icon:** Use `ic_stat_running.xml` for Android notifications.
- **Splash Screen:** Implemented as an HTML/CSS animation, not a Capacitor plugin.
- **Step Counter Priority:** Android Foreground Service takes precedence over local DB for step data.
- **ECharts Empty States:** Display specific messages if data is insufficient for charts (e.g., <3 measurements for IZ-trend, <10 pairs for Scatter).
- **`tips_cache` TTL:** Always check `Math.floor(Date.now()/1000) < expires_at` before updating tips.
- **`migrateV1toV2`:** The migration logic is idempotent and should not be altered.
- **`_setStateRef(state)`:** Must be called from `app.js` after initialization, before first use of `db.js`.

## Pointers

- **PDF Session Reports:** `HealthPro-Moie-Zdorovia/generate_session_report_*.py`
- **Android Step Counter Service:** `android/app/src/main/java/ua/healthpro/app/StepCounterService.java`
- **Version Generation Script:** `scripts/gen-version.js`
- **DB API:** `src/core/db.js`
- **Charts API:** `src/core/charts.js`