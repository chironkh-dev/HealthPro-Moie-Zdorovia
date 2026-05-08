# HealthPro — Персональний цифровий щоденник здоров'я

> **Застосунок є допоміжним інструментом і не замінює професійну медичну консультацію.**
> Усі поради носять виключно інформаційний характер. Для точних замірів використовуйте сертифіковані тонометри.

---

## Про проєкт

**HealthPro** — офлайн-перший мобільний застосунок для моніторингу стану здоров'я: тиск, пульс, ліки, кроки, аналітика. Орієнтований на пацієнтів з гіпертонією та хронічними захворюваннями — передусім аудиторія 50+, україномовні та русомовні користувачі.

Усі медичні дані зберігаються **виключно локально на вашому пристрої** у зашифрованій SQLite базі. Жодних серверів, жодного хмарного зберігання, жодного стеження.

**Поточна версія:** `v5.3.1` · Android (Capacitor 8) · Активна розробка

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

<!-- TREE_START -->
```
.
├── .agents
│   ├── skills
│   │   ├── accessibility-compliance
│   │   │   ├── references
│   │   │   │   ├── aria-patterns.md
│   │   │   │   ├── mobile-accessibility.md
│   │   │   │   └── wcag-guidelines.md
│   │   │   └── SKILL.md
│   │   ├── agent-tools
│   │   │   ├── references
│   │   │   │   ├── app-discovery.md
│   │   │   │   ├── authentication.md
│   │   │   │   ├── cli-reference.md
│   │   │   │   └── running-apps.md
│   │   │   └── SKILL.md
│   │   ├── ai-elements
│   │   │   ├── references
│   │   │   │   ├── agent.md
│   │   │   │   ├── artifact.md
│   │   │   │   ├── attachments.md
│   │   │   │   ├── audio-player.md
│   │   │   │   ├── canvas.md
│   │   │   │   ├── chain-of-thought.md
│   │   │   │   ├── checkpoint.md
│   │   │   │   ├── code-block.md
│   │   │   │   ├── commit.md
│   │   │   │   ├── confirmation.md
│   │   │   │   ├── connection.md
│   │   │   │   ├── context.md
│   │   │   │   ├── controls.md
│   │   │   │   ├── conversation.md
│   │   │   │   ├── edge.md
│   │   │   │   ├── environment-variables.md
│   │   │   │   ├── file-tree.md
│   │   │   │   ├── image.md
│   │   │   │   ├── inline-citation.md
│   │   │   │   ├── jsx-preview.md
│   │   │   │   ├── message.md
│   │   │   │   ├── mic-selector.md
│   │   │   │   ├── model-selector.md
│   │   │   │   ├── node.md
│   │   │   │   ├── open-in-chat.md
│   │   │   │   ├── package-info.md
│   │   │   │   ├── panel.md
│   │   │   │   ├── persona.md
│   │   │   │   ├── plan.md
│   │   │   │   ├── prompt-input.md
│   │   │   │   ├── queue.md
│   │   │   │   ├── reasoning.md
│   │   │   │   ├── sandbox.md
│   │   │   │   ├── schema-display.md
│   │   │   │   ├── shimmer.md
│   │   │   │   ├── snippet.md
│   │   │   │   ├── sources.md
│   │   │   │   ├── speech-input.md
│   │   │   │   ├── stack-trace.md
│   │   │   │   ├── suggestion.md
│   │   │   │   ├── task.md
│   │   │   │   ├── terminal.md
│   │   │   │   ├── test-results.md
│   │   │   │   ├── tool.md
│   │   │   │   ├── toolbar.md
│   │   │   │   ├── transcription.md
│   │   │   │   ├── voice-selector.md
│   │   │   │   └── web-preview.md
│   │   │   ├── scripts
│   │   │   │   ├── agent.tsx
│   │   │   │   ├── artifact.tsx
│   │   │   │   ├── attachments-inline.tsx
│   │   │   │   ├── attachments-list.tsx
│   │   │   │   ├── attachments.tsx
│   │   │   │   ├── audio-player-remote.tsx
│   │   │   │   ├── audio-player.tsx
│   │   │   │   ├── chain-of-thought.tsx
│   │   │   │   ├── checkpoint.tsx
│   │   │   │   ├── code-block-dark.tsx
│   │   │   │   ├── code-block.tsx
│   │   │   │   ├── commit.tsx
│   │   │   │   ├── confirmation-accepted.tsx
│   │   │   │   ├── confirmation-rejected.tsx
│   │   │   │   ├── confirmation-request.tsx
│   │   │   │   ├── confirmation.tsx
│   │   │   │   ├── context.tsx
│   │   │   │   ├── conversation.tsx
│   │   │   │   ├── environment-variables.tsx
│   │   │   │   ├── file-tree-basic.tsx
│   │   │   │   ├── file-tree-expanded.tsx
│   │   │   │   ├── file-tree-selection.tsx
│   │   │   │   ├── file-tree.tsx
│   │   │   │   ├── image.tsx
│   │   │   │   ├── inline-citation.tsx
│   │   │   │   ├── jsx-preview.tsx
│   │   │   │   ├── message.tsx
│   │   │   │   ├── mic-selector.tsx
│   │   │   │   ├── model-selector.tsx
│   │   │   │   ├── open-in-chat.tsx
│   │   │   │   ├── package-info.tsx
│   │   │   │   ├── persona-command.tsx
│   │   │   │   ├── persona-glint.tsx
│   │   │   │   ├── persona-halo.tsx
│   │   │   │   ├── persona-mana.tsx
│   │   │   │   ├── persona-obsidian.tsx
│   │   │   │   ├── persona-opal.tsx
│   │   │   │   ├── plan.tsx
│   │   │   │   ├── prompt-input-cursor.tsx
│   │   │   │   ├── prompt-input-tooltip.tsx
│   │   │   │   ├── prompt-input.tsx
│   │   │   │   ├── queue-prompt-input.tsx
│   │   │   │   ├── queue.tsx
│   │   │   │   ├── reasoning.tsx
│   │   │   │   ├── sandbox.tsx
│   │   │   │   ├── schema-display-basic.tsx
│   │   │   │   ├── schema-display-body.tsx
│   │   │   │   ├── schema-display-nested.tsx
│   │   │   │   ├── schema-display-params.tsx
│   │   │   │   ├── schema-display.tsx
│   │   │   │   ├── shimmer-duration.tsx
│   │   │   │   ├── shimmer-elements.tsx
│   │   │   │   ├── shimmer.tsx
│   │   │   │   ├── snippet-plain.tsx
│   │   │   │   ├── snippet.tsx
│   │   │   │   ├── sources-custom.tsx
│   │   │   │   ├── sources.tsx
│   │   │   │   ├── speech-input.tsx
│   │   │   │   ├── stack-trace-collapsed.tsx
│   │   │   │   ├── stack-trace-no-internal.tsx
│   │   │   │   ├── stack-trace.tsx
│   │   │   │   ├── suggestion-input.tsx
│   │   │   │   ├── suggestion.tsx
│   │   │   │   ├── task.tsx
│   │   │   │   ├── terminal-basic.tsx
│   │   │   │   ├── terminal-clear.tsx
│   │   │   │   ├── terminal-streaming.tsx
│   │   │   │   ├── terminal.tsx
│   │   │   │   ├── test-results-basic.tsx
│   │   │   │   ├── test-results-errors.tsx
│   │   │   │   ├── test-results-suites.tsx
│   │   │   │   ├── test-results.tsx
│   │   │   │   ├── tool-input-available.tsx
│   │   │   │   ├── tool-input-streaming.tsx
│   │   │   │   ├── tool-output-available.tsx
│   │   │   │   ├── tool-output-error.tsx
│   │   │   │   ├── tool.tsx
│   │   │   │   ├── transcription.tsx
│   │   │   │   ├── voice-selector.tsx
│   │   │   │   └── web-preview.tsx
│   │   │   └── SKILL.md
│   │   ├── ai-image-generation
│   │   │   └── SKILL.md
│   │   ├── ai-product-photography
│   │   │   └── SKILL.md
│   │   ├── ai-sdk
│   │   │   ├── references
│   │   │   │   ├── ai-gateway.md
│   │   │   │   ├── common-errors.md
│   │   │   │   ├── devtools.md
│   │   │   │   └── type-safe-agents.md
│   │   │   └── SKILL.md
│   │   ├── analytics-tracking
│   │   │   ├── evals
│   │   │   │   └── evals.json
│   │   │   ├── references
│   │   │   │   ├── event-library.md
│   │   │   │   ├── ga4-implementation.md
│   │   │   │   └── gtm-implementation.md
│   │   │   └── SKILL.md
│   │   ├── angular-migration
│   │   │   └── SKILL.md
│   │   ├── antfu
│   │   │   ├── references
│   │   │   │   ├── antfu-eslint-config.md
│   │   │   │   ├── app-development.md
│   │   │   │   ├── library-development.md
│   │   │   │   ├── monorepo.md
│   │   │   │   └── setting-up.md
│   │   │   └── SKILL.md
│   │   ├── api-design-principles
│   │   │   ├── assets
│   │   │   │   ├── api-design-checklist.md
│   │   │   │   └── rest-api-template.py
│   │   │   ├── references
│   │   │   │   ├── graphql-schema-design.md
│   │   │   │   └── rest-best-practices.md
│   │   │   └── SKILL.md
│   │   ├── app-store-screenshots
│   │   │   └── SKILL.md
│   │   ├── architecture-patterns
│   │   │   ├── references
│   │   │   │   └── advanced-patterns.md
│   │   │   └── SKILL.md
│   │   ├── audit-website
│   │   │   ├── agents
│   │   │   │   └── openai.yaml
│   │   │   ├── assets
│   │   │   │   ├── icon-large.png
│   │   │   │   └── icon-small.svg
│   │   │   ├── references
│   │   │   │   └── OUTPUT-FORMAT.md
│   │   │   ├── README.md
│   │   │   └── SKILL.md
│   │   ├── baoyu-markdown-to-html
│   │   │   ├── scripts
│   │   │   │   ├── bun.lock
│   │   │   │   ├── main.test.ts
│   │   │   │   ├── main.ts
│   │   │   │   └── package.json
│   │   │   └── SKILL.md
│   │   ├── baoyu-xhs-images
│   │   │   ├── references
│   │   │   │   ├── config
│   │   │   │   │   ├── first-time-setup.md
│   │   │   │   │   ├── preferences-schema.md
│   │   │   │   │   └── watermark-guide.md
│   │   │   │   ├── elements
│   │   │   │   │   ├── canvas.md
│   │   │   │   │   ├── decorations.md
│   │   │   │   │   ├── image-effects.md
│   │   │   │   │   └── typography.md
│   │   │   │   ├── palettes
│   │   │   │   │   ├── macaron.md
│   │   │   │   │   ├── neon.md
│   │   │   │   │   └── warm.md
│   │   │   │   ├── presets
│   │   │   │   │   ├── bold.md
│   │   │   │   │   ├── chalkboard.md
│   │   │   │   │   ├── cute.md
│   │   │   │   │   ├── fresh.md
│   │   │   │   │   ├── minimal.md
│   │   │   │   │   ├── notion.md
│   │   │   │   │   ├── pop.md
│   │   │   │   │   ├── retro.md
│   │   │   │   │   ├── screen-print.md
│   │   │   │   │   ├── sketch-notes.md
│   │   │   │   │   ├── study-notes.md
│   │   │   │   │   └── warm.md
│   │   │   │   ├── workflows
│   │   │   │   │   ├── analysis-framework.md
│   │   │   │   │   ├── outline-template.md
│   │   │   │   │   └── prompt-assembly.md
│   │   │   │   ├── confirmation.md
│   │   │   │   └── style-presets.md
│   │   │   └── SKILL.md
│   │   ├── baseline-ui
│   │   │   └── SKILL.md
│   │   ├── better-auth-best-practices
│   │   │   └── SKILL.md
│   │   ├── binary-analysis-patterns
│   │   │   └── SKILL.md
│   │   ├── brainstorming
│   │   │   ├── scripts
│   │   │   │   ├── frame-template.html
│   │   │   │   ├── helper.js
│   │   │   │   ├── server.cjs
│   │   │   │   ├── start-server.sh
│   │   │   │   └── stop-server.sh
│   │   │   ├── SKILL.md
│   │   │   ├── spec-document-reviewer-prompt.md
│   │   │   └── visual-companion.md
│   │   ├── brand-guidelines
│   │   │   ├── LICENSE.txt
│   │   │   └── SKILL.md
│   │   ├── browser-use
│   │   │   ├── references
│   │   │   │   ├── cdp-python.md
│   │   │   │   └── multi-session.md
│   │   │   └── SKILL.md
│   │   ├── building-native-ui
│   │   │   ├── references
│   │   │   │   ├── animations.md
│   │   │   │   ├── controls.md
│   │   │   │   ├── form-sheet.md
│   │   │   │   ├── gradients.md
│   │   │   │   ├── icons.md
│   │   │   │   ├── media.md
│   │   │   │   ├── route-structure.md
│   │   │   │   ├── search.md
│   │   │   │   ├── storage.md
│   │   │   │   ├── tabs.md
│   │   │   │   ├── toolbar-and-headers.md
│   │   │   │   ├── visual-effects.md
│   │   │   │   ├── webgpu-three.md
│   │   │   │   └── zoom-transitions.md
│   │   │   └── SKILL.md
│   │   ├── canvas-design
│   │   │   ├── canvas-fonts
│   │   │   │   ├── ArsenalSC-OFL.txt
│   │   │   │   ├── ArsenalSC-Regular.ttf
│   │   │   │   ├── BigShoulders-Bold.ttf
│   │   │   │   ├── BigShoulders-OFL.txt
│   │   │   │   ├── BigShoulders-Regular.ttf
│   │   │   │   ├── Boldonse-OFL.txt
│   │   │   │   ├── Boldonse-Regular.ttf
│   │   │   │   ├── BricolageGrotesque-Bold.ttf
│   │   │   │   ├── BricolageGrotesque-OFL.txt
│   │   │   │   ├── BricolageGrotesque-Regular.ttf
│   │   │   │   ├── CrimsonPro-Bold.ttf
│   │   │   │   ├── CrimsonPro-Italic.ttf
│   │   │   │   ├── CrimsonPro-OFL.txt
│   │   │   │   ├── CrimsonPro-Regular.ttf
│   │   │   │   ├── DMMono-OFL.txt
│   │   │   │   ├── DMMono-Regular.ttf
│   │   │   │   ├── EricaOne-OFL.txt
│   │   │   │   ├── EricaOne-Regular.ttf
│   │   │   │   ├── GeistMono-Bold.ttf
│   │   │   │   ├── GeistMono-OFL.txt
│   │   │   │   ├── GeistMono-Regular.ttf
│   │   │   │   ├── Gloock-OFL.txt
│   │   │   │   ├── Gloock-Regular.ttf
│   │   │   │   ├── IBMPlexMono-Bold.ttf
│   │   │   │   ├── IBMPlexMono-OFL.txt
│   │   │   │   ├── IBMPlexMono-Regular.ttf
│   │   │   │   ├── IBMPlexSerif-Bold.ttf
│   │   │   │   ├── IBMPlexSerif-BoldItalic.ttf
│   │   │   │   ├── IBMPlexSerif-Italic.ttf
│   │   │   │   ├── IBMPlexSerif-Regular.ttf
│   │   │   │   ├── InstrumentSans-Bold.ttf
│   │   │   │   ├── InstrumentSans-BoldItalic.ttf
│   │   │   │   ├── InstrumentSans-Italic.ttf
│   │   │   │   ├── InstrumentSans-OFL.txt
│   │   │   │   ├── InstrumentSans-Regular.ttf
│   │   │   │   ├── InstrumentSerif-Italic.ttf
│   │   │   │   ├── InstrumentSerif-Regular.ttf
│   │   │   │   ├── Italiana-OFL.txt
│   │   │   │   ├── Italiana-Regular.ttf
│   │   │   │   ├── JetBrainsMono-Bold.ttf
│   │   │   │   ├── JetBrainsMono-OFL.txt
│   │   │   │   ├── JetBrainsMono-Regular.ttf
│   │   │   │   ├── Jura-Light.ttf
│   │   │   │   ├── Jura-Medium.ttf
│   │   │   │   ├── Jura-OFL.txt
│   │   │   │   ├── LibreBaskerville-OFL.txt
│   │   │   │   ├── LibreBaskerville-Regular.ttf
│   │   │   │   ├── Lora-Bold.ttf
│   │   │   │   ├── Lora-BoldItalic.ttf
│   │   │   │   ├── Lora-Italic.ttf
│   │   │   │   ├── Lora-OFL.txt
│   │   │   │   ├── Lora-Regular.ttf
│   │   │   │   ├── NationalPark-Bold.ttf
│   │   │   │   ├── NationalPark-OFL.txt
│   │   │   │   ├── NationalPark-Regular.ttf
│   │   │   │   ├── NothingYouCouldDo-OFL.txt
│   │   │   │   ├── NothingYouCouldDo-Regular.ttf
│   │   │   │   ├── Outfit-Bold.ttf
│   │   │   │   ├── Outfit-OFL.txt
│   │   │   │   ├── Outfit-Regular.ttf
│   │   │   │   ├── PixelifySans-Medium.ttf
│   │   │   │   ├── PixelifySans-OFL.txt
│   │   │   │   ├── PoiretOne-OFL.txt
│   │   │   │   ├── PoiretOne-Regular.ttf
│   │   │   │   ├── RedHatMono-Bold.ttf
│   │   │   │   ├── RedHatMono-OFL.txt
│   │   │   │   ├── RedHatMono-Regular.ttf
│   │   │   │   ├── Silkscreen-OFL.txt
│   │   │   │   ├── Silkscreen-Regular.ttf
│   │   │   │   ├── SmoochSans-Medium.ttf
│   │   │   │   ├── SmoochSans-OFL.txt
│   │   │   │   ├── Tektur-Medium.ttf
│   │   │   │   ├── Tektur-OFL.txt
│   │   │   │   ├── Tektur-Regular.ttf
│   │   │   │   ├── WorkSans-Bold.ttf
│   │   │   │   ├── WorkSans-BoldItalic.ttf
│   │   │   │   ├── WorkSans-Italic.ttf
│   │   │   │   ├── WorkSans-OFL.txt
│   │   │   │   ├── WorkSans-Regular.ttf
│   │   │   │   ├── YoungSerif-OFL.txt
│   │   │   │   └── YoungSerif-Regular.ttf
│   │   │   ├── LICENSE.txt
│   │   │   └── SKILL.md
│   │   ├── competitor-alternatives
│   │   │   ├── evals
│   │   │   │   └── evals.json
│   │   │   ├── references
│   │   │   │   ├── content-architecture.md
│   │   │   │   └── templates.md
│   │   │   └── SKILL.md
│   │   ├── copywriting
│   │   │   ├── evals
│   │   │   │   └── evals.json
│   │   │   ├── references
│   │   │   │   ├── copy-frameworks.md
│   │   │   │   └── natural-transitions.md
│   │   │   └── SKILL.md
│   │   ├── customer-persona
│   │   │   └── SKILL.md
│   │   ├── database-schema-designer
│   │   │   ├── assets
│   │   │   │   └── templates
│   │   │   │       └── migration-template.sql
│   │   │   ├── references
│   │   │   │   └── schema-design-checklist.md
│   │   │   ├── README.md
│   │   │   └── SKILL.md
│   │   ├── doc-coauthoring
│   │   │   └── SKILL.md
│   │   ├── docx
│   │   │   ├── scripts
│   │   │   │   ├── office
│   │   │   │   │   ├── helpers
│   │   │   │   │   │   ├── __init__.py
│   │   │   │   │   │   ├── merge_runs.py
│   │   │   │   │   │   └── simplify_redlines.py
│   │   │   │   │   ├── schemas
│   │   │   │   │   │   ├── ISO-IEC29500-4_2016
│   │   │   │   │   │   │   ├── dml-chart.xsd
│   │   │   │   │   │   │   ├── dml-chartDrawing.xsd
│   │   │   │   │   │   │   ├── dml-diagram.xsd
│   │   │   │   │   │   │   ├── dml-lockedCanvas.xsd
│   │   │   │   │   │   │   ├── dml-main.xsd
│   │   │   │   │   │   │   ├── dml-picture.xsd
│   │   │   │   │   │   │   ├── dml-spreadsheetDrawing.xsd
│   │   │   │   │   │   │   ├── dml-wordprocessingDrawing.xsd
│   │   │   │   │   │   │   ├── pml.xsd
│   │   │   │   │   │   │   ├── shared-additionalCharacteristics.xsd
│   │   │   │   │   │   │   ├── shared-bibliography.xsd
│   │   │   │   │   │   │   ├── shared-commonSimpleTypes.xsd
│   │   │   │   │   │   │   ├── shared-customXmlDataProperties.xsd
│   │   │   │   │   │   │   ├── shared-customXmlSchemaProperties.xsd
│   │   │   │   │   │   │   ├── shared-documentPropertiesCustom.xsd
│   │   │   │   │   │   │   ├── shared-documentPropertiesExtended.xsd
│   │   │   │   │   │   │   ├── shared-documentPropertiesVariantTypes.xsd
│   │   │   │   │   │   │   ├── shared-math.xsd
│   │   │   │   │   │   │   ├── shared-relationshipReference.xsd
│   │   │   │   │   │   │   ├── sml.xsd
│   │   │   │   │   │   │   ├── vml-main.xsd
│   │   │   │   │   │   │   ├── vml-officeDrawing.xsd
│   │   │   │   │   │   │   ├── vml-presentationDrawing.xsd
│   │   │   │   │   │   │   ├── vml-spreadsheetDrawing.xsd
│   │   │   │   │   │   │   ├── vml-wordprocessingDrawing.xsd
│   │   │   │   │   │   │   ├── wml.xsd
│   │   │   │   │   │   │   └── xml.xsd
│   │   │   │   │   │   ├── ecma
│   │   │   │   │   │   │   └── fouth-edition
│   │   │   │   │   │   │       ├── opc-contentTypes.xsd
│   │   │   │   │   │   │       ├── opc-coreProperties.xsd
│   │   │   │   │   │   │       ├── opc-digSig.xsd
│   │   │   │   │   │   │       └── opc-relationships.xsd
│   │   │   │   │   │   ├── mce
│   │   │   │   │   │   │   └── mc.xsd
│   │   │   │   │   │   └── microsoft
│   │   │   │   │   │       ├── wml-2010.xsd
│   │   │   │   │   │       ├── wml-2012.xsd
│   │   │   │   │   │       ├── wml-2018.xsd
│   │   │   │   │   │       ├── wml-cex-2018.xsd
│   │   │   │   │   │       ├── wml-cid-2016.xsd
│   │   │   │   │   │       ├── wml-sdtdatahash-2020.xsd
│   │   │   │   │   │       └── wml-symex-2015.xsd
│   │   │   │   │   ├── validators
│   │   │   │   │   │   ├── __init__.py
│   │   │   │   │   │   ├── base.py
│   │   │   │   │   │   ├── docx.py
│   │   │   │   │   │   ├── pptx.py
│   │   │   │   │   │   └── redlining.py
│   │   │   │   │   ├── pack.py
│   │   │   │   │   ├── soffice.py
│   │   │   │   │   ├── unpack.py
│   │   │   │   │   └── validate.py
│   │   │   │   ├── templates
│   │   │   │   │   ├── comments.xml
│   │   │   │   │   ├── commentsExtended.xml
│   │   │   │   │   ├── commentsExtensible.xml
│   │   │   │   │   ├── commentsIds.xml
│   │   │   │   │   └── people.xml
│   │   │   │   ├── __init__.py
│   │   │   │   ├── accept_changes.py
│   │   │   │   └── comment.py
│   │   │   ├── LICENSE.txt
│   │   │   └── SKILL.md
│   │   ├── expo-deployment
│   │   │   ├── references
│   │   │   │   ├── app-store-metadata.md
│   │   │   │   ├── ios-app-store.md
│   │   │   │   ├── play-store.md
│   │   │   │   ├── testflight.md
│   │   │   │   └── workflows.md
│   │   │   └── SKILL.md
│   │   ├── expo-tailwind-setup
│   │   │   └── SKILL.md
│   │   ├── find-skills
│   │   │   └── SKILL.md
│   │   ├── firecrawl
│   │   │   ├── rules
│   │   │   │   ├── install.md
│   │   │   │   └── security.md
│   │   │   └── SKILL.md
│   │   ├── frontend-design
│   │   │   ├── LICENSE.txt
│   │   │   └── SKILL.md
│   │   ├── grafana-dashboards
│   │   │   └── SKILL.md
│   │   ├── instaclaw
│   │   │   └── SKILL.md
│   │   ├── interface-design
│   │   │   ├── references
│   │   │   │   ├── critique.md
│   │   │   │   ├── example.md
│   │   │   │   ├── principles.md
│   │   │   │   └── validation.md
│   │   │   └── SKILL.md
│   │   ├── javascript-sdk
│   │   │   ├── references
│   │   │   │   ├── agent-patterns.md
│   │   │   │   ├── files.md
│   │   │   │   ├── react-integration.md
│   │   │   │   ├── server-proxy.md
│   │   │   │   ├── sessions.md
│   │   │   │   ├── streaming.md
│   │   │   │   ├── tool-builder.md
│   │   │   │   └── typescript.md
│   │   │   └── SKILL.md
│   │   ├── javascript-testing-patterns
│   │   │   ├── references
│   │   │   │   └── advanced-testing-patterns.md
│   │   │   └── SKILL.md
│   │   ├── mcp-builder
│   │   │   ├── reference
│   │   │   │   ├── evaluation.md
│   │   │   │   ├── mcp_best_practices.md
│   │   │   │   ├── node_mcp_server.md
│   │   │   │   └── python_mcp_server.md
│   │   │   ├── scripts
│   │   │   │   ├── connections.py
│   │   │   │   ├── evaluation.py
│   │   │   │   ├── example_evaluation.xml
│   │   │   │   └── requirements.txt
│   │   │   ├── LICENSE.txt
│   │   │   └── SKILL.md
│   │   ├── mobile-android-design
│   │   │   ├── references
│   │   │   │   ├── android-navigation.md
│   │   │   │   ├── compose-components.md
│   │   │   │   └── material3-theming.md
│   │   │   └── SKILL.md
│   │   ├── mobile-ios-design
│   │   │   ├── references
│   │   │   │   ├── hig-patterns.md
│   │   │   │   ├── ios-navigation.md
│   │   │   │   └── swiftui-components.md
│   │   │   └── SKILL.md
│   │   ├── modern-javascript-patterns
│   │   │   ├── references
│   │   │   │   └── advanced-patterns.md
│   │   │   └── SKILL.md
│   │   ├── native-data-fetching
│   │   │   ├── references
│   │   │   │   └── expo-router-loaders.md
│   │   │   └── SKILL.md
│   │   ├── next-best-practices
│   │   │   ├── SKILL.md
│   │   │   ├── async-patterns.md
│   │   │   ├── bundling.md
│   │   │   ├── data-patterns.md
│   │   │   ├── debug-tricks.md
│   │   │   ├── directives.md
│   │   │   ├── error-handling.md
│   │   │   ├── file-conventions.md
│   │   │   ├── font.md
│   │   │   ├── functions.md
│   │   │   ├── hydration-error.md
│   │   │   ├── image.md
│   │   │   ├── metadata.md
│   │   │   ├── parallel-routes.md
│   │   │   ├── route-handlers.md
│   │   │   ├── rsc-boundaries.md
│   │   │   ├── runtime-selection.md
│   │   │   ├── scripts.md
│   │   │   ├── self-hosting.md
│   │   │   └── suspense-boundaries.md
│   │   ├── nodejs-backend-patterns
│   │   │   ├── references
│   │   │   │   └── advanced-patterns.md
│   │   │   └── SKILL.md
│   │   ├── openapi-to-typescript
│   │   │   ├── README.md
│   │   │   └── SKILL.md
│   │   ├── paid-ads
│   │   │   ├── evals
│   │   │   │   └── evals.json
│   │   │   ├── references
│   │   │   │   ├── ad-copy-templates.md
│   │   │   │   ├── audience-targeting.md
│   │   │   │   └── platform-setup-checklists.md
│   │   │   └── SKILL.md
│   │   ├── pdf
│   │   │   ├── scripts
│   │   │   │   ├── check_bounding_boxes.py
│   │   │   │   ├── check_fillable_fields.py
│   │   │   │   ├── convert_pdf_to_images.py
│   │   │   │   ├── create_validation_image.py
│   │   │   │   ├── extract_form_field_info.py
│   │   │   │   ├── extract_form_structure.py
│   │   │   │   ├── fill_fillable_fields.py
│   │   │   │   └── fill_pdf_form_with_annotations.py
│   │   │   ├── LICENSE.txt
│   │   │   ├── SKILL.md
│   │   │   ├── forms.md
│   │   │   └── reference.md
│   │   ├── plugin-forge
│   │   │   ├── references
│   │   │   │   ├── marketplace-schema.md
│   │   │   │   ├── plugin-structure.md
│   │   │   │   └── workflows.md
│   │   │   ├── scripts
│   │   │   │   ├── bump_version.py
│   │   │   │   └── create_plugin.py
│   │   │   ├── README.md
│   │   │   └── SKILL.md
│   │   ├── postgresql-table-design
│   │   │   └── SKILL.md
│   │   ├── pptx
│   │   │   ├── scripts
│   │   │   │   ├── office
│   │   │   │   │   ├── helpers
│   │   │   │   │   │   ├── __init__.py
│   │   │   │   │   │   ├── merge_runs.py
│   │   │   │   │   │   └── simplify_redlines.py
│   │   │   │   │   ├── schemas
│   │   │   │   │   │   ├── ISO-IEC29500-4_2016
│   │   │   │   │   │   │   ├── dml-chart.xsd
│   │   │   │   │   │   │   ├── dml-chartDrawing.xsd
│   │   │   │   │   │   │   ├── dml-diagram.xsd
│   │   │   │   │   │   │   ├── dml-lockedCanvas.xsd
│   │   │   │   │   │   │   ├── dml-main.xsd
│   │   │   │   │   │   │   ├── dml-picture.xsd
│   │   │   │   │   │   │   ├── dml-spreadsheetDrawing.xsd
│   │   │   │   │   │   │   ├── dml-wordprocessingDrawing.xsd
│   │   │   │   │   │   │   ├── pml.xsd
│   │   │   │   │   │   │   ├── shared-additionalCharacteristics.xsd
│   │   │   │   │   │   │   ├── shared-bibliography.xsd
│   │   │   │   │   │   │   ├── shared-commonSimpleTypes.xsd
│   │   │   │   │   │   │   ├── shared-customXmlDataProperties.xsd
│   │   │   │   │   │   │   ├── shared-customXmlSchemaProperties.xsd
│   │   │   │   │   │   │   ├── shared-documentPropertiesCustom.xsd
│   │   │   │   │   │   │   ├── shared-documentPropertiesExtended.xsd
│   │   │   │   │   │   │   ├── shared-documentPropertiesVariantTypes.xsd
│   │   │   │   │   │   │   ├── shared-math.xsd
│   │   │   │   │   │   │   ├── shared-relationshipReference.xsd
│   │   │   │   │   │   │   ├── sml.xsd
│   │   │   │   │   │   │   ├── vml-main.xsd
│   │   │   │   │   │   │   ├── vml-officeDrawing.xsd
│   │   │   │   │   │   │   ├── vml-presentationDrawing.xsd
│   │   │   │   │   │   │   ├── vml-spreadsheetDrawing.xsd
│   │   │   │   │   │   │   ├── vml-wordprocessingDrawing.xsd
│   │   │   │   │   │   │   ├── wml.xsd
│   │   │   │   │   │   │   └── xml.xsd
│   │   │   │   │   │   ├── ecma
│   │   │   │   │   │   │   └── fouth-edition
│   │   │   │   │   │   │       ├── opc-contentTypes.xsd
│   │   │   │   │   │   │       ├── opc-coreProperties.xsd
│   │   │   │   │   │   │       ├── opc-digSig.xsd
│   │   │   │   │   │   │       └── opc-relationships.xsd
│   │   │   │   │   │   ├── mce
│   │   │   │   │   │   │   └── mc.xsd
│   │   │   │   │   │   └── microsoft
│   │   │   │   │   │       ├── wml-2010.xsd
│   │   │   │   │   │       ├── wml-2012.xsd
│   │   │   │   │   │       ├── wml-2018.xsd
│   │   │   │   │   │       ├── wml-cex-2018.xsd
│   │   │   │   │   │       ├── wml-cid-2016.xsd
│   │   │   │   │   │       ├── wml-sdtdatahash-2020.xsd
│   │   │   │   │   │       └── wml-symex-2015.xsd
│   │   │   │   │   ├── validators
│   │   │   │   │   │   ├── __init__.py
│   │   │   │   │   │   ├── base.py
│   │   │   │   │   │   ├── docx.py
│   │   │   │   │   │   ├── pptx.py
│   │   │   │   │   │   └── redlining.py
│   │   │   │   │   ├── pack.py
│   │   │   │   │   ├── soffice.py
│   │   │   │   │   ├── unpack.py
│   │   │   │   │   └── validate.py
│   │   │   │   ├── __init__.py
│   │   │   │   ├── add_slide.py
│   │   │   │   ├── clean.py
│   │   │   │   └── thumbnail.py
│   │   │   ├── LICENSE.txt
│   │   │   ├── SKILL.md
│   │   │   ├── editing.md
│   │   │   └── pptxgenjs.md
│   │   ├── product-photography
│   │   │   └── SKILL.md
│   │   ├── programmatic-seo
│   │   │   ├── evals
│   │   │   │   └── evals.json
│   │   │   ├── references
│   │   │   │   └── playbooks.md
│   │   │   └── SKILL.md
│   │   ├── python-project-structure
│   │   │   └── SKILL.md
│   │   ├── python-sdk
│   │   │   ├── references
│   │   │   │   ├── agent-patterns.md
│   │   │   │   ├── async-patterns.md
│   │   │   │   ├── files.md
│   │   │   │   ├── sessions.md
│   │   │   │   ├── streaming.md
│   │   │   │   └── tool-builder.md
│   │   │   └── SKILL.md
│   │   ├── qa-test-planner
│   │   │   ├── references
│   │   │   │   ├── bug_report_templates.md
│   │   │   │   ├── figma_validation.md
│   │   │   │   ├── regression_testing.md
│   │   │   │   └── test_case_templates.md
│   │   │   ├── scripts
│   │   │   │   ├── create_bug_report.sh
│   │   │   │   └── generate_test_cases.sh
│   │   │   ├── README.md
│   │   │   └── SKILL.md
│   │   ├── react-modernization
│   │   │   └── SKILL.md
│   │   ├── react-native-architecture
│   │   │   └── SKILL.md
│   │   ├── react-native-best-practices
│   │   │   ├── agents
│   │   │   │   └── openai.yaml
│   │   │   ├── references
│   │   │   │   ├── images
│   │   │   │   │   ├── bundle-treemap-source-map-explorer.png
│   │   │   │   │   ├── controlled-textinput-pingpong.png
│   │   │   │   │   ├── devtools-flamegraph.png
│   │   │   │   │   ├── emerge-xray-ios.png
│   │   │   │   │   ├── expo-atlas-treemap.png
│   │   │   │   │   ├── flashlight-flatlist-vs-flashlist.png
│   │   │   │   │   ├── fps-drop-graph.png
│   │   │   │   │   ├── memory-heap-snapshot.png
│   │   │   │   │   ├── tti-warm-start-diagram.png
│   │   │   │   │   ├── view-hierarchy-flattening.png
│   │   │   │   │   ├── xcode-instruments-templates.png
│   │   │   │   │   └── xcode-thread-view.png
│   │   │   │   ├── bundle-analyze-app.md
│   │   │   │   ├── bundle-analyze-js.md
│   │   │   │   ├── bundle-barrel-exports.md
│   │   │   │   ├── bundle-code-splitting.md
│   │   │   │   ├── bundle-hermes-mmap.md
│   │   │   │   ├── bundle-library-size.md
│   │   │   │   ├── bundle-native-assets.md
│   │   │   │   ├── bundle-r8-android.md
│   │   │   │   ├── bundle-tree-shaking.md
│   │   │   │   ├── js-animations-reanimated.md
│   │   │   │   ├── js-atomic-state.md
│   │   │   │   ├── js-bottomsheet.md
│   │   │   │   ├── js-concurrent-react.md
│   │   │   │   ├── js-lists-flatlist-flashlist.md
│   │   │   │   ├── js-measure-fps.md
│   │   │   │   ├── js-memory-leaks.md
│   │   │   │   ├── js-profile-react.md
│   │   │   │   ├── js-react-compiler.md
│   │   │   │   ├── js-uncontrolled-components.md
│   │   │   │   ├── native-android-16kb-alignment.md
│   │   │   │   ├── native-measure-tti.md
│   │   │   │   ├── native-memory-leaks.md
│   │   │   │   ├── native-memory-patterns.md
│   │   │   │   ├── native-platform-setup.md
│   │   │   │   ├── native-profiling.md
│   │   │   │   ├── native-sdks-over-polyfills.md
│   │   │   │   ├── native-threading-model.md
│   │   │   │   ├── native-turbo-modules.md
│   │   │   │   └── native-view-flattening.md
│   │   │   ├── POWER.md
│   │   │   └── SKILL.md
│   │   ├── react-native-design
│   │   │   ├── references
│   │   │   │   ├── navigation-patterns.md
│   │   │   │   ├── reanimated-patterns.md
│   │   │   │   └── styling-patterns.md
│   │   │   └── SKILL.md
│   │   ├── react-useeffect
│   │   │   ├── README.md
│   │   │   ├── SKILL.md
│   │   │   ├── alternatives.md
│   │   │   └── anti-patterns.md
│   │   ├── referral-program
│   │   │   ├── evals
│   │   │   │   └── evals.json
│   │   │   ├── references
│   │   │   │   ├── affiliate-programs.md
│   │   │   │   └── program-examples.md
│   │   │   └── SKILL.md
│   │   ├── remotion-best-practices
│   │   │   ├── rules
│   │   │   │   ├── assets
│   │   │   │   │   ├── charts-bar-chart.tsx
│   │   │   │   │   ├── text-animations-typewriter.tsx
│   │   │   │   │   └── text-animations-word-highlight.tsx
│   │   │   │   ├── 3d.md
│   │   │   │   ├── animations.md
│   │   │   │   ├── assets.md
│   │   │   │   ├── audio-visualization.md
│   │   │   │   ├── audio.md
│   │   │   │   ├── calculate-metadata.md
│   │   │   │   ├── can-decode.md
│   │   │   │   ├── charts.md
│   │   │   │   ├── compositions.md
│   │   │   │   ├── display-captions.md
│   │   │   │   ├── extract-frames.md
│   │   │   │   ├── ffmpeg.md
│   │   │   │   ├── fonts.md
│   │   │   │   ├── get-audio-duration.md
│   │   │   │   ├── get-video-dimensions.md
│   │   │   │   ├── get-video-duration.md
│   │   │   │   ├── gifs.md
│   │   │   │   ├── images.md
│   │   │   │   ├── import-srt-captions.md
│   │   │   │   ├── light-leaks.md
│   │   │   │   ├── lottie.md
│   │   │   │   ├── maps.md
│   │   │   │   ├── measuring-dom-nodes.md
│   │   │   │   ├── measuring-text.md
│   │   │   │   ├── parameters.md
│   │   │   │   ├── sequencing.md
│   │   │   │   ├── sfx.md
│   │   │   │   ├── silence-detection.md
│   │   │   │   ├── subtitles.md
│   │   │   │   ├── tailwind.md
│   │   │   │   ├── text-animations.md
│   │   │   │   ├── timing.md
│   │   │   │   ├── transcribe-captions.md
│   │   │   │   ├── transitions.md
│   │   │   │   ├── transparent-videos.md
│   │   │   │   ├── trimming.md
│   │   │   │   ├── videos.md
│   │   │   │   └── voiceover.md
│   │   │   └── SKILL.md
│   │   ├── requesting-code-review
│   │   │   ├── SKILL.md
│   │   │   └── code-reviewer.md
│   │   ├── responsive-design
│   │   │   ├── references
│   │   │   │   ├── breakpoint-strategies.md
│   │   │   │   ├── container-queries.md
│   │   │   │   └── fluid-layouts.md
│   │   │   └── SKILL.md
│   │   ├── secrets-management
│   │   │   └── SKILL.md
│   │   ├── skill-creator
│   │   │   ├── agents
│   │   │   │   ├── analyzer.md
│   │   │   │   ├── comparator.md
│   │   │   │   └── grader.md
│   │   │   ├── assets
│   │   │   │   └── eval_review.html
│   │   │   ├── eval-viewer
│   │   │   │   ├── generate_review.py
│   │   │   │   └── viewer.html
│   │   │   ├── references
│   │   │   │   └── schemas.md
│   │   │   ├── scripts
│   │   │   │   ├── __init__.py
│   │   │   │   ├── aggregate_benchmark.py
│   │   │   │   ├── generate_report.py
│   │   │   │   ├── improve_description.py
│   │   │   │   ├── package_skill.py
│   │   │   │   ├── quick_validate.py
│   │   │   │   ├── run_eval.py
│   │   │   │   ├── run_loop.py
│   │   │   │   └── utils.py
│   │   │   ├── LICENSE.txt
│   │   │   └── SKILL.md
│   │   ├── sql-optimization-patterns
│   │   │   └── SKILL.md
│   │   ├── stripe-integration
│   │   │   └── SKILL.md
│   │   ├── supabase-postgres-best-practices
│   │   │   ├── references
│   │   │   │   ├── _contributing.md
│   │   │   │   ├── _sections.md
│   │   │   │   ├── _template.md
│   │   │   │   ├── advanced-full-text-search.md
│   │   │   │   ├── advanced-jsonb-indexing.md
│   │   │   │   ├── conn-idle-timeout.md
│   │   │   │   ├── conn-limits.md
│   │   │   │   ├── conn-pooling.md
│   │   │   │   ├── conn-prepared-statements.md
│   │   │   │   ├── data-batch-inserts.md
│   │   │   │   ├── data-n-plus-one.md
│   │   │   │   ├── data-pagination.md
│   │   │   │   ├── data-upsert.md
│   │   │   │   ├── lock-advisory.md
│   │   │   │   ├── lock-deadlock-prevention.md
│   │   │   │   ├── lock-short-transactions.md
│   │   │   │   ├── lock-skip-locked.md
│   │   │   │   ├── monitor-explain-analyze.md
│   │   │   │   ├── monitor-pg-stat-statements.md
│   │   │   │   ├── monitor-vacuum-analyze.md
│   │   │   │   ├── query-composite-indexes.md
│   │   │   │   ├── query-covering-indexes.md
│   │   │   │   ├── query-index-types.md
│   │   │   │   ├── query-missing-indexes.md
│   │   │   │   ├── query-partial-indexes.md
│   │   │   │   ├── schema-constraints.md
│   │   │   │   ├── schema-data-types.md
│   │   │   │   ├── schema-foreign-key-indexes.md
│   │   │   │   ├── schema-lowercase-identifiers.md
│   │   │   │   ├── schema-partitioning.md
│   │   │   │   ├── schema-primary-keys.md
│   │   │   │   ├── security-privileges.md
│   │   │   │   ├── security-rls-basics.md
│   │   │   │   └── security-rls-performance.md
│   │   │   └── SKILL.md
│   │   ├── tailwind-design-system
│   │   │   ├── references
│   │   │   │   └── advanced-patterns.md
│   │   │   └── SKILL.md
│   │   ├── typescript-advanced-types
│   │   │   └── SKILL.md
│   │   ├── typescript-expert
│   │   │   ├── references
│   │   │   │   ├── tsconfig-strict.json
│   │   │   │   ├── typescript-cheatsheet.md
│   │   │   │   └── utility-types.ts
│   │   │   ├── scripts
│   │   │   │   └── ts_diagnostic.py
│   │   │   └── SKILL.md
│   │   ├── ui-ux-pro-max
│   │   │   ├── data
│   │   │   │   ├── stacks
│   │   │   │   │   ├── angular.csv
│   │   │   │   │   ├── astro.csv
│   │   │   │   │   ├── flutter.csv
│   │   │   │   │   ├── html-tailwind.csv
│   │   │   │   │   ├── jetpack-compose.csv
│   │   │   │   │   ├── laravel.csv
│   │   │   │   │   ├── nextjs.csv
│   │   │   │   │   ├── nuxt-ui.csv
│   │   │   │   │   ├── nuxtjs.csv
│   │   │   │   │   ├── react-native.csv
│   │   │   │   │   ├── react.csv
│   │   │   │   │   ├── shadcn.csv
│   │   │   │   │   ├── svelte.csv
│   │   │   │   │   ├── swiftui.csv
│   │   │   │   │   ├── threejs.csv
│   │   │   │   │   └── vue.csv
│   │   │   │   ├── _sync_all.py
│   │   │   │   ├── app-interface.csv
│   │   │   │   ├── charts.csv
│   │   │   │   ├── colors.csv
│   │   │   │   ├── design.csv
│   │   │   │   ├── draft.csv
│   │   │   │   ├── google-fonts.csv
│   │   │   │   ├── icons.csv
│   │   │   │   ├── landing.csv
│   │   │   │   ├── products.csv
│   │   │   │   ├── react-performance.csv
│   │   │   │   ├── styles.csv
│   │   │   │   ├── typography.csv
│   │   │   │   ├── ui-reasoning.csv
│   │   │   │   └── ux-guidelines.csv
│   │   │   ├── scripts
│   │   │   │   ├── core.py
│   │   │   │   ├── design_system.py
│   │   │   │   └── search.py
│   │   │   └── SKILL.md
│   │   ├── unocss
│   │   │   ├── references
│   │   │   │   ├── core-config.md
│   │   │   │   ├── core-extracting.md
│   │   │   │   ├── core-layers.md
│   │   │   │   ├── core-rules.md
│   │   │   │   ├── core-safelist.md
│   │   │   │   ├── core-shortcuts.md
│   │   │   │   ├── core-theme.md
│   │   │   │   ├── core-variants.md
│   │   │   │   ├── integrations-nuxt.md
│   │   │   │   ├── integrations-vite.md
│   │   │   │   ├── preset-attributify.md
│   │   │   │   ├── preset-icons.md
│   │   │   │   ├── preset-mini.md
│   │   │   │   ├── preset-rem-to-px.md
│   │   │   │   ├── preset-tagify.md
│   │   │   │   ├── preset-typography.md
│   │   │   │   ├── preset-web-fonts.md
│   │   │   │   ├── preset-wind3.md
│   │   │   │   ├── preset-wind4.md
│   │   │   │   ├── transformer-attributify-jsx.md
│   │   │   │   ├── transformer-compile-class.md
│   │   │   │   ├── transformer-directives.md
│   │   │   │   └── transformer-variant-group.md
│   │   │   ├── GENERATION.md
│   │   │   └── SKILL.md
│   │   ├── upgrading-expo
│   │   │   ├── references
│   │   │   │   ├── expo-av-to-audio.md
│   │   │   │   ├── expo-av-to-video.md
│   │   │   │   ├── native-tabs.md
│   │   │   │   ├── new-architecture.md
│   │   │   │   ├── react-19.md
│   │   │   │   └── react-compiler.md
│   │   │   └── SKILL.md
│   │   ├── use-dom
│   │   │   └── SKILL.md
│   │   ├── using-superpowers
│   │   │   ├── references
│   │   │   │   ├── codex-tools.md
│   │   │   │   ├── copilot-tools.md
│   │   │   │   └── gemini-tools.md
│   │   │   └── SKILL.md
│   │   ├── vercel-composition-patterns
│   │   │   ├── rules
│   │   │   │   ├── _sections.md
│   │   │   │   ├── _template.md
│   │   │   │   ├── architecture-avoid-boolean-props.md
│   │   │   │   ├── architecture-compound-components.md
│   │   │   │   ├── patterns-children-over-render-props.md
│   │   │   │   ├── patterns-explicit-variants.md
│   │   │   │   ├── react19-no-forwardref.md
│   │   │   │   ├── state-context-interface.md
│   │   │   │   ├── state-decouple-implementation.md
│   │   │   │   └── state-lift-state.md
│   │   │   ├── AGENTS.md
│   │   │   ├── README.md
│   │   │   ├── SKILL.md
│   │   │   └── metadata.json
│   │   ├── vercel-react-best-practices
│   │   │   ├── rules
│   │   │   │   ├── _sections.md
│   │   │   │   ├── _template.md
│   │   │   │   ├── advanced-effect-event-deps.md
│   │   │   │   ├── advanced-event-handler-refs.md
│   │   │   │   ├── advanced-init-once.md
│   │   │   │   ├── advanced-use-latest.md
│   │   │   │   ├── async-api-routes.md
│   │   │   │   ├── async-cheap-condition-before-await.md
│   │   │   │   ├── async-defer-await.md
│   │   │   │   ├── async-dependencies.md
│   │   │   │   ├── async-parallel.md
│   │   │   │   ├── async-suspense-boundaries.md
│   │   │   │   ├── bundle-analyzable-paths.md
│   │   │   │   ├── bundle-barrel-imports.md
│   │   │   │   ├── bundle-conditional.md
│   │   │   │   ├── bundle-defer-third-party.md
│   │   │   │   ├── bundle-dynamic-imports.md
│   │   │   │   ├── bundle-preload.md
│   │   │   │   ├── client-event-listeners.md
│   │   │   │   ├── client-localstorage-schema.md
│   │   │   │   ├── client-passive-event-listeners.md
│   │   │   │   ├── client-swr-dedup.md
│   │   │   │   ├── js-batch-dom-css.md
│   │   │   │   ├── js-cache-function-results.md
│   │   │   │   ├── js-cache-property-access.md
│   │   │   │   ├── js-cache-storage.md
│   │   │   │   ├── js-combine-iterations.md
│   │   │   │   ├── js-early-exit.md
│   │   │   │   ├── js-flatmap-filter.md
│   │   │   │   ├── js-hoist-regexp.md
│   │   │   │   ├── js-index-maps.md
│   │   │   │   ├── js-length-check-first.md
│   │   │   │   ├── js-min-max-loop.md
│   │   │   │   ├── js-request-idle-callback.md
│   │   │   │   ├── js-set-map-lookups.md
│   │   │   │   ├── js-tosorted-immutable.md
│   │   │   │   ├── rendering-activity.md
│   │   │   │   ├── rendering-animate-svg-wrapper.md
│   │   │   │   ├── rendering-conditional-render.md
│   │   │   │   ├── rendering-content-visibility.md
│   │   │   │   ├── rendering-hoist-jsx.md
│   │   │   │   ├── rendering-hydration-no-flicker.md
│   │   │   │   ├── rendering-hydration-suppress-warning.md
│   │   │   │   ├── rendering-resource-hints.md
│   │   │   │   ├── rendering-script-defer-async.md
│   │   │   │   ├── rendering-svg-precision.md
│   │   │   │   ├── rendering-usetransition-loading.md
│   │   │   │   ├── rerender-defer-reads.md
│   │   │   │   ├── rerender-dependencies.md
│   │   │   │   ├── rerender-derived-state-no-effect.md
│   │   │   │   ├── rerender-derived-state.md
│   │   │   │   ├── rerender-functional-setstate.md
│   │   │   │   ├── rerender-lazy-state-init.md
│   │   │   │   ├── rerender-memo-with-default-value.md
│   │   │   │   ├── rerender-memo.md
│   │   │   │   ├── rerender-move-effect-to-event.md
│   │   │   │   ├── rerender-no-inline-components.md
│   │   │   │   ├── rerender-simple-expression-in-memo.md
│   │   │   │   ├── rerender-split-combined-hooks.md
│   │   │   │   ├── rerender-transitions.md
│   │   │   │   ├── rerender-use-deferred-value.md
│   │   │   │   ├── rerender-use-ref-transient-values.md
│   │   │   │   ├── server-after-nonblocking.md
│   │   │   │   ├── server-auth-actions.md
│   │   │   │   ├── server-cache-lru.md
│   │   │   │   ├── server-cache-react.md
│   │   │   │   ├── server-dedup-props.md
│   │   │   │   ├── server-hoist-static-io.md
│   │   │   │   ├── server-no-shared-module-state.md
│   │   │   │   ├── server-parallel-fetching.md
│   │   │   │   ├── server-parallel-nested-fetching.md
│   │   │   │   └── server-serialization.md
│   │   │   ├── AGENTS.md
│   │   │   ├── README.md
│   │   │   ├── SKILL.md
│   │   │   └── metadata.json
│   │   ├── vercel-react-native-skills
│   │   │   ├── rules
│   │   │   │   ├── _sections.md
│   │   │   │   ├── _template.md
│   │   │   │   ├── animation-derived-value.md
│   │   │   │   ├── animation-gesture-detector-press.md
│   │   │   │   ├── animation-gpu-properties.md
│   │   │   │   ├── design-system-compound-components.md
│   │   │   │   ├── fonts-config-plugin.md
│   │   │   │   ├── imports-design-system-folder.md
│   │   │   │   ├── js-hoist-intl.md
│   │   │   │   ├── list-performance-callbacks.md
│   │   │   │   ├── list-performance-function-references.md
│   │   │   │   ├── list-performance-images.md
│   │   │   │   ├── list-performance-inline-objects.md
│   │   │   │   ├── list-performance-item-expensive.md
│   │   │   │   ├── list-performance-item-memo.md
│   │   │   │   ├── list-performance-item-types.md
│   │   │   │   ├── list-performance-virtualize.md
│   │   │   │   ├── monorepo-native-deps-in-app.md
│   │   │   │   ├── monorepo-single-dependency-versions.md
│   │   │   │   ├── navigation-native-navigators.md
│   │   │   │   ├── react-compiler-destructure-functions.md
│   │   │   │   ├── react-compiler-reanimated-shared-values.md
│   │   │   │   ├── react-state-dispatcher.md
│   │   │   │   ├── react-state-fallback.md
│   │   │   │   ├── react-state-minimize.md
│   │   │   │   ├── rendering-no-falsy-and.md
│   │   │   │   ├── rendering-text-in-text-component.md
│   │   │   │   ├── scroll-position-no-state.md
│   │   │   │   ├── state-ground-truth.md
│   │   │   │   ├── ui-expo-image.md
│   │   │   │   ├── ui-image-gallery.md
│   │   │   │   ├── ui-measure-views.md
│   │   │   │   ├── ui-menus.md
│   │   │   │   ├── ui-native-modals.md
│   │   │   │   ├── ui-pressable.md
│   │   │   │   ├── ui-safe-area-scroll.md
│   │   │   │   ├── ui-scrollview-content-inset.md
│   │   │   │   └── ui-styling.md
│   │   │   ├── AGENTS.md
│   │   │   ├── README.md
│   │   │   ├── SKILL.md
│   │   │   └── metadata.json
│   │   ├── visual-design-foundations
│   │   │   ├── references
│   │   │   │   ├── color-systems.md
│   │   │   │   ├── spacing-iconography.md
│   │   │   │   └── typography-systems.md
│   │   │   └── SKILL.md
│   │   ├── vue-best-practices
│   │   │   ├── references
│   │   │   │   ├── animation-class-based-technique.md
│   │   │   │   ├── animation-state-driven-technique.md
│   │   │   │   ├── component-async.md
│   │   │   │   ├── component-data-flow.md
│   │   │   │   ├── component-fallthrough-attrs.md
│   │   │   │   ├── component-keep-alive.md
│   │   │   │   ├── component-slots.md
│   │   │   │   ├── component-suspense.md
│   │   │   │   ├── component-teleport.md
│   │   │   │   ├── component-transition-group.md
│   │   │   │   ├── component-transition.md
│   │   │   │   ├── composables.md
│   │   │   │   ├── directives.md
│   │   │   │   ├── perf-avoid-component-abstraction-in-lists.md
│   │   │   │   ├── perf-v-once-v-memo-directives.md
│   │   │   │   ├── perf-virtualize-large-lists.md
│   │   │   │   ├── plugins.md
│   │   │   │   ├── reactivity.md
│   │   │   │   ├── render-functions.md
│   │   │   │   ├── sfc.md
│   │   │   │   ├── state-management.md
│   │   │   │   └── updated-hook-performance.md
│   │   │   └── SKILL.md
│   │   ├── web-design-guidelines
│   │   │   └── SKILL.md
│   │   └── xlsx
│   │       ├── scripts
│   │       │   ├── office
│   │       │   │   ├── helpers
│   │       │   │   │   ├── __init__.py
│   │       │   │   │   ├── merge_runs.py
│   │       │   │   │   └── simplify_redlines.py
│   │       │   │   ├── schemas
│   │       │   │   │   ├── ISO-IEC29500-4_2016
│   │       │   │   │   │   ├── dml-chart.xsd
│   │       │   │   │   │   ├── dml-chartDrawing.xsd
│   │       │   │   │   │   ├── dml-diagram.xsd
│   │       │   │   │   │   ├── dml-lockedCanvas.xsd
│   │       │   │   │   │   ├── dml-main.xsd
│   │       │   │   │   │   ├── dml-picture.xsd
│   │       │   │   │   │   ├── dml-spreadsheetDrawing.xsd
│   │       │   │   │   │   ├── dml-wordprocessingDrawing.xsd
│   │       │   │   │   │   ├── pml.xsd
│   │       │   │   │   │   ├── shared-additionalCharacteristics.xsd
│   │       │   │   │   │   ├── shared-bibliography.xsd
│   │       │   │   │   │   ├── shared-commonSimpleTypes.xsd
│   │       │   │   │   │   ├── shared-customXmlDataProperties.xsd
│   │       │   │   │   │   ├── shared-customXmlSchemaProperties.xsd
│   │       │   │   │   │   ├── shared-documentPropertiesCustom.xsd
│   │       │   │   │   │   ├── shared-documentPropertiesExtended.xsd
│   │       │   │   │   │   ├── shared-documentPropertiesVariantTypes.xsd
│   │       │   │   │   │   ├── shared-math.xsd
│   │       │   │   │   │   ├── shared-relationshipReference.xsd
│   │       │   │   │   │   ├── sml.xsd
│   │       │   │   │   │   ├── vml-main.xsd
│   │       │   │   │   │   ├── vml-officeDrawing.xsd
│   │       │   │   │   │   ├── vml-presentationDrawing.xsd
│   │       │   │   │   │   ├── vml-spreadsheetDrawing.xsd
│   │       │   │   │   │   ├── vml-wordprocessingDrawing.xsd
│   │       │   │   │   │   ├── wml.xsd
│   │       │   │   │   │   └── xml.xsd
│   │       │   │   │   ├── ecma
│   │       │   │   │   │   └── fouth-edition
│   │       │   │   │   │       ├── opc-contentTypes.xsd
│   │       │   │   │   │       ├── opc-coreProperties.xsd
│   │       │   │   │   │       ├── opc-digSig.xsd
│   │       │   │   │   │       └── opc-relationships.xsd
│   │       │   │   │   ├── mce
│   │       │   │   │   │   └── mc.xsd
│   │       │   │   │   └── microsoft
│   │       │   │   │       ├── wml-2010.xsd
│   │       │   │   │       ├── wml-2012.xsd
│   │       │   │   │       ├── wml-2018.xsd
│   │       │   │   │       ├── wml-cex-2018.xsd
│   │       │   │   │       ├── wml-cid-2016.xsd
│   │       │   │   │       ├── wml-sdtdatahash-2020.xsd
│   │       │   │   │       └── wml-symex-2015.xsd
│   │       │   │   ├── validators
│   │       │   │   │   ├── __init__.py
│   │       │   │   │   ├── base.py
│   │       │   │   │   ├── docx.py
│   │       │   │   │   ├── pptx.py
│   │       │   │   │   └── redlining.py
│   │       │   │   ├── pack.py
│   │       │   │   ├── soffice.py
│   │       │   │   ├── unpack.py
│   │       │   │   └── validate.py
│   │       │   └── recalc.py
│   │       ├── LICENSE.txt
│   │       └── SKILL.md
│   └── agent_assets_metadata.toml
├── .github
│   └── workflows
│       ├── android-apk.yml
│       ├── ci.yml
│       └── update-tree.yml
├── HealthPro-Moie-Zdorovia
│   ├── .agents
│   │   └── skills
│   │       ├── agent-tools
│   │       │   ├── references
│   │       │   │   ├── app-discovery.md
│   │       │   │   ├── authentication.md
│   │       │   │   ├── cli-reference.md
│   │       │   │   └── running-apps.md
│   │       │   └── SKILL.md
│   │       ├── ai-image-generation
│   │       │   └── SKILL.md
│   │       ├── ai-video-generation
│   │       │   └── SKILL.md
│   │       ├── antfu
│   │       │   ├── references
│   │       │   │   ├── antfu-eslint-config.md
│   │       │   │   ├── app-development.md
│   │       │   │   ├── library-development.md
│   │       │   │   ├── monorepo.md
│   │       │   │   └── setting-up.md
│   │       │   └── SKILL.md
│   │       ├── app-store-screenshots
│   │       │   └── SKILL.md
│   │       ├── audit-website
│   │       │   ├── agents
│   │       │   │   └── openai.yaml
│   │       │   ├── assets
│   │       │   │   ├── icon-large.png
│   │       │   │   └── icon-small.svg
│   │       │   ├── references
│   │       │   │   └── OUTPUT-FORMAT.md
│   │       │   ├── README.md
│   │       │   └── SKILL.md
│   │       ├── baoyu-article-illustrator
│   │       │   ├── prompts
│   │       │   │   └── system.md
│   │       │   ├── references
│   │       │   │   ├── config
│   │       │   │   │   ├── first-time-setup.md
│   │       │   │   │   └── preferences-schema.md
│   │       │   │   ├── palettes
│   │       │   │   │   ├── macaron.md
│   │       │   │   │   ├── mono-ink.md
│   │       │   │   │   ├── neon.md
│   │       │   │   │   └── warm.md
│   │       │   │   ├── styles
│   │       │   │   │   ├── blueprint.md
│   │       │   │   │   ├── chalkboard.md
│   │       │   │   │   ├── editorial.md
│   │       │   │   │   ├── elegant.md
│   │       │   │   │   ├── fantasy-animation.md
│   │       │   │   │   ├── flat-doodle.md
│   │       │   │   │   ├── flat.md
│   │       │   │   │   ├── ink-notes.md
│   │       │   │   │   ├── intuition-machine.md
│   │       │   │   │   ├── minimal.md
│   │       │   │   │   ├── nature.md
│   │       │   │   │   ├── notion.md
│   │       │   │   │   ├── pixel-art.md
│   │       │   │   │   ├── playful.md
│   │       │   │   │   ├── retro.md
│   │       │   │   │   ├── scientific.md
│   │       │   │   │   ├── screen-print.md
│   │       │   │   │   ├── sketch-notes.md
│   │       │   │   │   ├── sketch.md
│   │       │   │   │   ├── vector-illustration.md
│   │       │   │   │   ├── vintage.md
│   │       │   │   │   ├── warm.md
│   │       │   │   │   └── watercolor.md
│   │       │   │   ├── prompt-construction.md
│   │       │   │   ├── style-presets.md
│   │       │   │   ├── styles.md
│   │       │   │   ├── usage.md
│   │       │   │   └── workflow.md
│   │       │   └── SKILL.md
│   │       ├── baoyu-compress-image
│   │       │   ├── scripts
│   │       │   │   └── main.ts
│   │       │   └── SKILL.md
│   │       ├── baoyu-cover-image
│   │       │   ├── references
│   │       │   │   ├── config
│   │       │   │   │   ├── first-time-setup.md
│   │       │   │   │   ├── preferences-schema.md
│   │       │   │   │   └── watermark-guide.md
│   │       │   │   ├── dimensions
│   │       │   │   │   ├── font.md
│   │       │   │   │   ├── mood.md
│   │       │   │   │   └── text.md
│   │       │   │   ├── palettes
│   │       │   │   │   ├── cool.md
│   │       │   │   │   ├── dark.md
│   │       │   │   │   ├── duotone.md
│   │       │   │   │   ├── earth.md
│   │       │   │   │   ├── elegant.md
│   │       │   │   │   ├── macaron.md
│   │       │   │   │   ├── mono.md
│   │       │   │   │   ├── pastel.md
│   │       │   │   │   ├── retro.md
│   │       │   │   │   ├── vivid.md
│   │       │   │   │   └── warm.md
│   │       │   │   ├── renderings
│   │       │   │   │   ├── chalk.md
│   │       │   │   │   ├── digital.md
│   │       │   │   │   ├── flat-vector.md
│   │       │   │   │   ├── hand-drawn.md
│   │       │   │   │   ├── painterly.md
│   │       │   │   │   ├── pixel.md
│   │       │   │   │   └── screen-print.md
│   │       │   │   ├── workflow
│   │       │   │   │   ├── confirm-options.md
│   │       │   │   │   ├── prompt-template.md
│   │       │   │   │   └── reference-images.md
│   │       │   │   ├── auto-selection.md
│   │       │   │   ├── base-prompt.md
│   │       │   │   ├── compatibility.md
│   │       │   │   ├── style-presets.md
│   │       │   │   ├── types.md
│   │       │   │   └── visual-elements.md
│   │       │   └── SKILL.md
│   │       ├── baoyu-image-gen
│   │       │   ├── references
│   │       │   │   ├── config
│   │       │   │   │   ├── first-time-setup.md
│   │       │   │   │   └── preferences-schema.md
│   │       │   │   ├── providers
│   │       │   │   │   ├── dashscope.md
│   │       │   │   │   ├── minimax.md
│   │       │   │   │   ├── openrouter.md
│   │       │   │   │   ├── replicate.md
│   │       │   │   │   └── zai.md
│   │       │   │   └── usage-examples.md
│   │       │   ├── scripts
│   │       │   │   ├── providers
│   │       │   │   │   ├── azure.test.ts
│   │       │   │   │   ├── azure.ts
│   │       │   │   │   ├── dashscope.test.ts
│   │       │   │   │   ├── dashscope.ts
│   │       │   │   │   ├── google.test.ts
│   │       │   │   │   ├── google.ts
│   │       │   │   │   ├── jimeng.test.ts
│   │       │   │   │   ├── jimeng.ts
│   │       │   │   │   ├── minimax.test.ts
│   │       │   │   │   ├── minimax.ts
│   │       │   │   │   ├── openai.test.ts
│   │       │   │   │   ├── openai.ts
│   │       │   │   │   ├── openrouter.test.ts
│   │       │   │   │   ├── openrouter.ts
│   │       │   │   │   ├── replicate.test.ts
│   │       │   │   │   ├── replicate.ts
│   │       │   │   │   ├── seedream.test.ts
│   │       │   │   │   ├── seedream.ts
│   │       │   │   │   ├── zai.test.ts
│   │       │   │   │   └── zai.ts
│   │       │   │   ├── main.test.ts
│   │       │   │   ├── main.ts
│   │       │   │   └── types.ts
│   │       │   └── SKILL.md
│   │       ├── baoyu-slide-deck
│   │       │   ├── references
│   │       │   │   ├── config
│   │       │   │   │   └── preferences-schema.md
│   │       │   │   ├── dimensions
│   │       │   │   │   ├── density.md
│   │       │   │   │   ├── mood.md
│   │       │   │   │   ├── presets.md
│   │       │   │   │   ├── texture.md
│   │       │   │   │   └── typography.md
│   │       │   │   ├── styles
│   │       │   │   │   ├── blueprint.md
│   │       │   │   │   ├── bold-editorial.md
│   │       │   │   │   ├── chalkboard.md
│   │       │   │   │   ├── corporate.md
│   │       │   │   │   ├── dark-atmospheric.md
│   │       │   │   │   ├── editorial-infographic.md
│   │       │   │   │   ├── fantasy-animation.md
│   │       │   │   │   ├── hand-drawn-edu.md
│   │       │   │   │   ├── intuition-machine.md
│   │       │   │   │   ├── minimal.md
│   │       │   │   │   ├── notion.md
│   │       │   │   │   ├── pixel-art.md
│   │       │   │   │   ├── scientific.md
│   │       │   │   │   ├── sketch-notes.md
│   │       │   │   │   ├── vector-illustration.md
│   │       │   │   │   ├── vintage.md
│   │       │   │   │   └── watercolor.md
│   │       │   │   ├── analysis-framework.md
│   │       │   │   ├── base-prompt.md
│   │       │   │   ├── confirmation.md
│   │       │   │   ├── content-rules.md
│   │       │   │   ├── design-guidelines.md
│   │       │   │   ├── layouts.md
│   │       │   │   ├── modification-guide.md
│   │       │   │   └── outline-template.md
│   │       │   ├── scripts
│   │       │   │   ├── merge-to-pdf.ts
│   │       │   │   └── merge-to-pptx.ts
│   │       │   └── SKILL.md
│   │       ├── baoyu-xhs-images
│   │       │   ├── references
│   │       │   │   ├── config
│   │       │   │   │   ├── first-time-setup.md
│   │       │   │   │   ├── preferences-schema.md
│   │       │   │   │   └── watermark-guide.md
│   │       │   │   ├── elements
│   │       │   │   │   ├── canvas.md
│   │       │   │   │   ├── decorations.md
│   │       │   │   │   ├── image-effects.md
│   │       │   │   │   └── typography.md
│   │       │   │   ├── palettes
│   │       │   │   │   ├── macaron.md
│   │       │   │   │   ├── neon.md
│   │       │   │   │   └── warm.md
│   │       │   │   ├── presets
│   │       │   │   │   ├── bold.md
│   │       │   │   │   ├── chalkboard.md
│   │       │   │   │   ├── cute.md
│   │       │   │   │   ├── fresh.md
│   │       │   │   │   ├── minimal.md
│   │       │   │   │   ├── notion.md
│   │       │   │   │   ├── pop.md
│   │       │   │   │   ├── retro.md
│   │       │   │   │   ├── screen-print.md
│   │       │   │   │   ├── sketch-notes.md
│   │       │   │   │   ├── study-notes.md
│   │       │   │   │   └── warm.md
│   │       │   │   ├── workflows
│   │       │   │   │   ├── analysis-framework.md
│   │       │   │   │   ├── outline-template.md
│   │       │   │   │   └── prompt-assembly.md
│   │       │   │   ├── confirmation.md
│   │       │   │   └── style-presets.md
│   │       │   └── SKILL.md
│   │       ├── better-auth-best-practices
│   │       │   └── SKILL.md
│   │       ├── brainstorming
│   │       │   ├── scripts
│   │       │   │   ├── frame-template.html
│   │       │   │   ├── helper.js
│   │       │   │   ├── server.cjs
│   │       │   │   ├── start-server.sh
│   │       │   │   └── stop-server.sh
│   │       │   ├── SKILL.md
│   │       │   ├── spec-document-reviewer-prompt.md
│   │       │   └── visual-companion.md
│   │       ├── brand-guidelines
│   │       │   ├── LICENSE.txt
│   │       │   └── SKILL.md
│   │       ├── browser-use
│   │       │   ├── references
│   │       │   │   ├── cdp-python.md
│   │       │   │   └── multi-session.md
│   │       │   └── SKILL.md
│   │       ├── building-native-ui
│   │       │   ├── references
│   │       │   │   ├── animations.md
│   │       │   │   ├── controls.md
│   │       │   │   ├── form-sheet.md
│   │       │   │   ├── gradients.md
│   │       │   │   ├── icons.md
│   │       │   │   ├── media.md
│   │       │   │   ├── route-structure.md
│   │       │   │   ├── search.md
│   │       │   │   ├── storage.md
│   │       │   │   ├── tabs.md
│   │       │   │   ├── toolbar-and-headers.md
│   │       │   │   ├── visual-effects.md
│   │       │   │   ├── webgpu-three.md
│   │       │   │   └── zoom-transitions.md
│   │       │   └── SKILL.md
│   │       ├── canvas-design
│   │       │   ├── canvas-fonts
│   │       │   │   ├── ArsenalSC-OFL.txt
│   │       │   │   ├── ArsenalSC-Regular.ttf
│   │       │   │   ├── BigShoulders-Bold.ttf
│   │       │   │   ├── BigShoulders-OFL.txt
│   │       │   │   ├── BigShoulders-Regular.ttf
│   │       │   │   ├── Boldonse-OFL.txt
│   │       │   │   ├── Boldonse-Regular.ttf
│   │       │   │   ├── BricolageGrotesque-Bold.ttf
│   │       │   │   ├── BricolageGrotesque-OFL.txt
│   │       │   │   ├── BricolageGrotesque-Regular.ttf
│   │       │   │   ├── CrimsonPro-Bold.ttf
│   │       │   │   ├── CrimsonPro-Italic.ttf
│   │       │   │   ├── CrimsonPro-OFL.txt
│   │       │   │   ├── CrimsonPro-Regular.ttf
│   │       │   │   ├── DMMono-OFL.txt
│   │       │   │   ├── DMMono-Regular.ttf
│   │       │   │   ├── EricaOne-OFL.txt
│   │       │   │   ├── EricaOne-Regular.ttf
│   │       │   │   ├── GeistMono-Bold.ttf
│   │       │   │   ├── GeistMono-OFL.txt
│   │       │   │   ├── GeistMono-Regular.ttf
│   │       │   │   ├── Gloock-OFL.txt
│   │       │   │   ├── Gloock-Regular.ttf
│   │       │   │   ├── IBMPlexMono-Bold.ttf
│   │       │   │   ├── IBMPlexMono-OFL.txt
│   │       │   │   ├── IBMPlexMono-Regular.ttf
│   │       │   │   ├── IBMPlexSerif-Bold.ttf
│   │       │   │   ├── IBMPlexSerif-BoldItalic.ttf
│   │       │   │   ├── IBMPlexSerif-Italic.ttf
│   │       │   │   ├── IBMPlexSerif-Regular.ttf
│   │       │   │   ├── InstrumentSans-Bold.ttf
│   │       │   │   ├── InstrumentSans-BoldItalic.ttf
│   │       │   │   ├── InstrumentSans-Italic.ttf
│   │       │   │   ├── InstrumentSans-OFL.txt
│   │       │   │   ├── InstrumentSans-Regular.ttf
│   │       │   │   ├── InstrumentSerif-Italic.ttf
│   │       │   │   ├── InstrumentSerif-Regular.ttf
│   │       │   │   ├── Italiana-OFL.txt
│   │       │   │   ├── Italiana-Regular.ttf
│   │       │   │   ├── JetBrainsMono-Bold.ttf
│   │       │   │   ├── JetBrainsMono-OFL.txt
│   │       │   │   ├── JetBrainsMono-Regular.ttf
│   │       │   │   ├── Jura-Light.ttf
│   │       │   │   ├── Jura-Medium.ttf
│   │       │   │   ├── Jura-OFL.txt
│   │       │   │   ├── LibreBaskerville-OFL.txt
│   │       │   │   ├── LibreBaskerville-Regular.ttf
│   │       │   │   ├── Lora-Bold.ttf
│   │       │   │   ├── Lora-BoldItalic.ttf
│   │       │   │   ├── Lora-Italic.ttf
│   │       │   │   ├── Lora-OFL.txt
│   │       │   │   ├── Lora-Regular.ttf
│   │       │   │   ├── NationalPark-Bold.ttf
│   │       │   │   ├── NationalPark-OFL.txt
│   │       │   │   ├── NationalPark-Regular.ttf
│   │       │   │   ├── NothingYouCouldDo-OFL.txt
│   │       │   │   ├── NothingYouCouldDo-Regular.ttf
│   │       │   │   ├── Outfit-Bold.ttf
│   │       │   │   ├── Outfit-OFL.txt
│   │       │   │   ├── Outfit-Regular.ttf
│   │       │   │   ├── PixelifySans-Medium.ttf
│   │       │   │   ├── PixelifySans-OFL.txt
│   │       │   │   ├── PoiretOne-OFL.txt
│   │       │   │   ├── PoiretOne-Regular.ttf
│   │       │   │   ├── RedHatMono-Bold.ttf
│   │       │   │   ├── RedHatMono-OFL.txt
│   │       │   │   ├── RedHatMono-Regular.ttf
│   │       │   │   ├── Silkscreen-OFL.txt
│   │       │   │   ├── Silkscreen-Regular.ttf
│   │       │   │   ├── SmoochSans-Medium.ttf
│   │       │   │   ├── SmoochSans-OFL.txt
│   │       │   │   ├── Tektur-Medium.ttf
│   │       │   │   ├── Tektur-OFL.txt
│   │       │   │   ├── Tektur-Regular.ttf
│   │       │   │   ├── WorkSans-Bold.ttf
│   │       │   │   ├── WorkSans-BoldItalic.ttf
│   │       │   │   ├── WorkSans-Italic.ttf
│   │       │   │   ├── WorkSans-OFL.txt
│   │       │   │   ├── WorkSans-Regular.ttf
│   │       │   │   ├── YoungSerif-OFL.txt
│   │       │   │   └── YoungSerif-Regular.ttf
│   │       │   ├── LICENSE.txt
│   │       │   └── SKILL.md
│   │       ├── copywriting
│   │       │   ├── evals
│   │       │   │   └── evals.json
│   │       │   ├── references
│   │       │   │   ├── copy-frameworks.md
│   │       │   │   └── natural-transitions.md
│   │       │   └── SKILL.md
│   │       ├── database-migration
│   │       │   └── SKILL.md
│   │       ├── database-schema-designer
│   │       │   ├── assets
│   │       │   │   └── templates
│   │       │   │       └── migration-template.sql
│   │       │   ├── references
│   │       │   │   └── schema-design-checklist.md
│   │       │   ├── README.md
│   │       │   └── SKILL.md
│   │       ├── docx
│   │       │   ├── scripts
│   │       │   │   ├── office
│   │       │   │   │   ├── helpers
│   │       │   │   │   │   ├── __init__.py
│   │       │   │   │   │   ├── merge_runs.py
│   │       │   │   │   │   └── simplify_redlines.py
│   │       │   │   │   ├── schemas
│   │       │   │   │   │   ├── ISO-IEC29500-4_2016
│   │       │   │   │   │   │   ├── dml-chart.xsd
│   │       │   │   │   │   │   ├── dml-chartDrawing.xsd
│   │       │   │   │   │   │   ├── dml-diagram.xsd
│   │       │   │   │   │   │   ├── dml-lockedCanvas.xsd
│   │       │   │   │   │   │   ├── dml-main.xsd
│   │       │   │   │   │   │   ├── dml-picture.xsd
│   │       │   │   │   │   │   ├── dml-spreadsheetDrawing.xsd
│   │       │   │   │   │   │   ├── dml-wordprocessingDrawing.xsd
│   │       │   │   │   │   │   ├── pml.xsd
│   │       │   │   │   │   │   ├── shared-additionalCharacteristics.xsd
│   │       │   │   │   │   │   ├── shared-bibliography.xsd
│   │       │   │   │   │   │   ├── shared-commonSimpleTypes.xsd
│   │       │   │   │   │   │   ├── shared-customXmlDataProperties.xsd
│   │       │   │   │   │   │   ├── shared-customXmlSchemaProperties.xsd
│   │       │   │   │   │   │   ├── shared-documentPropertiesCustom.xsd
│   │       │   │   │   │   │   ├── shared-documentPropertiesExtended.xsd
│   │       │   │   │   │   │   ├── shared-documentPropertiesVariantTypes.xsd
│   │       │   │   │   │   │   ├── shared-math.xsd
│   │       │   │   │   │   │   ├── shared-relationshipReference.xsd
│   │       │   │   │   │   │   ├── sml.xsd
│   │       │   │   │   │   │   ├── vml-main.xsd
│   │       │   │   │   │   │   ├── vml-officeDrawing.xsd
│   │       │   │   │   │   │   ├── vml-presentationDrawing.xsd
│   │       │   │   │   │   │   ├── vml-spreadsheetDrawing.xsd
│   │       │   │   │   │   │   ├── vml-wordprocessingDrawing.xsd
│   │       │   │   │   │   │   ├── wml.xsd
│   │       │   │   │   │   │   └── xml.xsd
│   │       │   │   │   │   ├── ecma
│   │       │   │   │   │   │   └── fouth-edition
│   │       │   │   │   │   │       ├── opc-contentTypes.xsd
│   │       │   │   │   │   │       ├── opc-coreProperties.xsd
│   │       │   │   │   │   │       ├── opc-digSig.xsd
│   │       │   │   │   │   │       └── opc-relationships.xsd
│   │       │   │   │   │   ├── mce
│   │       │   │   │   │   │   └── mc.xsd
│   │       │   │   │   │   └── microsoft
│   │       │   │   │   │       ├── wml-2010.xsd
│   │       │   │   │   │       ├── wml-2012.xsd
│   │       │   │   │   │       ├── wml-2018.xsd
│   │       │   │   │   │       ├── wml-cex-2018.xsd
│   │       │   │   │   │       ├── wml-cid-2016.xsd
│   │       │   │   │   │       ├── wml-sdtdatahash-2020.xsd
│   │       │   │   │   │       └── wml-symex-2015.xsd
│   │       │   │   │   ├── validators
│   │       │   │   │   │   ├── __init__.py
│   │       │   │   │   │   ├── base.py
│   │       │   │   │   │   ├── docx.py
│   │       │   │   │   │   ├── pptx.py
│   │       │   │   │   │   └── redlining.py
│   │       │   │   │   ├── pack.py
│   │       │   │   │   ├── soffice.py
│   │       │   │   │   ├── unpack.py
│   │       │   │   │   └── validate.py
│   │       │   │   ├── templates
│   │       │   │   │   ├── comments.xml
│   │       │   │   │   ├── commentsExtended.xml
│   │       │   │   │   ├── commentsExtensible.xml
│   │       │   │   │   ├── commentsIds.xml
│   │       │   │   │   └── people.xml
│   │       │   │   ├── __init__.py
│   │       │   │   ├── accept_changes.py
│   │       │   │   └── comment.py
│   │       │   ├── LICENSE.txt
│   │       │   └── SKILL.md
│   │       ├── email-sequence
│   │       │   ├── evals
│   │       │   │   └── evals.json
│   │       │   ├── references
│   │       │   │   ├── copy-guidelines.md
│   │       │   │   ├── email-types.md
│   │       │   │   └── sequence-templates.md
│   │       │   └── SKILL.md
│   │       ├── expo-deployment
│   │       │   ├── references
│   │       │   │   ├── app-store-metadata.md
│   │       │   │   ├── ios-app-store.md
│   │       │   │   ├── play-store.md
│   │       │   │   ├── testflight.md
│   │       │   │   └── workflows.md
│   │       │   └── SKILL.md
│   │       ├── expo-tailwind-setup
│   │       │   └── SKILL.md
│   │       ├── find-skills
│   │       │   └── SKILL.md
│   │       ├── finishing-a-development-branch
│   │       │   └── SKILL.md
│   │       ├── form-cro
│   │       │   ├── evals
│   │       │   │   └── evals.json
│   │       │   └── SKILL.md
│   │       ├── frontend-design
│   │       │   ├── LICENSE.txt
│   │       │   └── SKILL.md
│   │       ├── instaclaw
│   │       │   └── SKILL.md
│   │       ├── internal-comms
│   │       │   ├── examples
│   │       │   │   ├── 3p-updates.md
│   │       │   │   ├── company-newsletter.md
│   │       │   │   ├── faq-answers.md
│   │       │   │   └── general-comms.md
│   │       │   ├── LICENSE.txt
│   │       │   └── SKILL.md
│   │       ├── javascript-testing-patterns
│   │       │   ├── references
│   │       │   │   └── advanced-testing-patterns.md
│   │       │   └── SKILL.md
│   │       ├── k8s-manifest-generator
│   │       │   ├── assets
│   │       │   │   ├── configmap-template.yaml
│   │       │   │   ├── deployment-template.yaml
│   │       │   │   └── service-template.yaml
│   │       │   ├── references
│   │       │   │   ├── deployment-spec.md
│   │       │   │   └── service-spec.md
│   │       │   └── SKILL.md
│   │       ├── k8s-security-policies
│   │       │   ├── assets
│   │       │   │   └── network-policy-template.yaml
│   │       │   ├── references
│   │       │   │   └── rbac-patterns.md
│   │       │   └── SKILL.md
│   │       ├── mobile-android-design
│   │       │   ├── references
│   │       │   │   ├── android-navigation.md
│   │       │   │   ├── compose-components.md
│   │       │   │   └── material3-theming.md
│   │       │   └── SKILL.md
│   │       ├── native-data-fetching
│   │       │   ├── references
│   │       │   │   └── expo-router-loaders.md
│   │       │   └── SKILL.md
│   │       ├── next-best-practices
│   │       │   ├── SKILL.md
│   │       │   ├── async-patterns.md
│   │       │   ├── bundling.md
│   │       │   ├── data-patterns.md
│   │       │   ├── debug-tricks.md
│   │       │   ├── directives.md
│   │       │   ├── error-handling.md
│   │       │   ├── file-conventions.md
│   │       │   ├── font.md
│   │       │   ├── functions.md
│   │       │   ├── hydration-error.md
│   │       │   ├── image.md
│   │       │   ├── metadata.md
│   │       │   ├── parallel-routes.md
│   │       │   ├── route-handlers.md
│   │       │   ├── rsc-boundaries.md
│   │       │   ├── runtime-selection.md
│   │       │   ├── scripts.md
│   │       │   ├── self-hosting.md
│   │       │   └── suspense-boundaries.md
│   │       ├── onboarding-cro
│   │       │   ├── evals
│   │       │   │   └── evals.json
│   │       │   ├── references
│   │       │   │   └── experiments.md
│   │       │   └── SKILL.md
│   │       ├── paid-ads
│   │       │   ├── evals
│   │       │   │   └── evals.json
│   │       │   ├── references
│   │       │   │   ├── ad-copy-templates.md
│   │       │   │   ├── audience-targeting.md
│   │       │   │   └── platform-setup-checklists.md
│   │       │   └── SKILL.md
│   │       ├── paywall-upgrade-cro
│   │       │   ├── evals
│   │       │   │   └── evals.json
│   │       │   ├── references
│   │       │   │   └── experiments.md
│   │       │   └── SKILL.md
│   │       ├── pci-compliance
│   │       │   └── SKILL.md
│   │       ├── pdf
│   │       │   ├── scripts
│   │       │   │   ├── check_bounding_boxes.py
│   │       │   │   ├── check_fillable_fields.py
│   │       │   │   ├── convert_pdf_to_images.py
│   │       │   │   ├── create_validation_image.py
│   │       │   │   ├── extract_form_field_info.py
│   │       │   │   ├── extract_form_structure.py
│   │       │   │   ├── fill_fillable_fields.py
│   │       │   │   └── fill_pdf_form_with_annotations.py
│   │       │   ├── LICENSE.txt
│   │       │   ├── SKILL.md
│   │       │   ├── forms.md
│   │       │   └── reference.md
│   │       ├── popup-cro
│   │       │   ├── evals
│   │       │   │   └── evals.json
│   │       │   └── SKILL.md
│   │       ├── postgresql-table-design
│   │       │   └── SKILL.md
│   │       ├── pptx
│   │       │   ├── scripts
│   │       │   │   ├── office
│   │       │   │   │   ├── helpers
│   │       │   │   │   │   ├── __init__.py
│   │       │   │   │   │   ├── merge_runs.py
│   │       │   │   │   │   └── simplify_redlines.py
│   │       │   │   │   ├── schemas
│   │       │   │   │   │   ├── ISO-IEC29500-4_2016
│   │       │   │   │   │   │   ├── dml-chart.xsd
│   │       │   │   │   │   │   ├── dml-chartDrawing.xsd
│   │       │   │   │   │   │   ├── dml-diagram.xsd
│   │       │   │   │   │   │   ├── dml-lockedCanvas.xsd
│   │       │   │   │   │   │   ├── dml-main.xsd
│   │       │   │   │   │   │   ├── dml-picture.xsd
│   │       │   │   │   │   │   ├── dml-spreadsheetDrawing.xsd
│   │       │   │   │   │   │   ├── dml-wordprocessingDrawing.xsd
│   │       │   │   │   │   │   ├── pml.xsd
│   │       │   │   │   │   │   ├── shared-additionalCharacteristics.xsd
│   │       │   │   │   │   │   ├── shared-bibliography.xsd
│   │       │   │   │   │   │   ├── shared-commonSimpleTypes.xsd
│   │       │   │   │   │   │   ├── shared-customXmlDataProperties.xsd
│   │       │   │   │   │   │   ├── shared-customXmlSchemaProperties.xsd
│   │       │   │   │   │   │   ├── shared-documentPropertiesCustom.xsd
│   │       │   │   │   │   │   ├── shared-documentPropertiesExtended.xsd
│   │       │   │   │   │   │   ├── shared-documentPropertiesVariantTypes.xsd
│   │       │   │   │   │   │   ├── shared-math.xsd
│   │       │   │   │   │   │   ├── shared-relationshipReference.xsd
│   │       │   │   │   │   │   ├── sml.xsd
│   │       │   │   │   │   │   ├── vml-main.xsd
│   │       │   │   │   │   │   ├── vml-officeDrawing.xsd
│   │       │   │   │   │   │   ├── vml-presentationDrawing.xsd
│   │       │   │   │   │   │   ├── vml-spreadsheetDrawing.xsd
│   │       │   │   │   │   │   ├── vml-wordprocessingDrawing.xsd
│   │       │   │   │   │   │   ├── wml.xsd
│   │       │   │   │   │   │   └── xml.xsd
│   │       │   │   │   │   ├── ecma
│   │       │   │   │   │   │   └── fouth-edition
│   │       │   │   │   │   │       ├── opc-contentTypes.xsd
│   │       │   │   │   │   │       ├── opc-coreProperties.xsd
│   │       │   │   │   │   │       ├── opc-digSig.xsd
│   │       │   │   │   │   │       └── opc-relationships.xsd
│   │       │   │   │   │   ├── mce
│   │       │   │   │   │   │   └── mc.xsd
│   │       │   │   │   │   └── microsoft
│   │       │   │   │   │       ├── wml-2010.xsd
│   │       │   │   │   │       ├── wml-2012.xsd
│   │       │   │   │   │       ├── wml-2018.xsd
│   │       │   │   │   │       ├── wml-cex-2018.xsd
│   │       │   │   │   │       ├── wml-cid-2016.xsd
│   │       │   │   │   │       ├── wml-sdtdatahash-2020.xsd
│   │       │   │   │   │       └── wml-symex-2015.xsd
│   │       │   │   │   ├── validators
│   │       │   │   │   │   ├── __init__.py
│   │       │   │   │   │   ├── base.py
│   │       │   │   │   │   ├── docx.py
│   │       │   │   │   │   ├── pptx.py
│   │       │   │   │   │   └── redlining.py
│   │       │   │   │   ├── pack.py
│   │       │   │   │   ├── soffice.py
│   │       │   │   │   ├── unpack.py
│   │       │   │   │   └── validate.py
│   │       │   │   ├── __init__.py
│   │       │   │   ├── add_slide.py
│   │       │   │   ├── clean.py
│   │       │   │   └── thumbnail.py
│   │       │   ├── LICENSE.txt
│   │       │   ├── SKILL.md
│   │       │   ├── editing.md
│   │       │   └── pptxgenjs.md
│   │       ├── product-hunt-launch
│   │       │   └── SKILL.md
│   │       ├── react-native-architecture
│   │       │   └── SKILL.md
│   │       ├── react-native-best-practices
│   │       │   ├── agents
│   │       │   │   └── openai.yaml
│   │       │   ├── references
│   │       │   │   ├── images
│   │       │   │   │   ├── bundle-treemap-source-map-explorer.png
│   │       │   │   │   ├── controlled-textinput-pingpong.png
│   │       │   │   │   ├── devtools-flamegraph.png
│   │       │   │   │   ├── emerge-xray-ios.png
│   │       │   │   │   ├── expo-atlas-treemap.png
│   │       │   │   │   ├── flashlight-flatlist-vs-flashlist.png
│   │       │   │   │   ├── fps-drop-graph.png
│   │       │   │   │   ├── memory-heap-snapshot.png
│   │       │   │   │   ├── tti-warm-start-diagram.png
│   │       │   │   │   ├── view-hierarchy-flattening.png
│   │       │   │   │   ├── xcode-instruments-templates.png
│   │       │   │   │   └── xcode-thread-view.png
│   │       │   │   ├── bundle-analyze-app.md
│   │       │   │   ├── bundle-analyze-js.md
│   │       │   │   ├── bundle-barrel-exports.md
│   │       │   │   ├── bundle-code-splitting.md
│   │       │   │   ├── bundle-hermes-mmap.md
│   │       │   │   ├── bundle-library-size.md
│   │       │   │   ├── bundle-native-assets.md
│   │       │   │   ├── bundle-r8-android.md
│   │       │   │   ├── bundle-tree-shaking.md
│   │       │   │   ├── js-animations-reanimated.md
│   │       │   │   ├── js-atomic-state.md
│   │       │   │   ├── js-bottomsheet.md
│   │       │   │   ├── js-concurrent-react.md
│   │       │   │   ├── js-lists-flatlist-flashlist.md
│   │       │   │   ├── js-measure-fps.md
│   │       │   │   ├── js-memory-leaks.md
│   │       │   │   ├── js-profile-react.md
│   │       │   │   ├── js-react-compiler.md
│   │       │   │   ├── js-uncontrolled-components.md
│   │       │   │   ├── native-android-16kb-alignment.md
│   │       │   │   ├── native-measure-tti.md
│   │       │   │   ├── native-memory-leaks.md
│   │       │   │   ├── native-memory-patterns.md
│   │       │   │   ├── native-platform-setup.md
│   │       │   │   ├── native-profiling.md
│   │       │   │   ├── native-sdks-over-polyfills.md
│   │       │   │   ├── native-threading-model.md
│   │       │   │   ├── native-turbo-modules.md
│   │       │   │   └── native-view-flattening.md
│   │       │   ├── POWER.md
│   │       │   └── SKILL.md
│   │       ├── react-native-design
│   │       │   ├── references
│   │       │   │   ├── navigation-patterns.md
│   │       │   │   ├── reanimated-patterns.md
│   │       │   │   └── styling-patterns.md
│   │       │   └── SKILL.md
│   │       ├── remembering-conversations
│   │       │   ├── MCP-TOOLS.md
│   │       │   └── SKILL.md
│   │       ├── remotion-best-practices
│   │       │   ├── rules
│   │       │   │   ├── assets
│   │       │   │   │   ├── charts-bar-chart.tsx
│   │       │   │   │   ├── text-animations-typewriter.tsx
│   │       │   │   │   └── text-animations-word-highlight.tsx
│   │       │   │   ├── 3d.md
│   │       │   │   ├── animations.md
│   │       │   │   ├── assets.md
│   │       │   │   ├── audio-visualization.md
│   │       │   │   ├── audio.md
│   │       │   │   ├── calculate-metadata.md
│   │       │   │   ├── can-decode.md
│   │       │   │   ├── charts.md
│   │       │   │   ├── compositions.md
│   │       │   │   ├── display-captions.md
│   │       │   │   ├── extract-frames.md
│   │       │   │   ├── ffmpeg.md
│   │       │   │   ├── fonts.md
│   │       │   │   ├── get-audio-duration.md
│   │       │   │   ├── get-video-dimensions.md
│   │       │   │   ├── get-video-duration.md
│   │       │   │   ├── gifs.md
│   │       │   │   ├── images.md
│   │       │   │   ├── import-srt-captions.md
│   │       │   │   ├── light-leaks.md
│   │       │   │   ├── lottie.md
│   │       │   │   ├── maps.md
│   │       │   │   ├── measuring-dom-nodes.md
│   │       │   │   ├── measuring-text.md
│   │       │   │   ├── parameters.md
│   │       │   │   ├── sequencing.md
│   │       │   │   ├── sfx.md
│   │       │   │   ├── silence-detection.md
│   │       │   │   ├── subtitles.md
│   │       │   │   ├── tailwind.md
│   │       │   │   ├── text-animations.md
│   │       │   │   ├── timing.md
│   │       │   │   ├── transcribe-captions.md
│   │       │   │   ├── transitions.md
│   │       │   │   ├── transparent-videos.md
│   │       │   │   ├── trimming.md
│   │       │   │   ├── videos.md
│   │       │   │   └── voiceover.md
│   │       │   └── SKILL.md
│   │       ├── secrets-management
│   │       │   └── SKILL.md
│   │       ├── seo-audit
│   │       │   ├── evals
│   │       │   │   └── evals.json
│   │       │   ├── references
│   │       │   │   └── ai-writing-detection.md
│   │       │   └── SKILL.md
│   │       ├── shadcn-ui
│   │       │   ├── references
│   │       │   │   ├── chart.md
│   │       │   │   ├── charts-components.md
│   │       │   │   ├── customization.md
│   │       │   │   ├── forms-and-validation.md
│   │       │   │   ├── learn.md
│   │       │   │   ├── nextjs-integration.md
│   │       │   │   ├── official-ui-reference.md
│   │       │   │   ├── reference.md
│   │       │   │   ├── setup-and-configuration.md
│   │       │   │   ├── ui-components.md
│   │       │   │   └── ui-reference.md
│   │       │   └── SKILL.md
│   │       ├── signup-flow-cro
│   │       │   ├── evals
│   │       │   │   └── evals.json
│   │       │   └── SKILL.md
│   │       ├── skill-creator
│   │       │   ├── agents
│   │       │   │   ├── analyzer.md
│   │       │   │   ├── comparator.md
│   │       │   │   └── grader.md
│   │       │   ├── assets
│   │       │   │   └── eval_review.html
│   │       │   ├── eval-viewer
│   │       │   │   ├── generate_review.py
│   │       │   │   └── viewer.html
│   │       │   ├── references
│   │       │   │   └── schemas.md
│   │       │   ├── scripts
│   │       │   │   ├── __init__.py
│   │       │   │   ├── aggregate_benchmark.py
│   │       │   │   ├── generate_report.py
│   │       │   │   ├── improve_description.py
│   │       │   │   ├── package_skill.py
│   │       │   │   ├── quick_validate.py
│   │       │   │   ├── run_eval.py
│   │       │   │   ├── run_loop.py
│   │       │   │   └── utils.py
│   │       │   ├── LICENSE.txt
│   │       │   └── SKILL.md
│   │       ├── social-content
│   │       │   ├── evals
│   │       │   │   └── evals.json
│   │       │   ├── references
│   │       │   │   ├── platform-limits.md
│   │       │   │   ├── platforms.md
│   │       │   │   ├── post-templates.md
│   │       │   │   └── reverse-engineering.md
│   │       │   └── SKILL.md
│   │       ├── sql-optimization-patterns
│   │       │   └── SKILL.md
│   │       ├── supabase-postgres-best-practices
│   │       │   ├── references
│   │       │   │   ├── _contributing.md
│   │       │   │   ├── _sections.md
│   │       │   │   ├── _template.md
│   │       │   │   ├── advanced-full-text-search.md
│   │       │   │   ├── advanced-jsonb-indexing.md
│   │       │   │   ├── conn-idle-timeout.md
│   │       │   │   ├── conn-limits.md
│   │       │   │   ├── conn-pooling.md
│   │       │   │   ├── conn-prepared-statements.md
│   │       │   │   ├── data-batch-inserts.md
│   │       │   │   ├── data-n-plus-one.md
│   │       │   │   ├── data-pagination.md
│   │       │   │   ├── data-upsert.md
│   │       │   │   ├── lock-advisory.md
│   │       │   │   ├── lock-deadlock-prevention.md
│   │       │   │   ├── lock-short-transactions.md
│   │       │   │   ├── lock-skip-locked.md
│   │       │   │   ├── monitor-explain-analyze.md
│   │       │   │   ├── monitor-pg-stat-statements.md
│   │       │   │   ├── monitor-vacuum-analyze.md
│   │       │   │   ├── query-composite-indexes.md
│   │       │   │   ├── query-covering-indexes.md
│   │       │   │   ├── query-index-types.md
│   │       │   │   ├── query-missing-indexes.md
│   │       │   │   ├── query-partial-indexes.md
│   │       │   │   ├── schema-constraints.md
│   │       │   │   ├── schema-data-types.md
│   │       │   │   ├── schema-foreign-key-indexes.md
│   │       │   │   ├── schema-lowercase-identifiers.md
│   │       │   │   ├── schema-partitioning.md
│   │       │   │   ├── schema-primary-keys.md
│   │       │   │   ├── security-privileges.md
│   │       │   │   ├── security-rls-basics.md
│   │       │   │   └── security-rls-performance.md
│   │       │   └── SKILL.md
│   │       ├── theme-factory
│   │       │   ├── themes
│   │       │   │   ├── arctic-frost.md
│   │       │   │   ├── botanical-garden.md
│   │       │   │   ├── desert-rose.md
│   │       │   │   ├── forest-canopy.md
│   │       │   │   ├── golden-hour.md
│   │       │   │   ├── midnight-galaxy.md
│   │       │   │   ├── modern-minimalist.md
│   │       │   │   ├── ocean-depths.md
│   │       │   │   ├── sunset-boulevard.md
│   │       │   │   └── tech-innovation.md
│   │       │   ├── LICENSE.txt
│   │       │   ├── SKILL.md
│   │       │   └── theme-showcase.pdf
│   │       ├── turborepo
│   │       │   ├── command
│   │       │   │   └── turborepo.md
│   │       │   ├── references
│   │       │   │   ├── best-practices
│   │       │   │   │   ├── RULE.md
│   │       │   │   │   ├── dependencies.md
│   │       │   │   │   ├── packages.md
│   │       │   │   │   └── structure.md
│   │       │   │   ├── boundaries
│   │       │   │   │   └── RULE.md
│   │       │   │   ├── caching
│   │       │   │   │   ├── RULE.md
│   │       │   │   │   ├── gotchas.md
│   │       │   │   │   └── remote-cache.md
│   │       │   │   ├── ci
│   │       │   │   │   ├── RULE.md
│   │       │   │   │   ├── github-actions.md
│   │       │   │   │   ├── patterns.md
│   │       │   │   │   └── vercel.md
│   │       │   │   ├── cli
│   │       │   │   │   ├── RULE.md
│   │       │   │   │   └── commands.md
│   │       │   │   ├── configuration
│   │       │   │   │   ├── RULE.md
│   │       │   │   │   ├── global-options.md
│   │       │   │   │   ├── gotchas.md
│   │       │   │   │   └── tasks.md
│   │       │   │   ├── environment
│   │       │   │   │   ├── RULE.md
│   │       │   │   │   ├── gotchas.md
│   │       │   │   │   └── modes.md
│   │       │   │   ├── filtering
│   │       │   │   │   ├── RULE.md
│   │       │   │   │   └── patterns.md
│   │       │   │   └── watch
│   │       │   │       └── RULE.md
│   │       │   └── SKILL.md
│   │       ├── ui-ux-pro-max
│   │       │   ├── data
│   │       │   │   ├── stacks
│   │       │   │   │   ├── angular.csv
│   │       │   │   │   ├── astro.csv
│   │       │   │   │   ├── flutter.csv
│   │       │   │   │   ├── html-tailwind.csv
│   │       │   │   │   ├── jetpack-compose.csv
│   │       │   │   │   ├── laravel.csv
│   │       │   │   │   ├── nextjs.csv
│   │       │   │   │   ├── nuxt-ui.csv
│   │       │   │   │   ├── nuxtjs.csv
│   │       │   │   │   ├── react-native.csv
│   │       │   │   │   ├── react.csv
│   │       │   │   │   ├── shadcn.csv
│   │       │   │   │   ├── svelte.csv
│   │       │   │   │   ├── swiftui.csv
│   │       │   │   │   ├── threejs.csv
│   │       │   │   │   └── vue.csv
│   │       │   │   ├── _sync_all.py
│   │       │   │   ├── app-interface.csv
│   │       │   │   ├── charts.csv
│   │       │   │   ├── colors.csv
│   │       │   │   ├── design.csv
│   │       │   │   ├── draft.csv
│   │       │   │   ├── google-fonts.csv
│   │       │   │   ├── icons.csv
│   │       │   │   ├── landing.csv
│   │       │   │   ├── products.csv
│   │       │   │   ├── react-performance.csv
│   │       │   │   ├── styles.csv
│   │       │   │   ├── typography.csv
│   │       │   │   ├── ui-reasoning.csv
│   │       │   │   └── ux-guidelines.csv
│   │       │   ├── scripts
│   │       │   │   ├── core.py
│   │       │   │   ├── design_system.py
│   │       │   │   └── search.py
│   │       │   └── SKILL.md
│   │       ├── unocss
│   │       │   ├── references
│   │       │   │   ├── core-config.md
│   │       │   │   ├── core-extracting.md
│   │       │   │   ├── core-layers.md
│   │       │   │   ├── core-rules.md
│   │       │   │   ├── core-safelist.md
│   │       │   │   ├── core-shortcuts.md
│   │       │   │   ├── core-theme.md
│   │       │   │   ├── core-variants.md
│   │       │   │   ├── integrations-nuxt.md
│   │       │   │   ├── integrations-vite.md
│   │       │   │   ├── preset-attributify.md
│   │       │   │   ├── preset-icons.md
│   │       │   │   ├── preset-mini.md
│   │       │   │   ├── preset-rem-to-px.md
│   │       │   │   ├── preset-tagify.md
│   │       │   │   ├── preset-typography.md
│   │       │   │   ├── preset-web-fonts.md
│   │       │   │   ├── preset-wind3.md
│   │       │   │   ├── preset-wind4.md
│   │       │   │   ├── transformer-attributify-jsx.md
│   │       │   │   ├── transformer-compile-class.md
│   │       │   │   ├── transformer-directives.md
│   │       │   │   └── transformer-variant-group.md
│   │       │   ├── GENERATION.md
│   │       │   └── SKILL.md
│   │       ├── use-dom
│   │       │   └── SKILL.md
│   │       ├── vercel-composition-patterns
│   │       │   ├── rules
│   │       │   │   ├── _sections.md
│   │       │   │   ├── _template.md
│   │       │   │   ├── architecture-avoid-boolean-props.md
│   │       │   │   ├── architecture-compound-components.md
│   │       │   │   ├── patterns-children-over-render-props.md
│   │       │   │   ├── patterns-explicit-variants.md
│   │       │   │   ├── react19-no-forwardref.md
│   │       │   │   ├── state-context-interface.md
│   │       │   │   ├── state-decouple-implementation.md
│   │       │   │   └── state-lift-state.md
│   │       │   ├── AGENTS.md
│   │       │   ├── README.md
│   │       │   ├── SKILL.md
│   │       │   └── metadata.json
│   │       ├── vercel-react-best-practices
│   │       │   ├── rules
│   │       │   │   ├── _sections.md
│   │       │   │   ├── _template.md
│   │       │   │   ├── advanced-effect-event-deps.md
│   │       │   │   ├── advanced-event-handler-refs.md
│   │       │   │   ├── advanced-init-once.md
│   │       │   │   ├── advanced-use-latest.md
│   │       │   │   ├── async-api-routes.md
│   │       │   │   ├── async-cheap-condition-before-await.md
│   │       │   │   ├── async-defer-await.md
│   │       │   │   ├── async-dependencies.md
│   │       │   │   ├── async-parallel.md
│   │       │   │   ├── async-suspense-boundaries.md
│   │       │   │   ├── bundle-analyzable-paths.md
│   │       │   │   ├── bundle-barrel-imports.md
│   │       │   │   ├── bundle-conditional.md
│   │       │   │   ├── bundle-defer-third-party.md
│   │       │   │   ├── bundle-dynamic-imports.md
│   │       │   │   ├── bundle-preload.md
│   │       │   │   ├── client-event-listeners.md
│   │       │   │   ├── client-localstorage-schema.md
│   │       │   │   ├── client-passive-event-listeners.md
│   │       │   │   ├── client-swr-dedup.md
│   │       │   │   ├── js-batch-dom-css.md
│   │       │   │   ├── js-cache-function-results.md
│   │       │   │   ├── js-cache-property-access.md
│   │       │   │   ├── js-cache-storage.md
│   │       │   │   ├── js-combine-iterations.md
│   │       │   │   ├── js-early-exit.md
│   │       │   │   ├── js-flatmap-filter.md
│   │       │   │   ├── js-hoist-regexp.md
│   │       │   │   ├── js-index-maps.md
│   │       │   │   ├── js-length-check-first.md
│   │       │   │   ├── js-min-max-loop.md
│   │       │   │   ├── js-request-idle-callback.md
│   │       │   │   ├── js-set-map-lookups.md
│   │       │   │   ├── js-tosorted-immutable.md
│   │       │   │   ├── rendering-activity.md
│   │       │   │   ├── rendering-animate-svg-wrapper.md
│   │       │   │   ├── rendering-conditional-render.md
│   │       │   │   ├── rendering-content-visibility.md
│   │       │   │   ├── rendering-hoist-jsx.md
│   │       │   │   ├── rendering-hydration-no-flicker.md
│   │       │   │   ├── rendering-hydration-suppress-warning.md
│   │       │   │   ├── rendering-resource-hints.md
│   │       │   │   ├── rendering-script-defer-async.md
│   │       │   │   ├── rendering-svg-precision.md
│   │       │   │   ├── rendering-usetransition-loading.md
│   │       │   │   ├── rerender-defer-reads.md
│   │       │   │   ├── rerender-dependencies.md
│   │       │   │   ├── rerender-derived-state-no-effect.md
│   │       │   │   ├── rerender-derived-state.md
│   │       │   │   ├── rerender-functional-setstate.md
│   │       │   │   ├── rerender-lazy-state-init.md
│   │       │   │   ├── rerender-memo-with-default-value.md
│   │       │   │   ├── rerender-memo.md
│   │       │   │   ├── rerender-move-effect-to-event.md
│   │       │   │   ├── rerender-no-inline-components.md
│   │       │   │   ├── rerender-simple-expression-in-memo.md
│   │       │   │   ├── rerender-split-combined-hooks.md
│   │       │   │   ├── rerender-transitions.md
│   │       │   │   ├── rerender-use-deferred-value.md
│   │       │   │   ├── rerender-use-ref-transient-values.md
│   │       │   │   ├── server-after-nonblocking.md
│   │       │   │   ├── server-auth-actions.md
│   │       │   │   ├── server-cache-lru.md
│   │       │   │   ├── server-cache-react.md
│   │       │   │   ├── server-dedup-props.md
│   │       │   │   ├── server-hoist-static-io.md
│   │       │   │   ├── server-no-shared-module-state.md
│   │       │   │   ├── server-parallel-fetching.md
│   │       │   │   ├── server-parallel-nested-fetching.md
│   │       │   │   └── server-serialization.md
│   │       │   ├── AGENTS.md
│   │       │   ├── README.md
│   │       │   ├── SKILL.md
│   │       │   └── metadata.json
│   │       ├── vercel-react-native-skills
│   │       │   ├── rules
│   │       │   │   ├── _sections.md
│   │       │   │   ├── _template.md
│   │       │   │   ├── animation-derived-value.md
│   │       │   │   ├── animation-gesture-detector-press.md
│   │       │   │   ├── animation-gpu-properties.md
│   │       │   │   ├── design-system-compound-components.md
│   │       │   │   ├── fonts-config-plugin.md
│   │       │   │   ├── imports-design-system-folder.md
│   │       │   │   ├── js-hoist-intl.md
│   │       │   │   ├── list-performance-callbacks.md
│   │       │   │   ├── list-performance-function-references.md
│   │       │   │   ├── list-performance-images.md
│   │       │   │   ├── list-performance-inline-objects.md
│   │       │   │   ├── list-performance-item-expensive.md
│   │       │   │   ├── list-performance-item-memo.md
│   │       │   │   ├── list-performance-item-types.md
│   │       │   │   ├── list-performance-virtualize.md
│   │       │   │   ├── monorepo-native-deps-in-app.md
│   │       │   │   ├── monorepo-single-dependency-versions.md
│   │       │   │   ├── navigation-native-navigators.md
│   │       │   │   ├── react-compiler-destructure-functions.md
│   │       │   │   ├── react-compiler-reanimated-shared-values.md
│   │       │   │   ├── react-state-dispatcher.md
│   │       │   │   ├── react-state-fallback.md
│   │       │   │   ├── react-state-minimize.md
│   │       │   │   ├── rendering-no-falsy-and.md
│   │       │   │   ├── rendering-text-in-text-component.md
│   │       │   │   ├── scroll-position-no-state.md
│   │       │   │   ├── state-ground-truth.md
│   │       │   │   ├── ui-expo-image.md
│   │       │   │   ├── ui-image-gallery.md
│   │       │   │   ├── ui-measure-views.md
│   │       │   │   ├── ui-menus.md
│   │       │   │   ├── ui-native-modals.md
│   │       │   │   ├── ui-pressable.md
│   │       │   │   ├── ui-safe-area-scroll.md
│   │       │   │   ├── ui-scrollview-content-inset.md
│   │       │   │   └── ui-styling.md
│   │       │   ├── AGENTS.md
│   │       │   ├── README.md
│   │       │   ├── SKILL.md
│   │       │   └── metadata.json
│   │       ├── visual-design-foundations
│   │       │   ├── references
│   │       │   │   ├── color-systems.md
│   │       │   │   ├── spacing-iconography.md
│   │       │   │   └── typography-systems.md
│   │       │   └── SKILL.md
│   │       ├── vue-best-practices
│   │       │   ├── references
│   │       │   │   ├── animation-class-based-technique.md
│   │       │   │   ├── animation-state-driven-technique.md
│   │       │   │   ├── component-async.md
│   │       │   │   ├── component-data-flow.md
│   │       │   │   ├── component-fallthrough-attrs.md
│   │       │   │   ├── component-keep-alive.md
│   │       │   │   ├── component-slots.md
│   │       │   │   ├── component-suspense.md
│   │       │   │   ├── component-teleport.md
│   │       │   │   ├── component-transition-group.md
│   │       │   │   ├── component-transition.md
│   │       │   │   ├── composables.md
│   │       │   │   ├── directives.md
│   │       │   │   ├── perf-avoid-component-abstraction-in-lists.md
│   │       │   │   ├── perf-v-once-v-memo-directives.md
│   │       │   │   ├── perf-virtualize-large-lists.md
│   │       │   │   ├── plugins.md
│   │       │   │   ├── reactivity.md
│   │       │   │   ├── render-functions.md
│   │       │   │   ├── sfc.md
│   │       │   │   ├── state-management.md
│   │       │   │   └── updated-hook-performance.md
│   │       │   └── SKILL.md
│   │       ├── web-design-guidelines
│   │       │   └── SKILL.md
│   │       └── xlsx
│   │           ├── scripts
│   │           │   ├── office
│   │           │   │   ├── helpers
│   │           │   │   │   ├── __init__.py
│   │           │   │   │   ├── merge_runs.py
│   │           │   │   │   └── simplify_redlines.py
│   │           │   │   ├── schemas
│   │           │   │   │   ├── ISO-IEC29500-4_2016
│   │           │   │   │   │   ├── dml-chart.xsd
│   │           │   │   │   │   ├── dml-chartDrawing.xsd
│   │           │   │   │   │   ├── dml-diagram.xsd
│   │           │   │   │   │   ├── dml-lockedCanvas.xsd
│   │           │   │   │   │   ├── dml-main.xsd
│   │           │   │   │   │   ├── dml-picture.xsd
│   │           │   │   │   │   ├── dml-spreadsheetDrawing.xsd
│   │           │   │   │   │   ├── dml-wordprocessingDrawing.xsd
│   │           │   │   │   │   ├── pml.xsd
│   │           │   │   │   │   ├── shared-additionalCharacteristics.xsd
│   │           │   │   │   │   ├── shared-bibliography.xsd
│   │           │   │   │   │   ├── shared-commonSimpleTypes.xsd
│   │           │   │   │   │   ├── shared-customXmlDataProperties.xsd
│   │           │   │   │   │   ├── shared-customXmlSchemaProperties.xsd
│   │           │   │   │   │   ├── shared-documentPropertiesCustom.xsd
│   │           │   │   │   │   ├── shared-documentPropertiesExtended.xsd
│   │           │   │   │   │   ├── shared-documentPropertiesVariantTypes.xsd
│   │           │   │   │   │   ├── shared-math.xsd
│   │           │   │   │   │   ├── shared-relationshipReference.xsd
│   │           │   │   │   │   ├── sml.xsd
│   │           │   │   │   │   ├── vml-main.xsd
│   │           │   │   │   │   ├── vml-officeDrawing.xsd
│   │           │   │   │   │   ├── vml-presentationDrawing.xsd
│   │           │   │   │   │   ├── vml-spreadsheetDrawing.xsd
│   │           │   │   │   │   ├── vml-wordprocessingDrawing.xsd
│   │           │   │   │   │   ├── wml.xsd
│   │           │   │   │   │   └── xml.xsd
│   │           │   │   │   ├── ecma
│   │           │   │   │   │   └── fouth-edition
│   │           │   │   │   │       ├── opc-contentTypes.xsd
│   │           │   │   │   │       ├── opc-coreProperties.xsd
│   │           │   │   │   │       ├── opc-digSig.xsd
│   │           │   │   │   │       └── opc-relationships.xsd
│   │           │   │   │   ├── mce
│   │           │   │   │   │   └── mc.xsd
│   │           │   │   │   └── microsoft
│   │           │   │   │       ├── wml-2010.xsd
│   │           │   │   │       ├── wml-2012.xsd
│   │           │   │   │       ├── wml-2018.xsd
│   │           │   │   │       ├── wml-cex-2018.xsd
│   │           │   │   │       ├── wml-cid-2016.xsd
│   │           │   │   │       ├── wml-sdtdatahash-2020.xsd
│   │           │   │   │       └── wml-symex-2015.xsd
│   │           │   │   ├── validators
│   │           │   │   │   ├── __init__.py
│   │           │   │   │   ├── base.py
│   │           │   │   │   ├── docx.py
│   │           │   │   │   ├── pptx.py
│   │           │   │   │   └── redlining.py
│   │           │   │   ├── pack.py
│   │           │   │   ├── soffice.py
│   │           │   │   ├── unpack.py
│   │           │   │   └── validate.py
│   │           │   └── recalc.py
│   │           ├── LICENSE.txt
│   │           └── SKILL.md
│   ├── assets
│   │   ├── fonts
│   │   │   ├── .gitignore
│   │   │   ├── ArialBold.ttf
│   │   │   ├── DejaVuSans.ttf
│   │   │   └── Royal_Arial.ttf
│   │   ├── tips
│   │   │   ├── tips_ru.json
│   │   │   └── tips_uk.json
│   │   ├── ic_running.png
│   │   └── icon.png
│   ├── icons
│   │   ├── apple-touch-icon.png
│   │   ├── favicon-96x96.png
│   │   ├── favicon.ico
│   │   ├── favicon.svg
│   │   ├── site.webmanifest
│   │   ├── web-app-manifest-192x192.png
│   │   └── web-app-manifest-512x512.png
│   ├── icons_old
│   │   ├── icon-128.png
│   │   ├── icon-144.png
│   │   ├── icon-152.png
│   │   ├── icon-192.png
│   │   ├── icon-384.png
│   │   ├── icon-512.png
│   │   ├── icon-72.png
│   │   ├── icon-96.png
│   │   └── icon-maskable.png
│   ├── report
│   │   ├── .gitignore
│   │   ├── HealthPro_APK_BugFix_Round3.pdf
│   │   ├── HealthPro_APK_BugFix_Round3_1777559475453.pdf
│   │   ├── HealthPro_APK_BugFix_Round3_Continuation.pdf
│   │   ├── HealthPro_APK_BugFix_Round3_FULL_1777567444668.pdf
│   │   ├── HealthPro_APK_Round4_Part1_BackgroundNotifications.pdf
│   │   ├── HealthPro_Agent_Task_v5.1_FINAL_1778087118646.pdf
│   │   ├── HealthPro_Agent_Task_v5.2_1778169393727.pdf
│   │   ├── HealthPro_Agent_Task_v5.2_1778171944305.pdf
│   │   ├── HealthPro_Agent_Task_v5.2_1778183129276.pdf
│   │   ├── HealthPro_Agent_Tasks_Round5_1777971378591.pdf
│   │   ├── HealthPro_BugFix_Report.pdf
│   │   ├── HealthPro_BugFix_Task_1777226414031.pdf
│   │   ├── HealthPro_Pedometer_BugFix_Report.pdf
│   │   ├── HealthPro_Pedometer_ForegroundService_Plan.pdf
│   │   ├── HealthPro_Phase1_Refactor_Final_Report.pdf
│   │   ├── HealthPro_Phase2_Stage5_Report.pdf
│   │   ├── HealthPro_Phase2_Task_1777403174733.pdf
│   │   ├── HealthPro_PrePhase2_Final_Report.pdf
│   │   ├── HealthPro_Refactor_Report_Stage_4.pdf
│   │   ├── HealthPro_Refactor_Report_Stage_4_complete.pdf
│   │   ├── HealthPro_Report_25_04_2026_1777044089924.pdf
│   │   ├── HealthPro_Round5_Report_05052026.pdf
│   │   ├── HealthPro_Round6_Report_05052026.pdf
│   │   ├── HealthPro_Session_June2026_SplashStepsVersion.pdf
│   │   ├── HealthPro_Session_May2026_2_Report.pdf
│   │   ├── HealthPro_Session_May2026_3_Report.pdf
│   │   ├── HealthPro_Session_May2026_Report.pdf
│   │   ├── HealthPro_Session_May2026_SQLite_ECharts.pdf
│   │   ├── HealthPro_Session_v5.1_Report.pdf
│   │   ├── HealthPro_Session_v5.2.0_Biometric_PDF_DaysPicker_Part3_Report.pdf
│   │   ├── HealthPro_Session_v5.2.0_SQLite_ECharts_Report.pdf
│   │   ├── HealthPro_Session_v5.3.0_Backup_HPB_Biometric_Fix_Part4_Report.pdf
│   │   ├── HealthPro_Task_PrePhase2_1777148191481.pdf
│   │   ├── HealthPro_Індекс_Здоровя_Новий_Test_Report_1777880377800.pdf
│   │   ├── HealthPro_—_Крокомір_Фінал_1777924595195.pdf
│   │   └── session_report_v5.2.pdf
│   ├── scripts
│   │   ├── HealthPro_generate_session_report.py
│   │   └── gen-version.js
│   ├── src
│   │   ├── core
│   │   │   ├── biometric.js
│   │   │   ├── charts.js
│   │   │   ├── constants.js
│   │   │   ├── db.js
│   │   │   ├── platform.js
│   │   │   ├── sqlite.js
│   │   │   ├── state.js
│   │   │   ├── storage.js
│   │   │   ├── utils.js
│   │   │   └── version.gen.js
│   │   ├── features
│   │   │   ├── analytics
│   │   │   │   ├── adherence.js
│   │   │   │   ├── bmi.js
│   │   │   │   ├── bp-zones.js
│   │   │   │   ├── health-score.js
│   │   │   │   ├── index.js
│   │   │   │   ├── iz-chart.js
│   │   │   │   ├── recommendations.js
│   │   │   │   ├── scatter.js
│   │   │   │   └── trend-modal.js
│   │   │   ├── charts
│   │   │   │   ├── bp-chart.js
│   │   │   │   ├── helpers.js
│   │   │   │   └── index.js
│   │   │   ├── export
│   │   │   │   ├── backup.js
│   │   │   │   ├── csv.js
│   │   │   │   ├── index.js
│   │   │   │   ├── logo.js
│   │   │   │   ├── modal.js
│   │   │   │   ├── pdf-report.js
│   │   │   │   ├── pdf.js
│   │   │   │   └── print.js
│   │   │   ├── history
│   │   │   │   └── index.js
│   │   │   ├── journal
│   │   │   │   └── index.js
│   │   │   ├── meds
│   │   │   │   ├── drug-db.js
│   │   │   │   └── index.js
│   │   │   ├── pressure
│   │   │   │   ├── critical.js
│   │   │   │   ├── index.js
│   │   │   │   ├── norm.js
│   │   │   │   └── who.js
│   │   │   ├── pwa
│   │   │   │   └── index.js
│   │   │   ├── settings
│   │   │   │   ├── data.js
│   │   │   │   ├── disclaimer.js
│   │   │   │   ├── email-sms.js
│   │   │   │   ├── i18n.js
│   │   │   │   ├── index.js
│   │   │   │   ├── notif-perm.js
│   │   │   │   ├── notifications.js
│   │   │   │   ├── profile.js
│   │   │   │   └── theme.js
│   │   │   ├── steps
│   │   │   │   └── index.js
│   │   │   └── tips
│   │   │       └── index.js
│   │   ├── i18n
│   │   │   ├── index.js
│   │   │   ├── pdf.js
│   │   │   ├── print.i18n.js
│   │   │   ├── recommendations.i18n.js
│   │   │   ├── ui.ru.js
│   │   │   ├── ui.uk.js
│   │   │   ├── welcome-disclaimer.js
│   │   │   └── who.i18n.js
│   │   ├── pwa
│   │   │   └── sw-register.js
│   │   ├── app.js
│   │   └── main.js
│   ├── styles
│   │   ├── app.css
│   │   ├── app.css.bak
│   │   ├── base.css
│   │   ├── charts.css
│   │   ├── components.css
│   │   ├── features.css
│   │   ├── layout.css
│   │   ├── modal.css
│   │   ├── tips.css
│   │   └── welcome.css
│   ├── task_feedback
│   │   ├── .gitignore
│   │   ├── README_1776955050113.md
│   │   ├── README_1778087135983.md
│   │   ├── Screenshot_20260421_144827_Samsung_Browser_1776772127233.jpg
│   │   ├── Screenshot_20260422_173709_Chrome_1776868682977.jpg
│   │   ├── Screenshot_20260505_100743_HealthPro_1777971041180.jpg
│   │   ├── Screenshot_20260505_100823_One_UI_Home_1777971041305.jpg
│   │   ├── Screenshot_20260505_100839_Fit_1777971041259.jpg
│   │   ├── free-icon-running-12569142_1778026741027.png
│   │   ├── replit_1778087135983.md
│   │   ├── Логіка_Індексу_Здоров'я_-_Фінальний_підсумок_260424_212859_1777832179377.pdf
│   │   ├── Логіка_Індексу_Здоров'я_-_Фінальний_підсумок_260424_212859_1777880216645.pdf
│   │   ├── Медицинский_дисклеймер_RU_1776828892448.pdf
│   │   ├── Медицинский_дисклеймер_RU_1776829151317.pdf
│   │   ├── Медицинский_дисклеймер_RU_1776829295475.pdf
│   │   ├── Медичний_дисклеймер_для_Android-додатка_(Щоденник_тиску)_1776775559248.pdf
│   │   ├── Переезд_1776939662534.pdf
│   │   ├── Переезд_1776940021312.pdf
│   │   ├── Переезд_1776940166769.pdf
│   │   ├── Переезд_1776955040803.pdf
│   │   ├── Рефакторінг_крокомір_GPT_1777913976113.txt
│   │   ├── Тест_+_таск_260505_173056_1777992516902.txt
│   │   ├── Фідбєк_5.1.1_1778181121429.txt
│   │   ├── зображення_1777229210817.png
│   │   └── таск_доповнення_1777992516955.txt
│   ├── tests
│   │   ├── activity-score.test.js
│   │   ├── bmi-activity-combo.test.js
│   │   ├── bmi-score.test.js
│   │   ├── bmi.test.js
│   │   ├── bp-dot-class.test.js
│   │   ├── bp-norm.test.js
│   │   ├── bp-pulse-thresholds.test.js
│   │   ├── foreground-step.test.js
│   │   ├── health-score-i18n.test.js
│   │   ├── health-score.test.js
│   │   ├── measurement-window.test.js
│   │   ├── pill-schedule.test.js
│   │   ├── pills-score.test.js
│   │   ├── setup.js
│   │   ├── step-fixes.test.js
│   │   ├── stepgoal-bmi-combo.test.js
│   │   └── veto-boundary.test.js
│   ├── .cursorrules
│   ├── .gitignore
│   ├── .npmrc
│   ├── .replit
│   ├── .replitignore
│   ├── README.md
│   ├── index.html
│   ├── manifest.json
│   ├── package-lock.json
│   ├── package.json
│   ├── replit.md
│   ├── sw.js
│   ├── vite.config.js
│   └── vitest.config.js
├── android
│   ├── app
│   │   ├── src
│   │   │   ├── androidTest
│   │   │   │   └── java
│   │   │   │       └── com
│   │   │   │           └── getcapacitor
│   │   │   │               └── myapp
│   │   │   │                   └── ExampleInstrumentedTest.java
│   │   │   ├── main
│   │   │   │   ├── java
│   │   │   │   │   └── ua
│   │   │   │   │       └── healthpro
│   │   │   │   │           └── app
│   │   │   │   │               ├── BootReceiver.java
│   │   │   │   │               ├── ForegroundStepPlugin.java
│   │   │   │   │               ├── MainActivity.java
│   │   │   │   │               └── StepCounterService.java
│   │   │   │   ├── res
│   │   │   │   │   ├── drawable
│   │   │   │   │   │   ├── ic_launcher_background.xml
│   │   │   │   │   │   ├── ic_stat_notification.xml
│   │   │   │   │   │   ├── ic_stat_running.xml
│   │   │   │   │   │   ├── ic_stat_steps.xml
│   │   │   │   │   │   └── logo_splash.xml
│   │   │   │   │   ├── drawable-land-hdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-ldpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-mdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-night-hdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-night-ldpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-night-mdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-night-xhdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-night-xxhdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-night-xxxhdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-xhdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-xxhdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-land-xxxhdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-night
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-hdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-ldpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-mdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-night-hdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-night-ldpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-night-mdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-night-xhdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-night-xxhdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-night-xxxhdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-xhdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-xxhdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-port-xxxhdpi
│   │   │   │   │   │   └── splash.png
│   │   │   │   │   ├── drawable-v24
│   │   │   │   │   │   └── ic_launcher_foreground.xml
│   │   │   │   │   ├── layout
│   │   │   │   │   │   └── activity_main.xml
│   │   │   │   │   ├── mipmap-anydpi-v26
│   │   │   │   │   │   ├── ic_launcher.xml
│   │   │   │   │   │   └── ic_launcher_round.xml
│   │   │   │   │   ├── mipmap-hdpi
│   │   │   │   │   │   ├── ic_launcher.png
│   │   │   │   │   │   ├── ic_launcher_background.png
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   └── ic_launcher_round.png
│   │   │   │   │   ├── mipmap-ldpi
│   │   │   │   │   │   ├── ic_launcher.png
│   │   │   │   │   │   ├── ic_launcher_background.png
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   └── ic_launcher_round.png
│   │   │   │   │   ├── mipmap-mdpi
│   │   │   │   │   │   ├── ic_launcher.png
│   │   │   │   │   │   ├── ic_launcher_background.png
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   └── ic_launcher_round.png
│   │   │   │   │   ├── mipmap-xhdpi
│   │   │   │   │   │   ├── ic_launcher.png
│   │   │   │   │   │   ├── ic_launcher_background.png
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   └── ic_launcher_round.png
│   │   │   │   │   ├── mipmap-xxhdpi
│   │   │   │   │   │   ├── ic_launcher.png
│   │   │   │   │   │   ├── ic_launcher_background.png
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   └── ic_launcher_round.png
│   │   │   │   │   ├── mipmap-xxxhdpi
│   │   │   │   │   │   ├── ic_launcher.png
│   │   │   │   │   │   ├── ic_launcher_background.png
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   └── ic_launcher_round.png
│   │   │   │   │   ├── values
│   │   │   │   │   │   ├── ic_launcher_background.xml
│   │   │   │   │   │   ├── strings.xml
│   │   │   │   │   │   └── styles.xml
│   │   │   │   │   └── xml
│   │   │   │   │       └── file_paths.xml
│   │   │   │   └── AndroidManifest.xml
│   │   │   └── test
│   │   │       └── java
│   │   │           └── com
│   │   │               └── getcapacitor
│   │   │                   └── myapp
│   │   │                       └── ExampleUnitTest.java
│   │   ├── .gitignore
│   │   ├── build.gradle
│   │   ├── capacitor.build.gradle
│   │   └── proguard-rules.pro
│   ├── gradle
│   │   └── wrapper
│   │       ├── gradle-wrapper.jar
│   │       └── gradle-wrapper.properties
│   ├── .gitignore
│   ├── build.gradle
│   ├── capacitor.settings.gradle
│   ├── gradle.properties
│   ├── gradlew
│   ├── gradlew.bat
│   ├── settings.gradle
│   └── variables.gradle
├── assets
│   └── icon.png
├── attached_assets
│   ├── HealthPro_Agent_Task_v5.2_Part2_1778236766904.pdf
│   ├── Pasted--exportData-4-0-measur-1778257436846_1778257436847.txt
│   ├── android-apk_1777886122135.yml
│   ├── android-apk_1777887743174.yml
│   ├── ci_1777886122135.yml
│   └── ci_1777887743175.yml
├── scripts
│   ├── generate_apk_bugfix_round3_continuation_report.cjs
│   ├── generate_apk_bugfix_round3_report.cjs
│   ├── generate_apk_round4_part1_report.cjs
│   ├── generate_bugfix_report.cjs
│   ├── generate_phase1_report.cjs
│   ├── generate_phase2_stage5_report.cjs
│   ├── generate_prephase2_report.cjs
│   ├── generate_report.cjs
│   └── generate_session_report.cjs
├── .gitignore
├── .replit
├── README.md
├── capacitor.config.json
├── package-lock.json
├── package.json
├── replit.md
├── replit.nix
└── skills-lock.json

498 directories, 2334 files
```
<!-- TREE_END -->

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

### v5.3 — Захист і нові модулі (поточна ціль)
- [ ] **PIN-код / біометрія** (Capacitor BiometricAuth)
- [ ] **SQLCipher** — шифрування SQLite at-rest (Android Keystore)
- [ ] **Вкладка «Вага»** — графік з ІМТ-зонами, ціль
- [ ] **Вкладка «Сон»** — час, якість, кореляція з тиском
- [ ] **ScatterChart** «Кроки ↔ Тиск» — кореляційний графік
- [ ] **Офлайн поради** — `assets/tips/tips_uk.json` за категоріями ВООЗ/МОЗ

### v5.4 — Повнота функцій
- [ ] PDF-звіт для лікаря з лікарським шаблоном + ECharts-графіки
- [ ] Adherence-трекер ліків — `db.calcAdherence()` готово
- [ ] Повторення розкладу ліків (щодня / через день / дні тижня)
- [ ] Фільтр журналу за датою/діапазоном

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
npm run version    # Підняти версію вручну (PATCH +1)
npm run test       # Vitest
```

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
*Версія: v5.3.1 · Травень 2026*
