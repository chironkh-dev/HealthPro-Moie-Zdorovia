"""
HealthPro · Моє Здоров'я — Звіт сесії v5.1
Генерується reportlab + DejaVu Sans (кирилиця).
Запуск: python3 generate_session_report_v5.1.py
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import datetime

# ── Шрифти ───────────────────────────────────────────────────────────────────
FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
pdfmetrics.registerFont(TTFont('DejaVu', FONT_PATH))
pdfmetrics.registerFont(TTFont('DejaVuBold', FONT_BOLD))

# ── Кольори ───────────────────────────────────────────────────────────────────
DARK_BG   = colors.HexColor('#0f172a')
BLUE_MAIN = colors.HexColor('#3b82f6')
BLUE_CARD = colors.HexColor('#1e293b')
TEXT_MAIN = colors.HexColor('#f1f5f9')
TEXT_DIM  = colors.HexColor('#94a3b8')
GREEN     = colors.HexColor('#22c55e')
AMBER     = colors.HexColor('#f59e0b')
RED       = colors.HexColor('#ef4444')
BORDER    = colors.HexColor('#334155')

# ── Стилі ─────────────────────────────────────────────────────────────────────
def s(name, base=None, **kw):
    kwargs = dict(fontName='DejaVu', fontSize=10, textColor=TEXT_MAIN,
                  leading=14, spaceAfter=0, spaceBefore=0)
    kwargs.update(kw)
    return ParagraphStyle(name, **kwargs)

S_H1    = s('H1', fontSize=22, fontName='DejaVuBold', textColor=TEXT_MAIN, leading=28, spaceAfter=4)
S_H2    = s('H2', fontSize=14, fontName='DejaVuBold', textColor=BLUE_MAIN, leading=20, spaceBefore=14, spaceAfter=4)
S_H3    = s('H3', fontSize=11, fontName='DejaVuBold', textColor=TEXT_MAIN, leading=16, spaceBefore=6, spaceAfter=2)
S_BODY  = s('BODY', fontSize=9.5, textColor=TEXT_MAIN, leading=14)
S_DIM   = s('DIM',  fontSize=9, textColor=TEXT_DIM,  leading=13)
S_CODE  = s('CODE', fontSize=8.5, fontName='DejaVu', textColor=colors.HexColor('#7dd3fc'), leading=12)
S_OK    = s('OK',   fontSize=9.5, textColor=GREEN, leading=14, fontName='DejaVuBold')
S_TODO  = s('TODO', fontSize=9.5, textColor=AMBER, leading=14, fontName='DejaVuBold')
S_WARN  = s('WARN', fontSize=9.5, textColor=RED, leading=14, fontName='DejaVuBold')

W, H = A4
MARGIN = 18 * mm
COL = W - 2 * MARGIN

def hr():
    return HRFlowable(width=COL, thickness=0.5, color=BORDER, spaceAfter=6, spaceBefore=6)

def sp(h=4):
    return Spacer(1, h)

def p(text, style=None):
    return Paragraph(text, style or S_BODY)

def done(text): return Paragraph('&#10003; ' + text, S_OK)
def todo(text): return Paragraph('&#9650; ' + text, S_TODO)

def card_table(rows, col_widths=None):
    if col_widths is None:
        col_widths = [COL * 0.38, COL * 0.62]
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLUE_CARD),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#172033')),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_MAIN),
        ('FONTNAME', (0, 0), (-1, -1), 'DejaVu'),
        ('FONTNAME', (0, 0), (0, -1), 'DejaVuBold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('LEADING', (0, 0), (-1, -1), 13),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#172033'), colors.HexColor('#1a2640')]),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('ROUNDEDCORNERS', [4]),
    ]))
    return t

# ── Документ ─────────────────────────────────────────────────────────────────
OUTPUT = 'HealthPro_Session_v5.1_Report.pdf'
doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
)

story = []
now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')

# ── ОБКЛАДИНКА ───────────────────────────────────────────────────────────────
story += [
    sp(10),
    p('HealthPro · Моє Здоров\'я', S_H1),
    p('Звіт сесії розробки — <b>v5.1.0</b>', s('sub', fontSize=13, textColor=BLUE_MAIN, fontName='DejaVuBold', leading=18)),
    sp(4),
    p(f'Дата генерації: {now}', S_DIM),
    p('Платформа: Vanilla JS + Vite 5 + Capacitor 8 (Android)', S_DIM),
    sp(8),
    hr(),
]

# ── 1. МЕТА СЕСІЇ ─────────────────────────────────────────────────────────────
story += [
    p('1. Мета сесії', S_H2),
    p('Сесія v5.1 — шість пріоритетних завдань CORE DATA та БЕЗПЕКА:', S_BODY),
    sp(4),
]
goals = [
    ['#', 'Завдання', 'Модуль'],
    ['1', 'SQLCipher (шифрування SQLite at-rest)', 'core/sqlite.js'],
    ['2', 'ScatterChart Кроки↔Тиск', 'analytics/scatter.js'],
    ['3', 'BarChart розподіл зон ВООЗ (6 кат.)', 'analytics/bp-zones.js'],
    ['4', 'Офлайн поради ВООЗ/МОЗ', 'features/tips/ + assets/tips/'],
    ['5', 'Журнал із date-range picker + нотатки', 'features/journal/index.js'],
    ['6', 'i18n uk/ru, replit.md, README, v5.1.0', 'i18n/ + docs'],
]
story.append(card_table(goals, [COL*0.07, COL*0.53, COL*0.40]))
story.append(sp(8))

# ── 2. ВИКОНАНІ ЗАВДАННЯ ──────────────────────────────────────────────────────
story += [
    p('2. Виконані завдання', S_H2),
]

# 2.1 SQLCipher
story += [
    p('2.1 SQLCipher — шифрування SQLite', S_H3),
    p('Реалізовано getOrCreateKey() через @capacitor/preferences. '
      'На Android — Keystore під капотом. Web-fallback без шифрування (isNative()=false).', S_BODY),
    sp(3),
]
sqlc = [
    ['Компонент', 'Реалізація'],
    ['getOrCreateKey()', 'crypto.getRandomValues(32 bytes) → hex → Preferences'],
    ['createConnection', 'true, "secret", DB_VERSION — encrypted'],
    ['setEncryptionSecret', 'Перед open(), try/catch для web-fallback'],
    ['Web-fallback', 'isNative()=false → без шифрування, in-memory'],
]
story.append(card_table(sqlc))
story.append(sp(6))

# 2.2 ScatterChart
story += [
    p('2.2 ScatterChart Кроки ↔ Тиск', S_H3),
    p('ECharts ScatterChart (CanvasRenderer). '
      'Джерело: db.queryStepPressureCorrelation() — JOIN steps_log × measurements. '
      'Пустий стан якщо <10 парних записів.', S_BODY),
    sp(3),
]
scat = [
    ['Характеристика', 'Значення'],
    ['Renderer', 'CanvasRenderer (великий датасет)'],
    ['Осі', 'X: Кроки / Y: Сист. тиск (мм рт.ст.)'],
    ['Threshold', '< 10 парних → empty state, без графіку'],
    ['Dispose', 'disposeScatterChart() при виходах з вкладки'],
]
story.append(card_table(scat))
story.append(sp(6))

# 2.3 BarChart BP-Zones
story += [
    p('2.3 BarChart розподіл зон ВООЗ', S_H3),
    p('6 категорій ВООЗ (гіпотонія, норма, висока-норма, гіпертонія 1/2/3). '
      'ECharts BarChart (SVGRenderer). Кольори: --green / --amber / --red.', S_BODY),
    sp(3),
]
bpz = [
    ['Категорія ВООЗ', 'SYS (мм)', 'DIA (мм)', 'Колір'],
    ['Гіпотонія', '< 90', '< 60', 'синій'],
    ['Норма', '90–119', '60–79', 'зелений'],
    ['Висока-норма', '120–129', '80–84', 'жовто-зелений'],
    ['Гіп. 1 ст.', '130–139', '85–89', 'жовтий'],
    ['Гіп. 2 ст.', '140–179', '90–109', 'помаранчевий'],
    ['Криз', '≥ 180', '≥ 110', 'червоний'],
]
story.append(card_table(bpz, [COL*0.30, COL*0.20, COL*0.20, COL*0.30]))
story.append(sp(6))

# 2.4 Офлайн поради
story += [
    p('2.4 Офлайн поради ВООЗ/МОЗ', S_H3),
    p('Два JSON-файли (uk/ru), 6 категорій × 3 поради = 18 порад. '
      'Реальні WHO URL де є, source_url="" для МОЗ. '
      'Дисклеймер у кожній картці.', S_BODY),
    sp(3),
]
tips = [
    ['Категорія', 'Кількість порад', 'Джерело'],
    ['pressure_grade1', '3', 'who.int'],
    ['pressure_grade2', '3', 'who.int'],
    ['pressure_high_normal', '3', 'who.int'],
    ['pressure_normal', '3', 'who.int'],
    ['hypertension_crisis', '3', 'who.int'],
    ['hypotension', '3', 'who.int'],
]
story.append(card_table(tips, [COL*0.38, COL*0.25, COL*0.37]))
story.append(sp(6))

# 2.5 Журнал
story += [
    p('2.5 Журнал вимірів — date-range picker', S_H3),
    p('features/journal/index.js: публічний API renderJournal() / setJournalFrom() / '
      'setJournalTo() / setJournalType(). '
      'Дефолт: останні 7 днів. Фільтр-вкладки (all/pressure). '
      'Нотатки до вимірювань (поле note) відображаються.', S_BODY),
    sp(6),
]

# 2.6 i18n та інтеграція
story += [
    p('2.6 i18n + HTML + CSS інтеграція', S_H3),
]
integ = [
    ['Файл', 'Зміни'],
    ['ui.uk.js + ui.ru.js', '15 нових ключів: scatter/bp-zones/tips/journal'],
    ['styles/tips.css', 'Новий файл: tips-bento, tip-card, chart-card, journal-filter'],
    ['styles/app.css', '@import tips.css доданий'],
    ['index.html', '3 нові секції в page-analytics; journal date-range picker'],
    ['src/app.js', 'Імпорт journal; ACTIONS: setJournalType/From/To; dispose логіка'],
    ['analytics/index.js', 'Виклики renderScatterChart/renderBPZonesChart/renderTipsBlock'],
    ['package.json', 'version: 5.0.0 → 5.1.0'],
    ['version.gen.js', 'Автогенерований: HealthPro v5.1.0 (3865c5e)'],
]
story.append(card_table(integ))
story.append(sp(8))

# ── 3. АРХІТЕКТУРНІ РІШЕННЯ ──────────────────────────────────────────────────
story += [
    p('3. Архітектурні рішення v5.1', S_H2),
    sp(3),
]
arch = [
    ['Рішення', 'Обґрунтування'],
    ['SQLCipher via Preferences', 'Android Keystore під капотом; web без шифрування'],
    ['CanvasRenderer для Scatter', 'Потенційно великий датасет кроків (>500 точок)'],
    ['SVGRenderer для BarChart', 'Фіксований датасет 6 категорій, HiDPI якість'],
    ['WeakMap інстансів ECharts', 'Уникнення витоків пам\'яті при dispose'],
    ['Офлайн JSON (no fetch)', 'ВООЗ-поради без зовнішніх запитів, TTL=86400s кеш'],
    ['No inline handlers', 'data-change= замість onchange= (архітектурне правило)'],
    ['Event bus для journal', 'on("measurement:deleted") → re-render журналу'],
]
story.append(card_table(arch))
story.append(sp(8))

# ── 4. ФАЙЛОВА СТРУКТУРА ─────────────────────────────────────────────────────
story += [
    p('4. Нові/змінені файли', S_H2),
]
files = [
    ['Файл', 'Статус', 'Розмір'],
    ['src/core/sqlite.js', 'ОНОВЛЕНО', 'getOrCreateKey + SQLCipher'],
    ['src/features/analytics/scatter.js', 'НОВИЙ', 'ScatterChart ECharts'],
    ['src/features/analytics/bp-zones.js', 'НОВИЙ', 'BarChart BP-Zones'],
    ['src/features/analytics/index.js', 'ОНОВЛЕНО', 'Імпорти + виклики v5.1'],
    ['src/features/tips/index.js', 'НОВИЙ', 'analyzeTrends + renderTipsBlock'],
    ['src/features/journal/index.js', 'НОВИЙ', 'date-range + journal render'],
    ['assets/tips/tips_uk.json', 'НОВИЙ', '18 порад ВООЗ, uk'],
    ['assets/tips/tips_ru.json', 'НОВИЙ', '18 порад ВООЗ, ru'],
    ['styles/tips.css', 'НОВИЙ', 'tip-card, chart-card, journal'],
    ['styles/app.css', 'ОНОВЛЕНО', '@import tips.css'],
    ['src/i18n/ui.uk.js', 'ОНОВЛЕНО', '+15 ключів v5.1'],
    ['src/i18n/ui.ru.js', 'ОНОВЛЕНО', '+15 ключів v5.1'],
    ['src/app.js', 'ОНОВЛЕНО', 'journal import + ACTIONS + dispose'],
    ['index.html', 'ОНОВЛЕНО', '3 аналіт. секції + journal filter'],
    ['package.json', 'ОНОВЛЕНО', 'version 5.1.0'],
    ['src/core/version.gen.js', 'РЕГЕНЕРОВАНО', 'v5.1.0 · 2026-05-06'],
]
story.append(card_table(files, [COL*0.40, COL*0.18, COL*0.42]))
story.append(sp(8))

# ── 5. БЕЗПЕКА ДАНИХ ─────────────────────────────────────────────────────────
story += [
    p('5. Стан безпеки даних', S_H2),
    sp(3),
]
sec = [
    ['Компонент', 'v5.0', 'v5.1', 'Примітка'],
    ['SQLite at-rest', '❌', '✅', 'SQLCipher реалізовано'],
    ['Ключ шифрування', '❌', '✅', 'getOrCreateKey() / Preferences'],
    ['Web-fallback', 'in-memory', 'in-memory', 'без шифрування (isNative()=false)'],
    ['Блокування додатку', '❌', '❌', 'v5.3: PIN/Biometric'],
]
story.append(card_table(sec, [COL*0.30, COL*0.10, COL*0.10, COL*0.50]))
story.append(sp(8))

# ── 6. БЕКЛО v5.2 ────────────────────────────────────────────────────────────
story += [
    p('6. Бекло — наступний спринт v5.2', S_H2),
]
backlog = [
    ['Пріоритет', 'Завдання', 'Модуль'],
    ['🟡 HIGH', 'Нотатки до вимірювань (textarea при введенні)', 'pressure/index.js'],
    ['🟡 HIGH', 'Adherence-трекер ліків (db.calcAdherence готово)', 'analytics/adherence.js'],
    ['🟡 HIGH', 'Повторення розкладу ліків (поле days — UI логіка)', 'meds/index.js'],
    ['🟡 HIGH', 'PDF-звіт для лікаря (лікарський шаблон + ECharts SVG)', 'export/'],
    ['🟢 WANT', 'PIN-код / біометрія', 'Capacitor BiometricAuth'],
    ['🟢 WANT', 'Вкладка «Вага» + ІМТ-графік', 'нова таблиця weight_log'],
    ['🟢 WANT', 'Вкладка «Сон» + кореляція з тиском', 'нова таблиця sleep_log'],
]
story.append(card_table(backlog, [COL*0.15, COL*0.52, COL*0.33]))
story.append(sp(8))

# ── 7. ПІДСУМОК ───────────────────────────────────────────────────────────────
story += [
    p('7. Підсумок сесії', S_H2),
    sp(3),
    done('6/6 завдань v5.1 виконано'),
    done('SQLCipher: getOrCreateKey() + createConnection(encrypted=true)'),
    done('ScatterChart + BarChart BP-Zones: ECharts, WeakMap, dispose при виходах'),
    done('Офлайн JSON поради: 2 мови × 6 категорій × 3 поради, WHO URLs'),
    done('Журнал: date-range picker, тип-фільтр, нотатки, data-change архітектура'),
    done('i18n uk/ru: +15 нових ключів, жодного хардкоду UI'),
    done('replit.md + README оновлено, version.gen.js → v5.1.0 · 2026-05-06'),
    sp(6),
    p('Принцип пріоритизації дотримано:', S_DIM),
    p('БЕЗПЕКА → CORE DATA → АНАЛІТИКА → UX → КОСМЕТИКА', s('pri', fontSize=9, textColor=BLUE_MAIN, fontName='DejaVuBold', leading=14)),
    sp(12),
    hr(),
    p(f'HealthPro v5.1.0 · Звіт сесії · {now}', s('foot', fontSize=8, textColor=TEXT_DIM, leading=12)),
]

# ── ЗБЕРЕЖЕННЯ ───────────────────────────────────────────────────────────────
doc.build(story)
print(f'PDF збережено: {OUTPUT}')
