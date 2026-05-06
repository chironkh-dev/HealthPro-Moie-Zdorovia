# HealthPro — Моє Здоров'я

PWA-щоденник здоров'я (тиск, пульс, ліки, кроки), повністю фронтендовий, без бекенду.

## Стек

| Компонент | Версія / деталі |
|---|---|
| Vite | 5, порт 5000, host 0.0.0.0 |
| JavaScript | Vanilla ES-модулі (без фреймворків) |
| Capacitor | 8 — Android-білд |
| Сховище | IndexedDB (`HealthProDB`) + `localStorage` дзеркало |
| npm-залежності | `jspdf`, `html2canvas` (без CDN) |
| Тести | Vitest 4, node-середовище (без jsdom) |

## Скрипти

```bash
npm run dev    # Vite на порту 5000 (workflow «Start application»)
npm run build  # продакшн збірка у dist/
npm run test   # 475 тестів (vitest)
```

## Структура проєкту

```
HealthPro-Moie-Zdorovia/
├── index.html                  # розмітка (без inline JS, без CDN)
├── manifest.json               # PWA-маніфест
├── service-worker.js           # SW
├── vite.config.js
└── src/
    ├── main.js                 # entry: bootstrap storage + boot app
    ├── app.js                  # ACTIONS-dispatch + вся ініціалізація
    ├── core/
    │   ├── storage.js          # IndexedDB + localStorage + defaultSettings
    │   ├── state.js            # shared mutable state + toast/event-bus
    │   ├── platform.js         # Capacitor-wrappers (notif, prefs, step service)
    │   └── constants.js        # STEP_LINEAR_THRESHOLD=3.0, STEP_MIN_PEAK_SAMPLES=2
    ├── i18n/
    │   ├── index.js
    │   ├── ui.uk.js            # T_UK (всі step-modal + battery-opt ключі)
    │   ├── ui.ru.js            # T_RU
    │   ├── welcome-disclaimer.js
    │   └── pdf.js
    └── features/
        ├── meds/               # ліки
        ├── steps/
        │   └── index.js        # крокомір (повний опис нижче)
        ├── analytics/          # BMI, рекомендації, тренди
        ├── charts/
        ├── history/
        ├── export/
        ├── settings/
        └── pwa/

android/app/src/main/java/ua/healthpro/app/
├── StepCounterService.java     # Foreground Service (TYPE_STEP_COUNTER) — ПЕРЕЗАПИС
├── ForegroundStepPlugin.java   # Capacitor Plugin bridge — ПЕРЕЗАПИС
├── BootReceiver.java           # Відновлення після reboot/оновлення — НОВИЙ
└── MainActivity.java           # реєструє ForegroundStepPlugin
android/app/src/main/AndroidManifest.xml
```

---

## Крокомір — архітектура (сесія травень 2026 — рефакторинг)

### Три баги що були знайдені під час реального тестування

| # | Симптом | Першопричина | Рішення |
|---|---|---|---|
| 1 | Сповіщення показує ≠ кількість в UI | Сервіс транслював delta сесії, JS додавав поверх денного підсумку | EXTRA_INITIAL_STEPS: сервіс = delta + initialSteps (повний добовий підсумок) |
| 2 | Тапи по екрану рахуються як кроки | LINEAR_THRESHOLD=2.0 надто чутливий | Поріг 3.0 + STEP_MIN_PEAK_SAMPLES=2 (≥40 мс пік; тапи <20 мс) |
| 3 | Сервіс гине після тестування надворі | Немає BootReceiver; stopWithTask=true; немає SharedPreferences | BootReceiver + stopWithTask=false + onResume health-check |

### Два режими

| Режим | Клас | Поведінка при вбиванні |
|---|---|---|
| `'foreground'` | `StepCounterService` (Android FG Service) | Перезапускається через AlarmManager; BootReceiver після reboot |
| `'active-only'` | DeviceMotion listener у JS | Зупиняється при закритті вкладки |

