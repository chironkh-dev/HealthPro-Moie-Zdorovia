# HealthPro — Персональний цифровий щоденник здоров'я

> **Застосунок є допоміжним інструментом і не замінює професійну медичну консультацію.**
> Усі поради носять виключно інформаційний характер. Для точних замірів використовуйте сертифіковані тонометри.

---

## Про проєкт

**HealthPro** — офлайн-перший мобільний застосунок для моніторингу стану здоров'я: тиск, пульс, ліки, кроки, аналітика. Орієнтований на пацієнтів з гіпертонією та хронічними захворюваннями — передусім аудиторія 50+, україномовні та русомовні користувачі.

Усі медичні дані зберігаються **виключно локально на вашому пристрої** у зашифрованій SQLite базі. Жодних серверів, жодного хмарного зберігання, жодного стеження.

**Поточна версія:** `v5.3.012` · Android (Capacitor 8) · Активна розробка

---

## Можливості

| Модуль | Статус | Опис |
|---|---|---|
| 📊 **Тиск і пульс** | ✅ Готово | Щоденні заміри з класифікацією за ВООЗ/МОЗ, графік тенденцій (ECharts), нотатки |
| 📏 **Стандарти норм тиску** | ✅ Готово | Перемикач ESC 2024 (Європа/Україна) ↔ AHA 2017 (США) — впливає на всю аналітику, ІЗ, поради, звіти та застереження |
| 💊 **Менеджер ліків** | ✅ Готово | Розклад прийому з дозуванням, трекер прийнятих доз, нагадування |
| 🧬 **Індекс здоров'я (ІЗ)** | ✅ Готово | Добовий скор 0–100 на основі тиску + пульсу, лінійний тренд за 30 днів |
| 🚶 **Крокомір** | ✅ Готово | Android Foreground Service, кругова шкала прогресу, синхронізація після свайпу |
| 📈 **ScatterChart** | ✅ Готово | Кореляція «Кроки↔Тиск» |
| 📊 **BarChart ВООЗ** | ✅ Готово | Розподіл вимірів по 6 зонах ВООЗ |
| 🔐 **SQLCipher** | ✅ Готово | Шифрування SQLite at-rest + Android Keystore |
| 🔒 **PIN-блокування** | ✅ Готово | SHA-256 PIN, блокування при поверненні з фону |
| 📋 **Звіти для лікаря** | 🔧 В тесті | PDF з ECharts-графіками, виправлення помилок |
| 📅 **Фільтр журналу** | 🔧 В тесті | Date-range picker, виправлення помилок |
| 💡 **Офлайн поради** | 🔧 Частково | Базова реалізація, алгоритм на перегляді |
| 👆 **Біометрія** | 🔧 В розробці | Відбиток пальця, fallback на PIN |
| 📋 **Adherence-трекер** | ⏳ Планується | % прийому ліків, `db.calcAdherence()` готово |

---

## Чому не Samsung/Google Health?

Гіганти орієнтовані на молодого фітнес-користувача у США/EU. HealthPro закриває іншу нішу:

- **Локалізація для СНД** — класифікація тиску за нормами МОЗ України / ВООЗ, інтерфейс Ukrainian / Русский
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
| Зберігання | SQLite (`@capacitor-community/sqlite`, схема v2, SQLCipher) + localStorage |
| Графіки | ECharts з tree-shaking (SVGRenderer + CanvasRenderer) |
| Біометрія | `@capgo/capacitor-native-biometric` v8.4.2 |
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

