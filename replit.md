# HealthPro · Моє Здоров'я

### Overview
HealthPro is a Ukrainian Progressive Web App (PWA) designed for monitoring blood pressure, pulse, and medication intake. It is being prepared for native build via Capacitor (Android/iOS). The project aims to provide a comprehensive health management solution with features for tracking vital signs, medication reminders, and health analytics, offering a user-friendly experience on both web and mobile platforms.

### User Preferences
- Користувач спілкується українською. Без емодзі без явного запиту.

### System Architecture

The application is built with Vite 5 and Vanilla JS (ESM modules). The core architecture emphasizes a modular approach, with a thin orchestrator (`app.js`) managing various feature modules.

**Core Principles:**
- **State Management:** A single, centralized `state.js` in `core/` handles application state, data saving, event emission, and toast notifications.
- **Modularity:** Features are organized into independent modules under `features/`, each responsible for a specific domain (e.g., `pressure`, `charts`, `analytics`, `history`, `export`, `settings`, `pwa`, `meds`, `steps`).
- **Data Persistence:** The application supports a 3-tier persistence model using `@capacitor-community/sqlite`, IndexedDB, and LocalStorage, with auto-migration from legacy storage types to SQLite on native platforms.
- **Cross-Module Communication:** Achieved via an event bus (`emit('event:name')` / `on('event:name', ...)`) to avoid direct coupling and cyclic imports.
- **Internationalization (i18n):** Language changes trigger re-rendering in registered modules through `settings/i18n.js` to dynamically update UI text.
- **UI/UX:** The application prioritizes clear data visualization and user-friendly interaction. Theming (light/dark) is supported.
- **Native Integration (Capacitor):** The project is transitioning to a native wrapper using Capacitor, incorporating plugins for app functionality, filesystem access, haptics, local notifications, preferences, sharing, splash screen, and status bar.
- **Background Notifications:** Implemented using Capacitor's Local Notifications, ensuring reminders (medication, blood pressure) are delivered even when the app is closed, leveraging Android's AlarmManager.
- **Step Counter:** Utilizes `@capacitor/motion` for step detection with adjusted acceleration thresholds and debounce mechanisms to prevent erroneous readings.
- **Dynamic Styling:** CSS variables like `--header-height` are used for adaptive UI elements, such as sticky navigation, incorporating `ResizeObserver` for dynamic adjustments.

**Key Feature Specifications:**
- **Pressure Module:** Manages blood pressure readings, displaying normal, WHO classifications, and critical values.
- **Charts Module:** Visualizes blood pressure data.
- **Analytics Module:** Provides health scores, BMI calculations, recommendations, and trend analysis.
- **History Module:** A journal with filtering capabilities for past records.
- **Export Module:** Supports exporting data in CSV, PDF, and print formats, including native sharing functionalities.
- **Settings Module:** Manages user preferences, themes, language, profile, notifications, and data management.
- **PWA Module:** Handles PWA installation, service worker registration, and update mechanisms.
- **Meds Module:** Manages medication intake with a drug database and scheduling.
- **Localization:** All hardcoded UA/RU strings removed and managed through `i18n.t`/`tt` and `getLocale()`.

### External Dependencies
- **Vite 5:** Build tool and development server.
- **jsPDF + html2canvas:** For generating PDF reports.
- **Capacitor 8:** Native wrapper for Android/iOS.
    - `@capacitor/app`
    - `@capacitor/filesystem`
    - `@capacitor/haptics`
    - `@capacitor/local-notifications`
    - `@capacitor/preferences`
    - `@capacitor/share`
    - `@capacitor/splash-screen`
    - `@capacitor/status-bar`
    - `@capacitor/motion`
    - `@capacitor/cli`
    - `@capacitor/core`
    - `@capacitor/android`
- **@capacitor-community/sqlite@8.1.0:** For local database persistence on native platforms.
- **@capacitor/assets:** Used for generating native app icons and splash screens.