# HealthPro · Моє Здоров'я

HealthPro — персональний щоденник здоров'я для моніторингу артеріального тиску, пульсу, прийому ліків, кроків та аналітики. Повністю офлайн, без сервера та хмари.

## Run & Operate

```bash
npm run dev      # Vite dev-сервер на порту 5000 (з папки HealthPro-Moie-Zdorovia/)
npm run build    # Продакшн збірка у dist/
npm run test     # Vitest
npm run version  # Генерація src/core/version.gen.js (автоматично перед build)
```

Необхідні змінні середовища: немає (офлайн-додаток).

## Stack

- **Фреймворк:** Vanilla JS (ES-modules)
- **Бандлер:** Vite 5
- **Мобільна обгортка:** Capacitor 8 (Android)
- **Зберігання даних:** IndexedDB (`HealthProDB`), localStorage, SQLite (`@capacitor-community/sqlite`) для нативу
- **PDF / Зображення:** `jspdf`, `html2canvas`
- **PDF звіти сесій:** Python `reportlab` (DejaVu Sans — кирилиця)
- **Тести:** Vitest 4.1.5

## Where things live

- `HealthPro-Moie-Zdorovia/index.html` — головний HTML
- `HealthPro-Moie-Zdorovia/src/main.js` — бутстрап
- `HealthPro-Moie-Zdorovia/src/app.js` — диспетчер та ініціалізація
- `HealthPro-Moie-Zdorovia/src/core/constants.js` — константи (версія, ключі, пороги)
- `HealthPro-Moie-Zdorovia/src/core/version.gen.js` — **автогенерований** файл версії (не редагувати)
- `HealthPro-Moie-Zdorovia/scripts/gen-version.js` — скрипт генерації версії
- `HealthPro-Moie-Zdorovia/src/core/storage.js` — 3-рівнева персистентність
- `HealthPro-Moie-Zdorovia/src/core/state.js` — стан, toast, event bus
- `HealthPro-Moie-Zdorovia/src/core/platform.js` — Capacitor-обгортки
- `HealthPro-Moie-Zdorovia/src/i18n/` — локалізація (ui.uk.js, ui.ru.js, pdf.js)
- `HealthPro-Moie-Zdorovia/src/features/pressure/` — тиск та пульс
- `HealthPro-Moie-Zdorovia/src/features/analytics/` — ІЗ, ІМТ, рекомендації
- `HealthPro-Moie-Zdorovia/src/features/steps/` — крокомір
- `HealthPro-Moie-Zdorovia/assets/ic_running.png` — іконка бігуна (крокомір)
- `android/app/src/main/java/ua/healthpro/app/` — Android Java (StepCounterService, BootReceiver тощо)
- `android/app/src/main/res/drawable/` — векторні ресурси (ic_stat_running.xml, logo_splash.xml)

## Architecture decisions

- **No `window.X`:** всі модулі через ES-imports.
- **No inline handlers:** атрибути `data-action` / `data-change` з єдиним делегованим listener у `app.js`.
- **Event Bus:** `emit('event:name')` / `on('event:name', cb)` для міжмодульної комунікації.
- **In-place State Mutation:** `state.X = ...` → `saveData()`.
- **i18n Enforcement:** всі рядки через `t()` / `tt()`. Немає хардкоду UI-текстів.
- **Offline-First:** всі дані локально; немає бекенду чи хмари.
- **Версія — єдине джерело:** `package.json` → `npm run version` → `version.gen.js` → `constants.js`.
- **SQLite реляційна схема (v2):** таблиці `measurements`, `medications`, `med_taken`, `steps_log`, `kv_state`. Уніфікований API — `src/core/db.js` (SQLite на нативі, in-memory fallback на вебі). Write-through: feature-модулі пишуть у реляційні таблиці одразу після запису в state. Міграція v1→v2 — автоматично при старті.
- **db.js без циклічних залежностей:** отримує посилання на `state` через `_setStateRef()` з `app.js` замість прямого імпорту.

## Product

- **Моніторинг здоров'я:** тиск, пульс, ліки, кроки.
- **Аналітика:** Індекс Здоров'я (ІЗ), ІМТ, персоналізовані рекомендації.
- **PDF-звіти:** генерація та шерінг звітів для лікаря.
- **Нагадування про ліки:** push-повідомлення за розкладом.
- **Крокомір:** фоновий режим (Android Foreground Service) та активний режим (DeviceMotion).
- **Персоналізовані норми:** налаштування порогів тиску і пульсу.

## User preferences

- **Спілкування виключно українською мовою!**
- **Вся документація українською.**
- **Після кожного великого етапу — PDF-звіт та оновлення replit.md.**
- Готовий приймати поради та рішення з розвитку проекту.

## Where things live (додатково)

- `HealthPro-Moie-Zdorovia/src/core/db.js` — **уніфікований DB API**: `queryMeasurements`, `calcHealthIndexTrend`, `queryStepLog`, `saveStepLog`, `calcAdherence`, `queryStepPressureCorrelation` тощо.
- `HealthPro-Moie-Zdorovia/src/core/sqlite.js` — низькорівневий SQLite (схема v2, DDL, CRUD).

## Gotchas

- **PDF шрифти:** лише DejaVu Sans (Arial/Arial-Bold/Arial-Italic через TTFont) для кириличних PDF-звітів. Не використовувати Roboto або Helvetica.
- **Пріоритет даних крокоміра:** дані Foreground Service завжди мають пріоритет над локальною БД.
- **JSON Import для кроків:** імпорт скидає `stepsEnabled = false` якщо крокомір не був активний.
- **version.gen.js — не редагувати вручну.** Генерується командою `npm run version`.
- **ic_stat_running.xml** замість ic_stat_steps.xml використовується в Android-сповіщенні крокоміра.
- **Сплеш-скрін:** реалізований через HTML/CSS (не Capacitor). Клас `.hidden` вмикає CSS transition opacity → 0.

## Поточні пропозиції розвитку

Детальний список — у PDF-звіті `HealthPro_Session_June2026_SplashStepsVersion.pdf`.
Ключові: тренд ІЗ, кореляція кроків/тиску, повторення розкладу ліків, нотатки до вимірювань,
фільтр журналу, вкладки «Вага» та «Сон», звіт для лікаря, блокування PIN/біометрія.

## Pointers

- PDF звіти сесій: `HealthPro-Moie-Zdorovia/generate_session_report_*.py` (Python + reportlab)
- Android сервіс: `android/app/src/main/java/ua/healthpro/app/StepCounterService.java`
- Версія: `HealthPro-Moie-Zdorovia/scripts/gen-version.js` → `src/core/version.gen.js`