<!-- TREE_START -->
```
HealthPro-Moie-Zdorovia
├── assets
│   ├── fonts
│   │   ├── .gitignore
│   │   ├── ArialBold.ttf
│   │   ├── DejaVuSans.ttf
│   │   └── Royal_Arial.ttf
│   ├── tips
│   │   ├── tips_ru.json
│   │   └── tips_uk.json
│   ├── ic_running.png
│   └── icon.png
├── icons
│   ├── apple-touch-icon.png
│   ├── favicon-96x96.png
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── site.webmanifest
│   ├── web-app-manifest-192x192.png
│   └── web-app-manifest-512x512.png
├── scripts
│   ├── HealthPro_generate_session_report.py
│   └── gen-version.js
├── src
│   ├── core
│   │   ├── biometric.js
│   │   ├── charts.js
│   │   ├── constants.js
│   │   ├── db.js
│   │   ├── pin.js
│   │   ├── platform.js
│   │   ├── sqlite.js
│   │   ├── state.js
│   │   ├── storage.js
│   │   ├── utils.js
│   │   └── version.gen.js
│   ├── features
│   │   ├── analytics
│   │   │   ├── adherence.js
│   │   │   ├── bmi.js
│   │   │   ├── bp-zones.js
│   │   │   ├── health-score.js
│   │   │   ├── index.js
│   │   │   ├── iz-chart.js
│   │   │   ├── recommendations.js
│   │   │   ├── scatter.js
│   │   │   └── trend-modal.js
│   │   ├── charts
│   │   │   ├── bp-chart.js
│   │   │   ├── helpers.js
│   │   │   └── index.js
│   │   ├── export
│   │   │   ├── backup.js
│   │   │   ├── csv.js
│   │   │   ├── index.js
│   │   │   ├── logo.js
│   │   │   ├── modal.js
│   │   │   ├── pdf-report.js
│   │   │   ├── pdf.js
│   │   │   └── print.js
│   │   ├── history
│   │   │   └── index.js
│   │   ├── journal
│   │   │   └── index.js
│   │   ├── meds
│   │   │   ├── drug-db.js
│   │   │   └── index.js
│   │   ├── pressure
│   │   │   ├── critical.js
│   │   │   ├── index.js
│   │   │   ├── norm.js
│   │   │   └── who.js
│   │   ├── pwa
│   │   │   └── index.js
│   │   ├── settings
│   │   │   ├── data.js
│   │   │   ├── disclaimer.js
│   │   │   ├── email-sms.js
│   │   │   ├── i18n.js
│   │   │   ├── index.js
│   │   │   ├── notif-perm.js
│   │   │   ├── notifications.js
│   │   │   ├── profile.js
│   │   │   └── theme.js
│   │   ├── steps
│   │   │   └── index.js
│   │   └── tips
│   │       └── index.js
│   ├── i18n
│   │   ├── index.js
│   │   ├── pdf.js
│   │   ├── print.i18n.js
│   │   ├── recommendations.i18n.js
│   │   ├── ui.ru.js
│   │   ├── ui.uk.js
│   │   ├── welcome-disclaimer.js
│   │   └── who.i18n.js
│   ├── pwa
│   │   └── sw-register.js
│   ├── app.js
│   └── main.js
├── styles
│   ├── app.css
│   ├── app.css.bak
│   ├── base.css
│   ├── charts.css
│   ├── components.css
│   ├── features.css
│   ├── layout.css
│   ├── modal.css
│   ├── tips.css
│   └── welcome.css
├── tests
│   ├── activity-score.test.js
│   ├── bmi-activity-combo.test.js
│   ├── bmi-score.test.js
│   ├── bmi.test.js
│   ├── bp-dot-class.test.js
│   ├── bp-norm.test.js
│   ├── bp-pulse-thresholds.test.js
│   ├── foreground-step.test.js
│   ├── health-score-i18n.test.js
│   ├── health-score.test.js
│   ├── measurement-window.test.js
│   ├── pill-schedule.test.js
│   ├── pills-score.test.js
│   ├── setup.js
│   ├── step-fixes.test.js
│   ├── stepgoal-bmi-combo.test.js
│   └── veto-boundary.test.js
├── .cursorrules
├── .gitignore
├── .npmrc
├── .replit
├── .replitignore
├── README.md
├── index.html
├── manifest.json
├── package-lock.json
├── package.json
├── replit.md
├── sw.js
├── vite.config.js
└── vitest.config.js
```
<!-- TREE_END -->

---

## Безпека та приватність

| Рівень | Статус | Рішення |
|---|---|---|
| Локальне зберігання | ✅ | SQLite на пристрої, без серверів |
| Шифрування at-rest | ✅ | SQLCipher + Android Keystore |
| PIN-блокування | ✅ | SHA-256(salt+pin), блокування при onResume |
| Біометрія | 🔧 В розробці | `@capgo/capacitor-native-biometric` v8.4.2, fallback на PIN |
| Авто-блокування | ⏳ Планується | Таймаут 5 хв у фоні (Б5) |
| Зовнішні запити | ✅ | Відсутні — повністю офлайн |
| Медичні поради | ✅ | Лише верифіковані офлайн-матеріали ВООЗ/МОЗ |

> **Дисклеймер щодо порад:** усі рекомендації у додатку засновані виключно на офіційних матеріалах ВООЗ та МОЗ України. Вони носять інформаційний характер і не є медичними призначеннями.

---

## Дорожня карта

### v5.3 — Безпека (поточна)
- [x] **PIN-блокування** — SHA-256, onResume, fallback
- [x] **SQLCipher** — шифрування at-rest
- [x] **Крокомір** — фікс синхронізації після свайпу
- [ ] **Біометрія** — фінальний фікс відбитка
- [ ] **Авто-блокування** — після 5 хв у фоні (Б5)

### v5.4 — Виправлення та доопрацювання
- [ ] **PDF-звіт для лікаря** — виправлення помилок
- [ ] **Фільтр журналу** — виправлення помилок date-range picker
- [ ] **Офлайн поради** — перегляд алгоритму відображення
- [ ] **Adherence-трекер** — UI для `db.calcAdherence()`

### v5.5 — Нові модулі
- [ ] Вкладка «Вага» — графік з ІМТ-зонами
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
npm run version    # Підняти версію (PATCH +1)
npm run test       # Vitest
```

> ⚠️ Перед будь-якою збіркою читай розділ **Build & Deploy** у `replit.md` — структура "матрьошки" вимагає специфічного порядку команд.

---

## Версіонування

Версія формату `MAJOR.MINOR.PATCH`:
- **PATCH** (`001`–`999`) — підіймається автоматично через `npm run version`
- **MINOR** (`0`–`99`) — вручну при додаванні нової фічі
- **MAJOR** — вручну при великому релізі

При зміні MINOR або MAJOR — PATCH автоматично скидається до `001`.

---

## Ліцензія

MIT — використовуйте вільно, але без гарантій медичної точності.

---

*HealthPro не є медичним пристроєм і не призначений для діагностики або лікування захворювань.*
*Версія: v5.3.012 · Травень 2026*
