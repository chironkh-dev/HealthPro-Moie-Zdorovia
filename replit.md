# HealthPro · Моє Здоров'я

HealthPro is a personal health diary for monitoring blood pressure, pulse, medication intake, steps, and overall health analytics, functioning completely offline without a server or cloud.

## Run & Operate

```bash
npm run dev      # Starts Vite dev-server on port 5000
npm run build    # Creates production build in dist/
npm run test     # Runs tests
```

## Stack

- **Framework:** Vanilla JS (ES-modules)
- **Runtime:** Vite 5
- **Native Wrapper:** Capacitor 8 (Android)
- **Data Storage:** IndexedDB (`HealthProDB`), localStorage, SQLite (`@capacitor-community/sqlite`) for native
- **PDF/Image Generation:** `jspdf`, `html2canvas`
- **Testing:** Vitest 4.1.5

## Where things live

- `index.html`: Main HTML entry point.
- `src/main.js`: Application bootstrap.
- `src/app.js`: Central dispatcher and initialization.
- `src/core/storage.js`: Handles 3-level data persistence and default settings.
- `src/core/state.js`: Manages shared application state, toasts, and event bus.
- `src/core/platform.js`: Capacitor plugin wrappers for notifications, steps, and files.
- `src/i18n/`: Internationalization files (e.g., `ui.uk.js`, `pdf.js`).
- `src/features/pressure/`: Blood pressure and pulse monitoring logic.
- `src/features/analytics/`: Health Index (ІЗ), BMI calculation, recommendations.
- `src/features/steps/`: Pedometer logic and modes.
- `android/app/src/main/java/ua/healthpro/app/`: Android native code, including `StepCounterService.java` for foreground step counting.
- `android/app/src/main/AndroidManifest.xml`: Android application manifest with permissions.

## Architecture decisions

- **No `window.X`:** All modules and dictionaries are imported via ES-imports.
- **No inline handlers:** `data-action` / `data-change` attributes with a single delegated listener in `app.js`.
- **Event Bus:** `emit('event:name')` / `on('event:name', cb)` for inter-module communication, reducing direct dependencies.
- **In-place State Mutation:** State is mutated directly (e.g., `state.X = ...`), followed by `saveData()`.
- **i18n Enforcement:** All user-facing strings are localized via `t()` / `tt()` functions.
- **Offline-First:** All data is stored locally on the device; no backend or cloud integration.

## Product

- **Health Monitoring:** Track blood pressure, pulse, medication, and steps.
- **Health Analytics:** Calculate Health Index (ІЗ), BMI, and receive personalized recommendations.
- **PDF Reports:** Generate and share health reports.
- **Medication Reminders:** Schedule and receive notifications for medication intake.
- **Pedometer:** Monitor steps with foreground and active-only modes.
- **Personalized Norms:** Customize blood pressure and pulse thresholds.

## User preferences

- Спілкування виключно українською! Готовий прийняти поради, та рішення розвитку проекта

## Gotchas

- **PDF Font:** Only Arial font is supported for Cyrillic characters in PDF reports. Do not use Roboto or Helvetica.
- **Step Counter Data Priority:** The Foreground Step Service data always takes precedence over locally stored database data.
- **JSON Import for Steps:** Importing data will reset `stepsEnabled` to `false` if the step counter was not active before import, to prevent crashes.

## Pointers

- _Populate as you build_