### Потік дозволів (UX)

```
toggleStepCounter()
  └── showStepPermModal()    ← Modal A: пояснення навіщо кроки
        └── acceptStepPerm() → requestActivityPermission() (system dialog)
              ├── granted + Android → showStepFgModal()   ← Modal B: FG-consent
              │     ├── acceptStepFg()  → enableSteps('foreground')
              │     └── declineStepFg() → enableSteps('active-only')
              └── denied → showToast(st-perm-denied)
```

### Алгоритм фільтрації кроків (steps/index.js)

```
DeviceMotion event (~50 Гц)
  → лінійне прискорення mag (м/с²)
  → mag >= 3.0 ? _peakSamples++ : _peakSamples = 0
  → _peakSamples >= 2 ? _inPeak = true    ← TAP FILTER (~40 мс мін.)
  → mag < 3.0 && _inPeak ? крок! (якщо debounce 250 мс пройшов)
```

### Стійкість FG-сервісу

| Сценарій | Захист |
|---|---|
| Свайп з Recent Apps | `stopWithTask=false` + `onTaskRemoved` → AlarmManager 2 с |
| Android Doze | `START_STICKY` + onResume health-check у JS |
| Reboot пристрою | `BootReceiver` (BOOT_COMPLETED) + SharedPreferences initialSteps |
| Оновлення APK | `BootReceiver` (MY_PACKAGE_REPLACED) |
| Samsung Max Power | одноразовий `requestBatteryOptExemption()` після першого старту |

### Ключові Android-файли

