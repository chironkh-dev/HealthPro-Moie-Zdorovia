# HealthPro · Моє Здоров'я

## Про проєкт

**HealthPro** — персональний щоденник здоров'я для моніторингу артеріального тиску, пульсу, прийому ліків, кроків та аналітики стану організму. Повністю офлайн, без сервера, без хмари. Нативна Android-збірка через Capacitor (PWA-фаза завершена і видалена).

### Уподобання користувача
- Спілкування виключно українською! Готовий прийняти поради, та рішення розвитку проекта

---

## Технічний стек

| Шар | Технологія |
|---|---|
| Збірка / dev-сервер | Vite 5 (порт 5000, host 0.0.0.0) |
| Мова | Vanilla JS (ES-модулі, без TypeScript) |
| Нативна оболонка | Capacitor 8 (Android) |
| Сховище даних | IndexedDB (`HealthProDB`) — основне; localStorage — синхронне дзеркало; SQLite (`@capacitor-community/sqlite`) — на нативі |
| PDF / зображення | `jspdf` + `html2canvas` (через npm, без CDN) |
| Тести | Vitest 4.1.5 (node-середовище, без jsdom) |

---

## Команди

```bash
npm run dev      # Vite dev-сервер на порті 5000 (workflow "Start application")
npm run build    # Продакшн збірка → dist/
npm run test     # Запуск тестів (228 тестів у 9 файлах, ~2.4с)
```

---

## Структура проєкту

```
HealthPro-Moie-Zdorovia/
├── index.html                   # HTML-оболонка (без inline JS, без CDN)
├── manifest.json                # PWA-маніфест
├── service-worker.js            # Service Worker (офлайн)
├── vite.config.js               # dev: port 5000; build → ../dist/
└── src/
    ├── main.js                  # Точка входу: bootstrapStorage() + bootApp()
    ├── app.js                   # ACTIONS-диспетчер + вся ініціалізація
    ├── core/
    │   ├── storage.js           # 3-рівнева персистентність + defaultSettings
    │   ├── state.js             # Спільний стан + toast + event-bus
    │   ├── platform.js          # Capacitor-обгортки (сповіщення, кроки, файли)
    │   └── constants.js         # Константи (DEFAULT_STEP_GOAL, порогові значення)
    ├── i18n/
    │   ├── index.js             # Реекспорт усіх словників
    │   ├── ui.uk.js             # T_UK — весь UA інтерфейс
    │   ├── ui.ru.js             # T_RU — весь RU інтерфейс
    │   ├── welcome-disclaimer.js
    │   └── pdf.js               # Словник для PDF-звітів
    └── features/
        ├── pressure/            # Тиск і пульс, класифікація ВООЗ/АНА
        ├── analytics/
        │   ├── index.js         # Сторінка аналітики, рендер дашборду
        │   ├── health-score.js  # Розрахунок Індексу здоров'я (ІЗ)
        │   ├── bmi.js           # Розрахунок ІМТ (з корекцією для 65+)
        │   ├── recommendations.js
        │   └── trend-modal.js
        ├── steps/
        │   └── index.js         # Крокомір: режими foreground / active-only
        ├── meds/                # Менеджер ліків
        ├── charts/              # Графіки
        ├── history/             # Журнал вимірювань
        ├── export/              # PDF / CSV / JSON
        ├── settings/            # Профіль, теми, сповіщення, i18n
        └── pwa/                 # PWA-встановлення, SW-реєстрація

android/app/src/main/java/ua/healthpro/app/
├── StepCounterService.java      # Foreground Service (TYPE_STEP_COUNTER)
├── ForegroundStepPlugin.java    # Capacitor Plugin bridge → JS
└── MainActivity.java            # Реєстрація ForegroundStepPlugin
android/app/src/main/AndroidManifest.xml
  # Дозволи: FOREGROUND_SERVICE, FOREGROUND_SERVICE_HEALTH, ACTIVITY_RECOGNITION
```

---

## Архітектурні принципи

- **Без `window.X`** — усі модулі та словники через ES-imports.
- **Без inline-обробників** — `data-action` / `data-change`. Один делегований listener у `app.js`.
- **Event bus** — `emit('event:name')` / `on('event:name', cb)` замість прямих залежностей між модулями.
- **Мутація стану на місці** — `state.X = ...`, не перезаписувати `state`. Після змін — `saveData()`.
- **i18n через `t()` / `tt()`** — жодних хардкодованих рядків у коді (перевірено grep).
- **Бекенд видалено** — усі дані зберігаються лише на пристрої.

---

## Індекс здоров'я (ІЗ) — логіка

### Формула (динамічний знаменник)

```
ІЗ = round(rawTotal / maxPossible × 100)
```

