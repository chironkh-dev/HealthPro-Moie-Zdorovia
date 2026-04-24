# HealthPro · Моє Здоров'я

Українська PWA для контролю артеріального тиску, пульсу та прийому ліків. Готується до нативного білду через Capacitor (Android / iOS).

## Стек

- Vite 5 (dev-сервер на порту 5000, host 0.0.0.0)
- Vanilla JS (модулі ESM)
- jsPDF + html2canvas — експорт звітів
- Capacitor 8 — нативна обгортка (плагіни поки не підключені)

## Структура `HealtPro-Moie-Zdorovia/src/`

```
src/
├─ app.js                 UI-оркестратор (~1652 рядки, поступово зменшується)
├─ core/
│  ├─ state.js            єдиний state, saveData, showToast, on/emit
│  └─ utils.js            formatTime, formatDate, todayISO, avg
└─ features/
   ├─ pressure/           Етап 4-А — норми, ВООЗ, критичні стани, saveMeasurement
   │  ├─ norm.js
   │  ├─ who.js
   │  ├─ critical.js
   │  └─ index.js
   ├─ charts/             Етап 4-Б — графік тиску/пульсу з тултіпами
   │  ├─ helpers.js       pure-функції: шкала, осі, малювання серій
   │  ├─ bp-chart.js      стан, renderChart, setChartPeriod, togglePulseChart, setupChartTooltip
   │  └─ index.js
   └─ meds/               існуючий модуль ліків
      └─ index.js
```

## Workflow

- `Start application` → `cd HealtPro-Moie-Zdorovia && npm run dev -- --host 0.0.0.0 --port 5000`

## Конвенції

- Користувач спілкується українською. Без емодзі без явного запиту.
- Усі feature-модулі імпортують `state` з `core/state.js` напряму. Нічого глобального.
- Крос-модульні перерисовки — через шину подій `emit('event:name')` / `on('event:name', ...)`.
- Файли для Capacitor (`capacitor.config.json`) використовують `webDir: "dist"`.

## Прогрес рефакторингу (за планом з PDF)

- [x] Етап 4-А — features/pressure
- [x] Етап 4-Б — features/charts
- [ ] Етап 4-В — features/analytics (health-score, тренди)
- [ ] Етап 4-Г — features/history (renderHistory, експорт CSV/PDF)
- [ ] Етап 4-Д — features/settings + i18n + theming
- [ ] Підключення Capacitor-плагінів (Notifications, Health)

## Скрипти

- `scripts/generate_report.cjs` — генерує `attached_assets/HealthPro_Refactor_Report_Stage_4.pdf` через jsPDF + DejaVu Sans (підтримка кирилиці).
