# HealthPro — Персональний цифровий щоденник здоров'я

> **Застосунок є допоміжним інструментом і не замінює професійну медичну консультацію.**
> Усі поради носять виключно інформаційний характер. Для точних замірів використовуйте сертифіковані тонометри.

---

## Про проєкт

**HealthPro** — офлайн-перший мобільний застосунок для моніторингу стану здоров'я: тиск, пульс, ліки, кроки, аналітика. Орієнтований на пацієнтів з гіпертонією та хронічними захворюваннями — передусім аудиторія 50+, україномовні та русомовні користувачі.

Усі медичні дані зберігаються **виключно локально на вашому пристрої** у зашифрованій SQLite базі. Жодних серверів, жодного хмарного зберігання, жодного стеження.

**Поточна версія:** `v5.0.0` · Android (Capacitor 8) · Активна розробка

---

## Можливості

| Модуль | Статус | Опис |
|---|---|---|
| 📊 **Тиск і пульс** | ✅ Готово | Щоденні заміри з класифікацією за ВООЗ/МОЗ, графік тенденцій (ECharts), нотатки |
| 💊 **Менеджер ліків** | ✅ Готово | Розклад прийому з дозуванням, трекер прийнятих доз, нагадування |
| 🧬 **Індекс здоров'я (ІЗ)** | ✅ Готово | Добовий скор 0–100 на основі тиску + пульсу, лінійний тренд за 30 днів |
| 🚶 **Крокомір** | ✅ Готово | Android Foreground Service + активний режим, кругова шкала прогресу, сповіщення |
| 📋 **Звіти для лікаря** | ✅ Базово | PDF/CSV/JSON. Лікарський шаблон — у розробці |
| 📈 **Аналітика** | 🔧 У розробці | Scatter «Кроки↔Тиск», розподіл по зонах ВООЗ, adherence ліків |
| 💡 **Поради** | 🔧 У розробці | Верифіковані офлайн-поради за категоріями ВООЗ/МОЗ України |
| 🔒 **Безпека даних** | ⏳ Наступна сесія | SQLCipher at-rest + PIN/біометрія (BiometricAuth) |

---

## Чому не Samsung/Google Health?

Гіганти орієнтовані на молодого фітнес-користувача у США/EU. HealthPro закриває іншу нішу:

- **Локалізація для СНД** — класифікація тиску за нормами МОЗ України / ВООЗ, інтерфейс Ukrainian 🇺🇦 / Русский
- **Аудиторія 50+** — простий UI, великий шрифт, без потреби Google-акаунту
- **Пацієнт з хронічним захворюванням** — не "трекер активності", а щоденник гіпертоніка/діабетика
- **Звіт для лікаря** — PDF із систематизованими даними для візиту до лікаря
- **100% офлайн** — повна автономність без інтернету

---

## Технічний стек

| Шар | Технологія |
|---|---|
| Фронтенд | Vanilla JS (ES-modules) + Vite 5 + HTML/CSS |
| Мобільна обгортка | Capacitor 8 (Android) |
| Зберігання | SQLite (`@capacitor-community/sqlite`, схема v2) + localStorage (кеш старту) |
| Графіки | ECharts з tree-shaking (SVGRenderer + CanvasRenderer) |
| PDF звіти | jspdf + html2canvas; PDF сесій — Python reportlab (DejaVu Sans) |
| Тести | Vitest 4.1.5 |
| Збірка | npm + Vite manualChunks (ECharts окремий chunk ~205 КБ gzip) |

---

## Архітектура зберігання даних

### SQLite схема v2 — 5 реляційних таблиць

| Таблиця | Призначення |
|---|---|
| `measurements` | Кожен вимір тиску/пульсу окремим рядком (sys, dia, pulse, note, ts) |
| `medications` | Картки призначень ліків (name, dose, time, days) |
| `med_taken` | Журнал прийому ліків (med_id, date, taken 0/1) |
| `steps_log` | Денні підсумки кроків (date PK, steps, goal) |
| `kv_state` | Налаштування, тема, мова, персональні пороги |

**Принцип:** Read — з localStorage (швидкий старт). Write-through — одразу у SQLite. SQLite = джерело правди для аналітики та звітів.

### Уніфікований API `src/core/db.js`

```
queryMeasurements({days, from, to})      — виміри за діапазон
calcHealthIndexTrend(30)                 — добовий ІЗ-скор для графіку
countByBPCategory()                      — розподіл по 6 зонах ВООЗ
queryStepPressureCorrelation()           — JOIN steps_log × measurements
calcAdherence()                          — % прийому ліків за 30 днів
insertMeasurement(m)                     — write-through вимір → measurements
saveMedication(p) / removeMedication(id) — CRUD ліків
saveStepLog({date, steps})               — денний підсумок кроків
```

---

## Структура проєкту

