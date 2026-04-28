# HealthPro · Моє Здоров'я

Українська PWA для контролю артеріального тиску, пульсу та прийому ліків. Готується до нативного білду через Capacitor (Android / iOS).

## Стек

- Vite 5 (dev-сервер на порту 5000, host 0.0.0.0)
- Vanilla JS (модулі ESM)
- jsPDF + html2canvas — експорт звітів
- Capacitor 8 — нативна обгортка (плагіни поки не підключені)

## Структура `HealthPro-Moie-Zdorovia/src/`

```
src/
├─ app.js                 тонкий оркестратор (~254 рядки)
├─ core/
│  ├─ state.js            єдиний state, saveData, on/emit, setToast, today, DB
│  ├─ storage.js          defaultSettings, ключі LocalStorage
│  └─ utils.js            formatTime, formatDate, todayISO, avg
├─ i18n/
│  └─ index.js            T_UK, T_RU, WELCOME_T, DISCLAIMER_T, PDF_LABELS
└─ features/
   ├─ pressure/   norm, who, critical, index — Етап 4-А
   ├─ charts/     helpers, bp-chart, index   — Етап 4-Б
   ├─ analytics/  health-score, bmi, recommendations, trend-modal, index — Етап 4-В
   ├─ history/    index — Етап 4-Г (журнал з фільтром)
   ├─ export/     csv, modal, pdf, print, logo, index — Етап 4-Г
   ├─ settings/   theme, i18n, profile, notifications, data, disclaimer, index — Етап 4-Д
   ├─ pwa/        index — Етап 4-Д (installApp, registerSW, applyUpdate, online/offline)
   ├─ meds/       drug-db, index
   └─ steps/      index (експортує getStepCount для analytics)
```

## Workflow

- `Start application` → `cd HealthPro-Moie-Zdorovia && npm run dev -- --host 0.0.0.0 --port 5000`

## Конвенції

- Користувач спілкується українською. Без емодзі без явного запиту.
- Усі feature-модулі імпортують `state` з `core/state.js` напряму. Нічого глобального.
- Масиви мутують через `push/splice/length=0`, ніколи не переприсвоюють (інакше посилання в інших модулях розсинхронізуються).
- Крос-модульні перерисовки — через шину подій `emit('event:name')` / `on('event:name', ...)`.
- Зміна мови — модуль реєструє свій рендерер через `registerReRender(fn)` із settings/i18n.js (уникаємо циклічних імпортів).
- `showToast` живе в app.js (DOM-bound), реєструється через `setToast(showToast)` у state.js.
- Файли для Capacitor (`capacitor.config.json`) використовують `webDir: "dist"`.

## Прогрес рефакторингу (за планом з PDF)

- [x] Етап 4-А — features/pressure
- [x] Етап 4-Б — features/charts
- [x] Етап 4-В — features/analytics (health-score, BMI, рекомендації, тренди)
- [x] Етап 4-Г — features/history + features/export (CSV / JSON / друк / PDF)
- [x] Етап 4-Д — features/settings + features/pwa
- [x] BugFix Раунд 1 (6 багів): історія, CSV, дубль PDF, FOUC, друк, контраст
- [x] BugFix Раунд 2 (4 баги): крах PDF (CDN→npm imports), світла тема (FOUC-стиль з !important), sticky-навігація (top:62), локалізація toast (профіль/ліки/нагадування/експорт)
- [x] BugFix Раунд 3 (Phase 2 part 1, 3 баги): sticky-навігація (динамічна `--header-height` + ResizeObserver), модалка експорту автозакривається після Друк/PDF/CSV (обгортки в features/export/index.js), CSV `exportReportCSV` отримує `getExportMeasurements` через обгортку
- [x] Фаза 2 крок 1 — Capacitor плагіни встановлено в обох package.json (root + HealthPro-Moie-Zdorovia): app, filesystem, haptics, local-notifications, preferences, share, splash-screen, status-bar
- [x] Фаза 2 крок 2 — `npx cap sync android` пройшов, 8 плагінів зареєстровано в android/
- [x] Фаза 2 крок 3 — GitHub Actions workflow `.github/workflows/android-apk.yml` для збірки debug APK (артефакт `HealthPro-debug-apk`)
- [x] Фаза 2 крок 4 — APK успішно зібрано користувачем через GitHub Actions (з невеликими правками воркфлоу)
- [x] Етап 5 — локальна БД через `@capacitor-community/sqlite@8.1.0` + 3-tier persistence (SQLite/IDB/LS). Новий `src/core/sqlite.js`, переписаний `src/core/storage.js`. API `loadState/saveState` без змін — feature-модулі не зачеплені. Auto-migration legacy LS → primary та IDB → SQLite (одноразово, тільки нативно).
- [x] Phase 2 + Stage 5 PDF звіт: `attached_assets/HealthPro_Phase2_Stage5_Report.pdf`
- [ ] Фаза 2 раунд 4 — Баг 4: експорт CSV/PDF на нативі не зберігає файл (`<a download>` не працює в Android WebView). План: переробити `platform.js::download()` через `Filesystem.writeFile` + `Share.share`; переробити `csv.js` (через platform.download) і `pdf.js` (`doc.output('blob')` → platform.download).

## Збірка APK
- Локальна збірка в Replit неможлива (немає Java/Android SDK).
- Збірка йде в GitHub Actions (`.github/workflows/android-apk.yml`).
- Після push до `main` (або через `workflow_dispatch`) → GitHub → Actions → Build Android APK → Artifacts → `HealthPro-debug-apk` → файл `HealthPro-debug-<git-sha>.apk`.
- Усередині workflow APK кладеться у `android/app/build/outputs/apk/debug/app-debug.apk` і копіюється в `apk-out/HealthPro-debug-<sha>.apk` перед завантаженням.

## Структура Capacitor (важливо для майбутніх сесій)
- `capacitor.config.json` лежить у **корені репо** (не в HealthPro-Moie-Zdorovia/), з `webDir: "dist"` → відносно кореня.
- `android/` лежить у **корені репо**.
- Vite збирає у `../dist` (відносно HealthPro-Moie-Zdorovia/), тобто також у корені.
- `@capacitor/cli`, `@capacitor/core`, `@capacitor/android` і всі плагіни встановлено в **обох** `package.json` (root + HealthPro-Moie-Zdorovia/), бо `cap sync` запускається з кореня (поряд з config), а сам web-код імпортує плагіни з HealthPro-Moie-Zdorovia/node_modules.

## Скрипти

- `scripts/generate_report.cjs` — генерує `attached_assets/HealthPro_Refactor_Report_Stage_4_complete.pdf` через jsPDF + DejaVu Sans (підтримка кирилиці). Запуск: `node scripts/generate_report.cjs`.
- `scripts/generate_bugfix_report.cjs` — генерує `attached_assets/HealthPro_BugFix_Report.pdf` (Раунд 1+2). Запуск: `node scripts/generate_bugfix_report.cjs`.
