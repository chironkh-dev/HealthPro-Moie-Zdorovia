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
- [x] APK Bug Fix Раунд 3 (T1-T7, виконано до тесту APK):
  - T1 Усунуто весь хардкод UA/RU у фічах (i18n.t/tt + новий `getLocale()` у `core/utils.js`). Залишилися лише легітимні `state.lang === 'ru'` для CSS active-toggle мови та `<html lang>` атрибуту HTML принт-звіту.
  - T2 Модалка ВООЗ повністю через i18n (`who.js`).
  - T3 Хардверна кнопка «Назад» (Android): новий `onBackButton()` + `minimizeApp()` у `core/platform.js`. Логіка в `app.js`: відкрита модалка → закрити; не на Pressure → перейти на Pressure; інакше → minimize.
  - T4 `LocalNotifications` через **ESM dynamic import** `@capacitor/local-notifications` замість `window.Capacitor.Plugins`. Додано `checkNotificationPermission()` та `cancelNotifications()`. `notifications.js` тепер ходить через `notify()`.
  - T5 Експорт CSV/PDF на нативі через `Filesystem.writeFile(Documents) → Share.share({ url })`. `platform.download()` тепер async, з web-fallback. `csv.js` та `pdf.js` використовують `platformDownload(...)`.
  - T6 Модалка дозволу сповіщень одразу після прийняття дисклеймера. Стан зберігається у `prefs.set('notif_permission_asked', ...)`. Новий модуль `features/settings/notif-perm.js`, нова модалка `#notifPermModal` в `index.html`, обробники `acceptNotifPerm/declineNotifPerm/dismissNotifPerm`.
  - T7 `npm test` 41/41, `npm run build` ok, `npx cap sync android` ok (9 плагінів). PDF-звіт: `attached_assets/HealthPro_APK_BugFix_Round3.pdf`.

## APK Bug Fix Round 3 (квітень 2026, продовження)
- **#1 Виправлено баг із модалкою сповіщень**: `onclick="event.stopPropagation()"` всередині `.modal-sheet` блокував document-level dispatcher → замінено на `data-action="stop"`. Кнопки «Дозволити» / «Не зараз» тепер працюють.
- **#2 Email/SMS нагадування**: видалено застарілий блок Google Calendar/PWABuilder/VAPID. Новий модуль `src/features/settings/email-sms.js`. Кнопки використовують `App.openUrl(mailto:/sms:)` через `platform.openUrl()` для нативного intent picker (Gmail / SMS-клієнт).
- **#3 i18n хардкод**: `data.js` (`t('data-clear-confirm')`), `critical.js` (`tt('cr-sms-body')`, `t('cr-test-sms-body')`, `t('cr-emergency-name-default')`). Додано всі ключі в UA та RU словники.
- **#13 Крокомір**: поріг прискорення піднято з 1.5 до 12 m/s² (правильна базова лінія з гравітацією ~9.81). Додано дебаунс `STEP_MIN_INTERVAL_MS=280` (≤ ~3.5 кроку/сек). Підтримка подій `@capacitor/motion` через `e.acceleration` + 9.81. Більше не «вигадує» кроки в спокої.
- **#7 AndroidManifest**: додано `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `VIBRATE`, `FOREGROUND_SERVICE`, `ACTIVITY_RECOGNITION` + `<uses-feature>` крокоміра/детектора. Тег `<queries>` для `mailto:`/`sms:`/`tel:`/`https` (Android 11+ package visibility).
- **#14 Аудит drug-db.js**: переписано всі попередження зрозумілою мовою («не натщесерце» → «приймати після їжі», «контроль K+» → «контролюйте рівень калію (аналіз крові)»). Видалено криптичні крос-посилання `=еналаприл`. Виправлено баг дублікату ключа `периндоприл` (UA-словник перезаписувався RU).
- **#12 Іконка/сплеш**: встановлено `@capacitor/assets` (devDep). Команда `npx capacitor-assets generate --android --assetPath assets` згенерувала 74 файли (mipmap-* іконки + drawable-*-splash) із джерела `HealthPro-Moie-Zdorovia/assets/icon.png` (1024×1024).
- Build: `npx vite build` ok. Залишилось `npx cap sync android` перед збіркою APK.

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