```
HealthPro-Moie-Zdorovia/
├── index.html
├── vite.config.js                 — manualChunks: echarts → окремий chunk
├── package.json                   — version: 5.0.0, scripts: version, prebuild
├── src/
│   ├── app.js                     — dispatcher, init, _setStateRef(state) → db.js
│   ├── core/
│   │   ├── constants.js           — версія, ключі, пороги ВООЗ
│   │   ├── version.gen.js         — АВТОГЕНЕРОВАНИЙ (npm run version)
│   │   ├── storage.js             — bootstrapStorage → migrateV1toV2
│   │   ├── state.js               — стан, toast, event bus
│   │   ├── db.js                  — уніфікований DB API (SQLite / in-memory web)
│   │   ├── sqlite.js              — схема v2, DDL, CRUD, міграція
│   │   ├── charts.js              — ECharts factory (WeakMap, createChart/disposeChart)
│   │   └── platform.js            — Capacitor-обгортки
│   ├── i18n/
│   │   ├── ui.uk.js               — Переклад: українська
│   │   ├── ui.ru.js               — Переклад: російська
│   │   └── pdf.js                 — Словник для PDF-звітів
│   └── features/
│       ├── pressure/              — тиск, пульс, write-through → measurements
│       ├── meds/                  — ліки, write-through → medications, med_taken
│       ├── steps/                 — крокомір, _persistSteps() → steps_log
│       ├── analytics/
│       │   ├── index.js           — renderAnalytics() → renderIZChart()
│       │   ├── iz-chart.js        — ІЗ-тренд 30 днів (ECharts LineChart)
│       │   ├── trend-modal.js     — модал тиску sys+dia (ECharts, disposeChart)
│       │   ├── health-score.js    — calcHealthScore, getBPThresholds
│       │   └── recommendations.js
│       ├── tips/                  — [У РОЗРОБЦІ] офлайн поради за категоріями ВООЗ
│       └── export/                — PDF / CSV / JSON
├── styles/
│   ├── base.css                   — Reset, CSS-змінні, теми
│   ├── layout.css                 — Сітка, навігація, bento-картки
│   ├── features.css               — Компоненти фіч (крокомір, тиск...)
│   └── tips.css                   — [У РОЗРОБЦІ] блок рекомендацій
├── assets/
│   └── ic_running.png             — іконка бігуна (крокомір)
├── scripts/
│   └── gen-version.js             — генератор version.gen.js
└── android/
    └── app/src/main/java/ua/healthpro/app/
        ├── StepCounterService.java — Foreground Service кроків
        └── BootReceiver.java
```

---

## Безпека та приватність

| Рівень | Статус | Рішення |
|---|---|---|
| Локальне зберігання | ✅ | SQLite на пристрої, без серверів |
| Шифрування at-rest | ⏳ Наступна сесія | SQLCipher (`@capacitor-community/sqlite` encryption: true) |
| Ключ шифрування | ⏳ Наступна сесія | Android Keystore / iOS Keychain |
| Блокування додатку | ⏳ Планується | Capacitor BiometricAuth (PIN / відбиток) |
| Зовнішні запити | ✅ | Відсутні — повністю офлайн |
| Медичні поради | ✅ | Лише верифіковані офлайн-матеріали ВООЗ/МОЗ, без зовнішнього пошуку |

> **Дисклеймер щодо порад:** усі рекомендації у додатку засновані виключно на офіційних матеріалах ВООЗ та МОЗ України. Вони носять інформаційний характер і не є медичними призначеннями.

---

## Дорожня карта

### v5.1 — Безпека + Аналітика (поточна ціль)
- [ ] **SQLCipher** — шифрування SQLite at-rest (Android Keystore)
- [ ] **ScatterChart** «Кроки ↔ Тиск» — кореляційний графік (дані в db.js готові)
- [ ] **BarChart** розподіл по зонах ВООЗ — `db.countByBPCategory()` готово
- [ ] **Офлайн поради** — `assets/tips/tips_uk.json` за категоріями ВООЗ/МОЗ
- [ ] **Фільтр журналу** за датою/діапазоном — `queryMeasurements({from,to})` готово

### v5.2 — Повнота функцій
- [ ] Нотатки до вимірювань (поле `note` у `measurements` є — потрібно UI)
- [ ] Adherence-трекер ліків — `db.calcAdherence()` готово
- [ ] Повторення розкладу ліків (щодня / через день / дні тижня)
- [ ] PDF-звіт для лікаря з лікарським шаблоном + ECharts-графіки

### v5.3 — Захист і нові модулі
- [ ] PIN-код / біометрія (Capacitor BiometricAuth)
- [ ] Вкладка «Вага» — графік з ІМТ-зонами, ціль
- [ ] Вкладка «Сон» — час, якість, кореляція з тиском

### Заморожено (до появи реальних користувачів)
- Telegram-бот нагадувань
- Хмарний бекап (Google Drive / iCloud)
- Англомовний інтерфейс
- Введення голосом (Web Speech API)

---

## Запуск та розробка

```bash
cd HealthPro-Moie-Zdorovia
npm run dev        # Vite dev-сервер, порт 5000
npm run build      # Продакшн збірка → ../dist/
npm run version    # Генерація src/core/version.gen.js (авто перед build)
npm run test       # Vitest
```

---

## Ліцензія

MIT — використовуйте вільно, але без гарантій медичної точності.

---

*HealthPro не є медичним пристроєм і не призначений для діагностики або лікування захворювань.*
*Версія: v5.0.0 · Травень 2026*
