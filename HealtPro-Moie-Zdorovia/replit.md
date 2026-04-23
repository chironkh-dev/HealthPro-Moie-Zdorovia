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
    │   └── storage.js      # IndexedDB + localStorage layer (loadState/saveState/saveTheme/DB)
    ├── i18n/
    │   ├── index.js        # реекспорт усіх словників
    │   ├── ui.uk.js        # T_UK
    │   ├── ui.ru.js        # T_RU
    │   ├── welcome-disclaimer.js  # WELCOME_T, DISCLAIMER_T
    │   └── pdf.js          # PDF_LABELS
    ├── features/
    │   ├── meds/index.js   # модуль для логіки ліків (заплановано виокремлення)
    │   └── steps/index.js  # модуль для крокоміра (заплановано виокремлення)
    └── pwa/                # PWA-помічники
```

## Архітектурні рішення
- **Без `window.X`**: усі словники й сховище імпортуються як ES-модулі.
- **Без inline-обробників**: усі `onclick=`/`onchange=`/`oninput=` замінено на атрибути `data-action`/`data-change`/`data-input`. Один делегований listener у `src/app.js` (карта `ACTIONS`) маршрутизує події.
- **Бекенд видалено**: усі дані зберігаються лише на пристрої. Async-міграція з `localStorage` у `IndexedDB` запускається при старті.
- **PDF/canvas через npm**: `jspdf` і `html2canvas` бандляться Vite, без CDN.
