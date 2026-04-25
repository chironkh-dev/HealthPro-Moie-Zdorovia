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
- [ ] Етап 5 — локальна БД (рекомендація: @capacitor-community/sqlite)
- [ ] Підключення Capacitor-плагінів (Notifications, Health)

## Скрипти

- `scripts/generate_report.cjs` — генерує `attached_assets/HealthPro_Refactor_Report_Stage_4_complete.pdf` через jsPDF + DejaVu Sans (підтримка кирилиці). Запуск: `node scripts/generate_report.cjs`.
