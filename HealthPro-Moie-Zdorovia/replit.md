# HealthPro — Моє Здоров'я

PWA-щоденник здоров'я (тиск, пульс, ліки, кроки), повністю фронтендовий, без бекенду.

## Стек
- Vite 5 (port 5000, host 0.0.0.0)
- Vanilla JS (ES-модулі)
- Capacitor 8 (Android-білд)
- IndexedDB (`HealthProDB`) як основне сховище + `localStorage` як синхронне дзеркало
- npm-залежності (без CDN): `jspdf`, `html2canvas`

## Скрипти
- `npm run dev` — запуск Vite на порту 5000 (workflow `Start application`)
- `npm run build` — продакшн збірка у `dist/`
- `npm run test` — 461 тест (vitest, node-environment)

## Структура
```
HealthPro-Moie-Zdorovia/
├── index.html              # розмітка (без inline JS, без CDN)
├── manifest.json           # PWA-маніфест
├── service-worker.js       # SW
├── vite.config.js
└── src/
    ├── main.js             # entry: bootstrap storage + boot app
    ├── app.js              # ACTIONS-dispatch + вся ініціалізація
    ├── core/
    │   ├── storage.js      # IndexedDB + localStorage layer + defaultSettings
    │   ├── state.js        # shared mutable state + toast/event-bus
    │   ├── platform.js     # Capacitor-wrappers (notifications, prefs, step service)
    │   └── constants.js
    ├── i18n/
    │   ├── index.js        # реекспорт усіх словників
    │   ├── ui.uk.js        # T_UK (включає всі step-modal ключі)
    │   ├── ui.ru.js        # T_RU
    │   ├── welcome-disclaimer.js
    │   └── pdf.js
    ├── features/
    │   ├── meds/           # ліки
    │   ├── steps/
    │   │   └── index.js    # крокомір: toggleStepCounter / enableSteps (mode) /
    │   │                     disableSteps / restoreSteps / saveStepGoal / updateStepUI
    │   │                     + modal helpers: acceptStepPerm/declineStepPerm/acceptStepFg/declineStepFg
    │   ├── analytics/      # BMI, рекомендації, тренди
    │   ├── charts/
    │   ├── history/
    │   ├── export/
    │   ├── settings/
    │   └── pwa/
    └── ...
android/app/src/main/java/ua/healthpro/app/
├── StepCounterService.java     # Foreground Service (TYPE_STEP_COUNTER)
├── ForegroundStepPlugin.java   # Capacitor Plugin bridge
└── MainActivity.java           # реєструє ForegroundStepPlugin
android/app/src/main/AndroidManifest.xml  # <service foregroundServiceType="health">
```

## Крокомір — архітектура (2026-05)

### Два режими
| Режим | Клас | Коли зупиняється |
|---|---|---|
| `'foreground'` | `StepCounterService` (Android Foreground Service) | тільки при явній зупинці |
| `'active-only'` | DeviceMotion listener в JS | при закритті вкладки |

### Потік дозволів (UX)
```
toggleStepCounter()
  └── showStepPermModal()    ← Modal A: поясннення
        └── acceptStepPerm() → requestActivityPermission() (system dialog)
              ├── granted + Android → showStepFgModal()   ← Modal B: FG-consent
              │     ├── acceptStepFg()  → enableSteps('foreground')
              │     └── declineStepFg() → enableSteps('active-only')
              └── denied → showToast(st-perm-denied)
```

### Ключові файли Android
- **Маніфест**: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_HEALTH`, `ACTIVITY_RECOGNITION` + `<service android:foregroundServiceType="health">`
- **StepCounterService**: baseline-tracking (delta від hardware counter), throttle 10 кроків, `START_STICKY`
- **ForegroundStepPlugin**: `start/stop/getSteps/checkActivityPermission/requestActivityPermission` + `stepUpdate` BroadcastReceiver → JS `notifyListeners`

### platform.js helpers (нові)
`checkActivityPermission`, `requestActivityPermission`, `startStepService`, `stopStepService`, `getServiceStepCount`, `addStepUpdateListener`

## BMI (2026-05)
- `getBMICategory(bmi, age)` — для 65+ застосовуються підвищені норми (22–27 нормальна зона)
- `renderBMI()` — показує вікову позначку та ідеальний діапазон ваги з урахуванням віку

## Спільний стан
`src/core/state.js` — єдиний об'єкт `state`. Правило: **мутувати на місці**, не переприсвоювати. `saveData()` → IndexedDB+localStorage.

`defaultSettings` (storage.js) включає:
- `stepGoal: 10000`, `stepsEnabled: false`, `stepMode: 'active-only'`

## Архітектурні рішення
- **Без `window.X`**: усі словники й сховище — ES-модулі.
- **Без inline-обробників**: `data-action`/`data-change`. Один делегований listener у `app.js` (ACTIONS-карта).
- **Бекенд видалено**: дані лише на пристрої.
- **PDF/canvas через npm**: `jspdf` і `html2canvas`, без CDN.

## Генерація PDF-звітів (scripts/)
- **ШРИФТ: ТІЛЬКИ Arial.** Кирилиця: `doc.registerFont('Arial', '/usr/share/fonts/truetype/msttcorefonts/Arial.ttf')`.
- Заборонено: DejaVu, Roboto, Helvetica (не підтримують кирилицю в pdfkit).

## Тести
- Середовище: `vitest`, `node` (без jsdom)
- DOM-залежні тести: мокають `document.getElementById` через `vi.spyOn(global, 'document', 'get')`
- 461 тест у 14 файлах — усі проходять
- Новий файл: `tests/foreground-step.test.js` (34 тести для steps/index.js + platform wrappers)

## Історія етапів
- Фаза 1 — рефакторинг: модулі, `data-action`, видалення `window.X`.
- Фаза 2 — BugFix (квітень 2026): 9 виправлень, 424/424 тести.
- Фаза 3 (травень 2026, поточна сесія):
  - **BMI 65+**: `getBMICategory(bmi, age)` з підвищеними нормами, вікова позначка в UI.
  - **Android Foreground Step Service**: `StepCounterService.java` + `ForegroundStepPlugin.java` + `MainActivity.java` + маніфест.
  - **JS-інтеграція**: `platform.js` (6 нових хелперів), `steps/index.js` (повна перезапис з 2-modal flow), `index.html` (2 нових модалі), `app.js` (4 нових dispatch-дії), i18n uk+ru (12 нових ключів), `storage.js` (`stepMode`).
  - **Тести**: 34 нових у `foreground-step.test.js`.