| Модуль | Вага (max) | Виключається коли |
|---|---|---|
| Тиск (BP) | 40 балів | Ніколи — завжди активний |
| Пульс | 20 балів | Ніколи (відсутні дані → 0 балів) |
| Ліки | 20 балів | Ніколи (0% = 0 балів у знаменнику) |
| ІМТ | 10 балів | `height` або `weight` не задано → null → виключається |
| Активність | 10 балів | `stepsEnabled = false` → null → виключається |

### ВЕТО-коефіцієнти (за останнім виміром)

| Умова | Коефіцієнт | status |
|---|---|---|
| sys ≥ 180 АБО dia ≥ 120 | ×0.30 | `crisis` |
| sys ≥ 160 АБО dia ≥ 100 | ×0.60 | `hypertension-2` |
| sys < 85 АБО dia < 55 | ×0.55 | `hypotension` |

При активному ВЕТО — кільце та числовий бал у UI стають червоними (#ef4444), незалежно від числового значення.

### Персоналізовані норми

- **BP**: якщо `normalSys` / `normalDia` задані у профілі → особиста шкала відносно базового тиску.
- **Пульс**: якщо `normalPulse` задано → ±10 = ідеально, ±20 = прийнятно.
- **ІМТ (65+)**: нормальна зона зміщена до 22–27 (замість 18.5–24.9).

---

## Крокомір — архітектура

### Два режими

| Режим | Реалізація | Зупиняється |
|---|---|---|
| `foreground` | `StepCounterService.java` (Android Foreground Service, TYPE_STEP_COUNTER) | Тільки при явній зупинці |
| `active-only` | DeviceMotion listener у JS | При закритті вкладки |

### Оновлення нотифікації (Round 5)

- `updateNotification()` викликається на **кожен крок** (throttle прибрано) → шторка = додаток в реальному часі.
- `saveStepState()` — кожні 20 кроків (збереження на диск, не перевантажує I/O).
- Назва сповіщення: `"HealthPro"` (без емодзі 🦶).
- Іконка кроків: `ic_stat_steps` (walking person); іконка тиску: `ic_stat_notification` (серце).

### Виправлення після змахування (Round 6)

- `_setupResumeHealthCheck()` — гілка `else` (сервіс живий): якщо `fgUnsubscribe = null` → підключає listener автоматично при поверненні в додаток.
- Попередньо лише синхронізувало лічильник, але не підключало broadcast-listener.

### Захист JSON-імпорту (Round 6)

- `importData()` в `csv.js`: зберігає `prevStepsEnabled` ПЕРЕД `Object.assign(state.settings, ...)`.
- Якщо кроковмір не був активний до імпорту — `stepsEnabled` примусово `false` після merge.
- Запобігає краху: при перезавантаженні після імпорту `enableSteps()` не викликається без дозволу.

### Пріоритет даних (Баг #4 fix — травень 2026)

**Сервіс завжди має пріоритет над локальною БД:**
- При `enableSteps('foreground')`: спочатку перевіряємо `getServiceStatus()`.
  - Якщо `running=true` → беремо кроки З СЕРВІСУ, НЕ перезапускаємо сервіс.
  - Якщо `running=false` → стартуємо сервіс з даними БД.
- При `restoreSteps()`: аналогічна логіка + встановлює `stepEnabled=true` якщо сервіс живий.
- `_setupResumeHealthCheck()`: при поверненні в додаток — тихий sync або перезапуск.

### Потік дозволів (UX)

```
toggleStepCounter()
  └── showStepPermModal()        ← Modal A: пояснення
        └── acceptStepPerm() → requestActivityPermission() (системний діалог)
              ├── granted + Android → showStepFgModal()   ← Modal B: FG-consent
              │     ├── acceptStepFg()  → enableSteps('foreground')
              │     └── declineStepFg() → enableSteps('active-only')
              └── denied → showToast(st-perm-denied)
```

---

## ІМТ (BMI)

- `calcBMI()` — вага(кг) / зріст(м)²
- `getBMICategory(bmi, age)` — для 65+ застосовуються підвищені норми (22–27 = норма)
- `renderBMI()` — показує вікову позначку та ідеальний діапазон ваги

---

## Сповіщення (Android)

- Канал `reminders` з importance=5 (HIGH), звук, вібрація, lights.
- Планування через Android AlarmManager (`schedule.on`, `allowWhileIdle: true`) — спрацьовує навіть при вбитому додатку.
- `platform.ensureNotificationChannel()` — один раз після надання дозволу.
- `notifications.scheduleAllReminders()` — cancel(all) + schedule для кожного ліку + ранкового/вечірнього нагадування.

---

## PDF-звіти

- **Шрифт: ТІЛЬКИ Arial** (кирилиця). Заборонено: Roboto, Helvetica. Увага до стилів та форматування документа. Строки, перенос, та іньше.
- На Android: `Filesystem.writeFile → Directory.Documents → Share.share` (системний sheet).
- На вебі: `<a download>` / `URL.createObjectURL`.

---

## Тести (Vitest)

| Файл | Тестів | Що перевіряє |
|---|---|---|
| `health-score.test.js` | 16 | calcHealthScore(): ВЕТО, статус, пульс, ІМТ, ліки |
| `bp-pulse-thresholds.test.js` | 57 | getBPThresholds(), getPulseThresholds(): вікові групи, особиста норма |
| `health-score-i18n.test.js` | 22 | toggleHealthTooltip(): ВЕТО/норма uk↔ru, DOM-мок |
| `veto-boundary.test.js` | 41 | Граничні значення sys/dia, коефіцієнти, пріоритет ВЕТО |
| `activity-score.test.js` | 36 | scoreActivity(): 5 смуг прогресу, кастомна ціль |
| `pills-score.test.js` | 31 | scorePills(): 0%/50%/90%+, граничні точки |
| `bmi.test.js` | 6 | calcBMI(), getBMICategory(): категорії, i18n |
| `bp-norm.test.js` | 8 | getBPNorm(): вікові смуги, мова |
| `pill-schedule.test.js` | 11 | isPillDueToday(): daily, weekdays, legacy |
| **Разом** | **228** | **Усі проходять (~2.4 с)** |

---

## Збірка APK (GitHub Actions)

- Workflow: `.github/workflows/android-apk.yml`
- Тригер: push до `main`, `workflow_dispatch`
- Стек: JDK 21, Android SDK, `npm ci` → `vite build` → `cap sync android` → `./gradlew assembleDebug`
- Артефакт: `HealthPro-debug-<git-sha>.apk` (зберігається 30 днів)

---

## Зовнішні залежності (npm)

| Пакет | Версія | Призначення |
|---|---|---|
| `vite` | ^5.4.10 | Збірка / dev-сервер |
| `vitest` | 4.1.5 | Тести |
| `jspdf` | 2.5.2 | PDF-генерація |
| `html2canvas` | 1.4.1 | Скріншот для PDF |
| `@capacitor/core` | 8.x | Capacitor runtime |
| `@capacitor/android` | 8.x | Android-нативна оболонка |
| `@capacitor-community/sqlite` | 8.1.0 | SQLite на нативі |
| `@capacitor/local-notifications` | 8.0.2 | Нативні сповіщення |
| `@capacitor/filesystem` | 8.1.2 | Запис файлів на Android |
| `@capacitor/share` | 8.0.1 | Системний Share Sheet |
| `@capacitor/preferences` | 8.0.1 | KV-сховище дрібних налаштувань |
| `@capacitor/motion` | 8.0.0 | DeviceMotion (резервний крокомір) |
| `@capacitor/haptics` | 8.0.2 | Тактильний відгук |
| `@capacitor/app` | 8.1.0 | Lifecycle (foreground/background) |
| `@capacitor/splash-screen` | 8.0.1 | Splash-екран |
| `@capacitor/status-bar` | 8.0.2 | Стиль статус-бару |

---

## Історія розробки

| Фаза | Опис |
|---|---|
| Фаза 1 | Рефакторинг: модулі, `data-action`, видалення `window.X`, i18n |
| Фаза 2 (квітень 2026) | 10 BugFix, збірка APK через GitHub Actions, SQLite-інтеграція |
| APK Round 3 | Нативні сповіщення (AlarmManager), іконка, PDF/CSV через Filesystem+Share, кнопка Назад |
| APK Round 4 | Android Foreground Step Service, BMI 65+, 34 нових тести |
| Фаза 3 (травень 2026) | ІЗ: динамічний знаменник, ВЕТО-коефіцієнти, 228 тестів, i18n повний |
| Сесія травень 2026 #2 | Баг #4 крокоміра (пріоритет сервісу), іконка сповіщення, видалення PWA, 475 тестів |
| Сесія травень 2026 #3 | Тогл 1 "Нагадування про ліки": pillReminder, SCHEDULE_EXACT_ALARM, розклад по типу (daily/date/weekdays), 475 тестів |
| Round 5 (05.05.2026) | Шторка=Додаток: throttle прибрано (кожен крок), збереження кожні 20; emoji прибрано з notifTitle; іконки розділені (серце=BP, людина=кроки); тогл ліків спрощено — без ExactAlarm, dailyAt+isPillDueToday для всіх пігулок |
| Round 6 (05.05.2026) | Баг JSON-імпорту: stepsEnabled захист при importData(); після змахування: onResume підключає fgUnsubscribe якщо сервіс живий; Splash Screen (1.35с, колір іконки); видалено "PWA" з версії; APP_VERSION→5.0; менший шрифт welcome screen |