- **StepCounterService**: `currentSteps = (rawSteps − baseline) + initialSteps`; `onTaskRemoved` + AlarmManager; SharedPreferences (`hp_step_prefs`): was_running, goal, step_date, saved_steps
- **ForegroundStepPlugin**: `start(goal, title, text, initialSteps)`; `getSteps()` → `{ steps, running, sensorAvailable }`; `getBatteryOptStatus()`; `requestBatteryOpt()`
- **BootReceiver**: читає SharedPreferences, відновлює сервіс з тими ж initialSteps (або 0 якщо новий день)
- **Маніфест**: `stopWithTask="false"`, `<receiver .BootReceiver>`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`

### platform.js — повний список хелперів

```js
checkActivityPermission()          // перевірка статусу дозволу
requestActivityPermission()        // системний діалог (Android 10+)
startStepService(goal, t, text, initialSteps) // запуск FG-сервісу
stopStepService()                  // зупинка
getServiceStatus()                 // { steps, running, sensorAvailable }
getServiceStepCount()              // shim → getServiceStatus().steps
addStepUpdateListener(handler)     // live-оновлення; повертає unsub()
getBatteryOptStatus()              // чи виключено з оптимізації
requestBatteryOptExemption()       // системний діалог оптимізації
onResume(handler)                  // Capacitor App resume event
```

---

## BMI (травень 2026)

- `getBMICategory(bmi, age)` — для 65+ застосовуються підвищені норми (22–27 нормальна зона)
- `renderBMI()` — показує вікову позначку та ідеальний діапазон ваги з урахуванням віку

---

## Тести

| Параметр | Значення |
|---|---|
| Середовище | `vitest` / `node` (без jsdom) |
| Всього тестів | **475** (15 файлів) |
| Стан | ✅ всі зелені |
| Час виконання | ~4 с |

### DOM у тестах

```js
vi.spyOn(global, 'document', 'get').mockReturnValue({
  getElementById: (id) => domStubs[id] || null,
  body: { style: {} },
});
```

### Важливе правило для debounce-тестів

```js
// В beforeEach — запобігає взаємному забрудненню lastStepTs між тестами
vi.useFakeTimers({ now: new Date('2030-01-01').getTime() });
```

### Правило MIN_PEAK_SAMPLES у тестах

З `STEP_MIN_PEAK_SAMPLES=2` потрібно **два** послідовних rise-events перед peak:

```js
// helper у step-fixes.test.js
function fireRise(x, y, z, n = 2) {
  for (let i = 0; i < n; i++) fireMotion(makeLinearEvent(x, y, z));
}
```

---

## Архітектурні рішення

- **Без `window.X`**: усі словники й сховище — ES-модулі.
- **Без inline-обробників**: `data-action`/`data-change`. Один делегований listener у `app.js` (ACTIONS-карта).
- **Бекенд видалено**: дані лише на пристрої (localStorage + IndexedDB).
- **PDF/canvas через npm**: `jspdf` і `html2canvas`, без CDN.

---

## Генерація PDF-звітів

- **ШРИФТ: ТІЛЬКИ Arial.** Кирилиця: `registerFont('Arial', '/usr/share/fonts/truetype/msttcorefonts/Arial.ttf')`
- Заборонено: DejaVu, Roboto, Helvetica (не підтримують кирилицю в reportlab/pdfkit)
- Скрипт: `HealthPro-Moie-Zdorovia/generate_report.py`

---

## Спільний стан

`src/core/state.js` — єдиний об'єкт `state`. Правило: **мутувати на місці**, не переприсвоювати. `saveData()` → IndexedDB + localStorage.

`defaultSettings` (`storage.js`) включає:

```js
stepGoal: 10000,
stepsEnabled: false,
stepMode: 'active-only',   // 'foreground' | 'active-only'
```

---

## Історія етапів

| Фаза | Дата | Що зроблено |
|---|---|---|
| Фаза 1 | лютий–березень 2026 | Рефакторинг: модулі, `data-action`, видалення `window.X` |
| Фаза 2 | квітень 2026 | BugFix: 9 виправлень, 424/424 тести |
| Фаза 3а | травень 2026 | BMI 65+; Android Foreground Step Service (перший варіант) |
| Фаза 3б | травень 2026 | Рефакторинг крокоміра: 3 критичні баги виправлено, 475/475 тестів |
| **v5.1** | **2026-05-06** | **SQLCipher, ScatterChart, BarChart BP-Zones, Офлайн поради, Журнал з date-range, i18n +15 ключів** |

---

## Поточна версія: v5.1.0

### ✅ v5.1 — ВИКОНАНО (2026-05-06)
- SQLCipher: `getOrCreateKey()` + `createConnection(encrypted=true, 'secret')` → `sqlite.js`
- ScatterChart Кроки↔Тиск → `analytics/scatter.js` (CanvasRenderer, disposeScatterChart)
- BarChart розподіл зон ВООЗ → `analytics/bp-zones.js` (SVGRenderer, 6 категорій)
- Офлайн поради ВООЗ → `features/tips/index.js` + `assets/tips/tips_uk.json` / `tips_ru.json`
- Журнал date-range picker → `features/journal/index.js` (setJournalFrom/To/Type)
- i18n uk/ru +15 нових ключів; tips.css; app.css; index.html; app.js dispose логіка

### ✅ v5.1.1 — BUGFIX (2026-05-06)
- **Зникнення графіків після перемикання вкладок** — корінь: `el.innerHTML=''` без `disposeChart()` → WeakMap повертав мертвий ECharts-інстанс
- Виправлено в `iz-chart.js`, `scatter.js`, `bp-zones.js`: `disposeChart(el)` на початку кожного render
- `app.js`: додано `disposeIZChart()` при виході з вкладки «Аналіз» + імпорт

### 🟡 v5.2 — НАСТУПНИЙ СПРИНТ
- Нотатки до вимірювань (textarea при збереженні)
- Adherence-трекер ліків (`analytics/adherence.js`)
- Повторення розкладу ліків (UI для поля `days`)
- PDF-звіт для лікаря (ECharts SVG → reportlab)
