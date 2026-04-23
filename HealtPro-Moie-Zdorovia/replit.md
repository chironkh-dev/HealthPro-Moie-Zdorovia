# HealthPro — Моє Здоров'я

PWA-щоденник здоров'я (тиск, пульс, ліки, кроки), повністю фронтендовий, без бекенду.

## Стек
- Vite 5 (port 5000, host 0.0.0.0)
- Vanilla JS (ES-модулі)
- IndexedDB (`HealthProDB`) як основне сховище + `localStorage` як синхронне дзеркало для миттєвого старту
- npm-залежності (без CDN): `jspdf`, `html2canvas`

## Скрипти
- `npm run dev` — запуск Vite на порту 5000 (workflow `Start application`)
- `npm run build` — продакшн збірка у `dist/`
- `npm run preview` — preview збірки

## Структура
```
HealtPro-Moie-Zdorovia/
├── index.html              # розмітка (без inline JS, без CDN)
├── manifest.json           # PWA-маніфест
├── service-worker.js       # SW
├── vite.config.js          # порт 5000, host 0.0.0.0, deploy=static
└── src/
    ├── main.js             # entry: bootstrap storage + boot app
    ├── app.js              # уся логіка (тиск, історія, аналіз, профіль, експорт, PWA)
    ├── core/
    │   ├── storage.js      # IndexedDB + localStorage layer (loadState/saveState/saveTheme/DB)
    │   └── state.js        # shared mutable state container + saveData/persistTheme/persistLang
    │                         + toast registry + tiny event bus + today() helper
    ├── i18n/
    │   ├── index.js        # реекспорт усіх словників
    │   ├── ui.uk.js        # T_UK
    │   ├── ui.ru.js        # T_RU
    │   ├── welcome-disclaimer.js  # WELCOME_T, DISCLAIMER_T
    │   └── pdf.js          # PDF_LABELS
    ├── features/
    │   ├── meds/
    │   │   ├── index.js    # ліки: addPill/togglePill/deletePill/renderPills/checkDrugName
    │   │   │                 + isPillDueToday/getDayName/fmtPillDate/onPillDaysChange
    │   │   │                 + validateDosageAmount/searchPharmacy
    │   │   └── drug-db.js  # довідник препаратів з добовими дозами та застереженнями
    │   └── steps/index.js  # крокомір: toggleStepCounter/enableSteps/updateStepUI/saveStepGoal
    └── pwa/                # PWA-помічники
```

## Спільний стан
`src/core/state.js` експортує єдиний об'єкт `state` із полями `measurements`, `pills`, `pillsTaken`, `settings`, `lang`, `isDark`. Усі модулі (`src/app.js` + `features/*`) працюють з тими ж самими посиланнями на масиви/об'єкти. Правило: **мутувати на місці** (`push`/`splice`/`length=0`/`Object.assign`), а не переприсвоювати — інакше посилання розбіжаться. `saveData()` записує весь стан у IndexedDB+localStorage.

Cross-module комунікація — через мінішину `on('event', fn)` / `emit('event')` в `state.js` (наразі meds emit-ить `pills:changed` після додавання/видалення).

## Архітектурні рішення
- **Без `window.X`**: усі словники й сховище імпортуються як ES-модулі.
- **Без inline-обробників**: усі `onclick=`/`onchange=`/`oninput=` замінено на атрибути `data-action`/`data-change`/`data-input`. Один делегований listener у `src/app.js` (карта `ACTIONS`) маршрутизує події.
- **Бекенд видалено**: усі дані зберігаються лише на пристрої. Async-міграція з `localStorage` у `IndexedDB` запускається при старті.
- **PDF/canvas через npm**: `jspdf` і `html2canvas` бандляться Vite, без CDN.
