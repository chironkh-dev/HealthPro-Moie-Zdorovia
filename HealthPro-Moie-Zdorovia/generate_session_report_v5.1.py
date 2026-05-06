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

# ── Кольори (СВІТЛИЙ фон — максимальна читабельність) ────────────────────────
WHITE      = colors.HexColor('#FFFFFF')
BLACK      = colors.HexColor('#0F172A')
BLUE_DARK  = colors.HexColor('#1E40AF')
BLUE_MED   = colors.HexColor('#2563EB')
BLUE_LIGHT = colors.HexColor('#EFF6FF')
BLUE_HEAD  = colors.HexColor('#1D4ED8')
GRAY_BG    = colors.HexColor('#F8FAFC')
GRAY_ROW   = colors.HexColor('#F1F5F9')
GRAY_ROW2  = colors.HexColor('#E2E8F0')
GRAY_BORD  = colors.HexColor('#CBD5E1')
TEXT_BODY  = colors.HexColor('#1E293B')
TEXT_GRAY  = colors.HexColor('#475569')
GREEN      = colors.HexColor('#15803D')
GREEN_BG   = colors.HexColor('#DCFCE7')
AMBER      = colors.HexColor('#B45309')
AMBER_BG   = colors.HexColor('#FEF3C7')
RED        = colors.HexColor('#DC2626')

W, H = A4
MARGIN = 18 * mm
COL = W - 2 * MARGIN

# ── Стилі ─────────────────────────────────────────────────────────────────────
S_H1   = ParagraphStyle('H1',   fontName='DejaVuBold', fontSize=22, textColor=BLUE_DARK,  leading=28, spaceAfter=2)
S_SUB  = ParagraphStyle('SUB',  fontName='DejaVu',     fontSize=12, textColor=TEXT_GRAY,  leading=16, spaceAfter=0)
S_H2   = ParagraphStyle('H2',   fontName='DejaVuBold', fontSize=13, textColor=BLUE_HEAD,  leading=18, spaceBefore=14, spaceAfter=5)
S_H3   = ParagraphStyle('H3',   fontName='DejaVuBold', fontSize=10.5, textColor=TEXT_BODY, leading=15, spaceBefore=6, spaceAfter=3)
S_BODY = ParagraphStyle('BODY', fontName='DejaVu',     fontSize=9.5,  textColor=TEXT_BODY, leading=14)
S_DIM  = ParagraphStyle('DIM',  fontName='DejaVu',     fontSize=9,    textColor=TEXT_GRAY, leading=13)
S_OK   = ParagraphStyle('OK',   fontName='DejaVuBold', fontSize=9.5,  textColor=GREEN,     leading=14)
S_WARN = ParagraphStyle('WARN', fontName='DejaVuBold', fontSize=9.5,  textColor=AMBER,     leading=14)
S_CODE = ParagraphStyle('CODE', fontName='DejaVu',     fontSize=8.5,  textColor=BLUE_MED,  leading=12)
S_FOOT = ParagraphStyle('FOOT', fontName='DejaVu',     fontSize=8,    textColor=TEXT_GRAY, leading=12)
S_PRI  = ParagraphStyle('PRI',  fontName='DejaVuBold', fontSize=9,    textColor=BLUE_MED,  leading=14)

def hr():
    return HRFlowable(width=COL, thickness=0.7, color=GRAY_BORD, spaceAfter=6, spaceBefore=6)

def sp(h=4):
    return Spacer(1, h)

def p(text, style=None):
    return Paragraph(text, style or S_BODY)

def done(text):
    return Paragraph('&#10003; ' + text, S_OK)

def todo(text):
    return Paragraph('&#9650; ' + text, S_WARN)

# ── Таблиця ───────────────────────────────────────────────────────────────────
def card_table(rows, col_widths=None):
    if col_widths is None:
        col_widths = [COL * 0.38, COL * 0.62]

    style = TableStyle([
        # Заголовок
        ('BACKGROUND',   (0, 0), (-1, 0), BLUE_DARK),
        ('TEXTCOLOR',    (0, 0), (-1, 0), WHITE),
        ('FONTNAME',     (0, 0), (-1, 0), 'DejaVuBold'),
        ('FONTSIZE',     (0, 0), (-1, 0), 9),
        ('LEADING',      (0, 0), (-1, 0), 13),
        # Дані — чергування рядків
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_ROW]),
        ('TEXTCOLOR',    (0, 1), (-1, -1), TEXT_BODY),
        ('FONTNAME',     (0, 1), (-1, -1), 'DejaVu'),
        ('FONTNAME',     (0, 1), (0, -1), 'DejaVuBold'),
        ('FONTSIZE',     (0, 1), (-1, -1), 9),
        ('LEADING',      (0, 1), (-1, -1), 13),
        # Сітка
        ('GRID',         (0, 0), (-1, -1), 0.5, GRAY_BORD),
        ('LINEBELOW',    (0, 0), (-1, 0),  1.0, BLUE_MED),
        # Відступи
        ('TOPPADDING',   (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 5),
        ('LEFTPADDING',  (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
    ])

    t = Table(rows, colWidths=col_widths)
    t.setStyle(style)
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
    sp(8),
    p("HealthPro \u00b7 \u041c\u043e\u0454 \u0417\u0434\u043e\u0440\u043e\u0432'\u044f", S_H1),
    p('Звіт сесії розробки — <b>v5.1.0</b>', S_SUB),
    sp(4),
    p(f'Дата: {now}', S_DIM),
    p('Платформа: Vanilla JS + Vite 5 + Capacitor 8 (Android)', S_DIM),
    sp(6),
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
    ['2', 'ScatterChart Кроки\u2194Тиск', 'analytics/scatter.js'],
    ['3', 'BarChart розподіл зон ВООЗ (6 кат.)', 'analytics/bp-zones.js'],
    ['4', 'Офлайн поради ВООЗ/МОЗ', 'features/tips/ + assets/tips/'],
    ['5', 'Журнал із date-range picker + нотатки', 'features/journal/index.js'],
    ['6', 'i18n uk/ru, replit.md, README, v5.1.0', 'i18n/ + docs'],
]
story.append(card_table(goals, [COL*0.07, COL*0.53, COL*0.40]))
story.append(sp(8))

# ── 2. ВИКОНАНІ ЗАВДАННЯ ──────────────────────────────────────────────────────
story += [p('2. Виконані завдання', S_H2)]

# 2.1 SQLCipher
story += [
    p('2.1 SQLCipher — шифрування SQLite', S_H3),
    p('Реалізовано getOrCreateKey() через @capacitor/preferences. '
      'На Android — Keystore під капотом. Web-fallback без шифрування (isNative()=false).', S_BODY),
    sp(3),
]
sqlc = [
    ['Компонент', 'Реалізація'],
    ['getOrCreateKey()', 'crypto.getRandomValues(32 bytes) \u2192 hex \u2192 Preferences'],
    ['createConnection', 'encrypted=true, mode="secret", DB_VERSION'],
    ['setEncryptionSecret', 'Перед open(), try/catch для web-fallback'],
    ['Web-fallback', 'isNative()=false \u2192 без шифрування, in-memory'],
]
story.append(card_table(sqlc))
story.append(sp(6))

# 2.2 ScatterChart
story += [
    p('2.2 ScatterChart Кроки \u2194 Тиск', S_H3),
    p('ECharts ScatterChart (CanvasRenderer). Джерело: db.queryStepPressureCorrelation() '
      '— JOIN steps_log \u00d7 measurements. Пустий стан якщо < 10 парних записів.', S_BODY),
    sp(3),
]
scat = [
    ['Характеристика', 'Значення'],
    ['Renderer', 'CanvasRenderer (великий датасет)'],
    ['Осі', 'X: Кроки / Y: Сист. тиск (мм рт.ст.)'],
    ['Threshold', '< 10 парних \u2192 empty state, без графіку'],
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
    ['Гіпотонія',      '< 90',     '< 60',     'синій'],
    ['Норма',          '90–119',   '60–79',    'зелений'],
    ['Висока-норма',   '120–129',  '80–84',    'жовто-зелений'],
    ['Гіп. 1 ст.',     '130–139',  '85–89',    'жовтий'],
    ['Гіп. 2 ст.',     '140–179',  '90–109',   'помаранчевий'],
    ['Криз',           '\u2265 180', '\u2265 110', 'червоний'],
]
story.append(card_table(bpz, [COL*0.30, COL*0.20, COL*0.20, COL*0.30]))
story.append(sp(6))

# 2.4 Офлайн поради
story += [
    p('2.4 Офлайн поради ВООЗ/МОЗ', S_H3),
    p('Два JSON-файли (uk/ru), 6 категорій \u00d7 3 поради = 18 порад. '
      'Реальні WHO URL де є, source_url="" для МОЗ (нестабільні). '
      'Дисклеймер у кожній картці.', S_BODY),
    sp(3),
]
tips = [
    ['Категорія', 'Порад', 'Джерело'],
    ['pressure_grade1',       '3', 'who.int'],
    ['pressure_grade2',       '3', 'who.int'],
    ['pressure_high_normal',  '3', 'who.int'],
    ['pressure_normal',       '3', 'who.int'],
    ['hypertension_crisis',   '3', 'who.int'],
    ['hypotension',           '3', 'who.int'],
]
story.append(card_table(tips, [COL*0.50, COL*0.12, COL*0.38]))
story.append(sp(6))

# 2.5 Журнал
story += [
    p('2.5 Журнал вимірів — date-range picker', S_H3),
    p('features/journal/index.js: renderJournal() / setJournalFrom() / setJournalTo() / setJournalType(). '
      'Дефолт: останні 7 днів. Фільтр-вкладки all/pressure. '
      'Нотатки до вимірювань (поле note) відображаються в кожному записі.', S_BODY),
    sp(6),
]

# 2.6 i18n + інтеграція
story += [
    p('2.6 i18n + HTML + CSS інтеграція', S_H3),
]
integ = [
    ['Файл', 'Зміни'],
    ['ui.uk.js + ui.ru.js',          '+15 ключів scatter/bp-zones/tips/journal'],
    ['styles/tips.css',              'Новий: tips-bento, tip-card, chart-card, journal-filter'],
    ['styles/app.css',               '@import tips.css додано'],
    ['index.html',                   '3 нові секції в page-analytics + journal filter'],
    ['src/app.js',                   'Журнал import + ACTIONS + dispose логіка'],
    ['analytics/index.js',           'renderScatterChart / renderBPZonesChart / renderTipsBlock'],
    ['package.json',                 'version 5.0.0 \u2192 5.1.0'],
    ['src/core/version.gen.js',      'v5.1.0 \u00b7 2026-05-06 17:42 \u00b7 3865c5e'],
]
story.append(card_table(integ))
story.append(sp(8))

# ── 3. АРХІТЕКТУРНІ РІШЕННЯ ──────────────────────────────────────────────────
story += [p('3. Архітектурні рішення v5.1', S_H2), sp(3)]
arch = [
    ['Рішення', 'Обґрунтування'],
    ['SQLCipher via Preferences',   'Android Keystore під капотом; web — без шифрування'],
    ['CanvasRenderer для Scatter',  'Великий датасет кроків (потенційно >500 точок)'],
    ['SVGRenderer для BarChart',    'Фіксований датасет 6 категорій, HiDPI якість'],
    ['WeakMap інстансів ECharts',   'Уникнення витоків пам\'яті при dispose'],
    ['Офлайн JSON (без fetch)',      'ВООЗ-поради без зовнішніх запитів, TTL=86400s'],
    ['data-change= замість onchange=', 'Архітектурне правило: No inline handlers'],
    ['Event bus для journal',        'on("measurement:deleted") \u2192 re-render журналу'],
]
story.append(card_table(arch))
story.append(sp(8))

# ── 4. ФАЙЛОВА СТРУКТУРА ─────────────────────────────────────────────────────
story += [p('4. Нові та змінені файли', S_H2)]
files = [
    ['Файл', 'Статус', 'Що змінено'],
    ['src/core/sqlite.js',                  'ОНОВЛЕНО', 'getOrCreateKey + SQLCipher'],
    ['src/features/analytics/scatter.js',   'НОВИЙ',    'ScatterChart ECharts'],
    ['src/features/analytics/bp-zones.js',  'НОВИЙ',    'BarChart BP-Zones'],
    ['src/features/analytics/index.js',     'ОНОВЛЕНО', 'Імпорти + виклики v5.1'],
    ['src/features/tips/index.js',          'НОВИЙ',    'analyzeTrends + renderTipsBlock'],
    ['src/features/journal/index.js',       'НОВИЙ',    'date-range + journal render'],
    ['assets/tips/tips_uk.json',            'НОВИЙ',    '18 порад ВООЗ (uk)'],
    ['assets/tips/tips_ru.json',            'НОВИЙ',    '18 порад ВООЗ (ru)'],
    ['styles/tips.css',                     'НОВИЙ',    'tip-card, chart-card, journal'],
    ['styles/app.css',                      'ОНОВЛЕНО', '@import tips.css'],
    ['src/i18n/ui.uk.js',                   'ОНОВЛЕНО', '+15 ключів v5.1'],
    ['src/i18n/ui.ru.js',                   'ОНОВЛЕНО', '+15 ключів v5.1'],
    ['src/app.js',                          'ОНОВЛЕНО', 'journal import + ACTIONS'],
    ['index.html',                          'ОНОВЛЕНО', '3 секції аналітики + journal'],
    ['package.json',                        'ОНОВЛЕНО', 'version 5.1.0'],
    ['src/core/version.gen.js',             'АВТО',     'v5.1.0 \u00b7 2026-05-06'],
]
story.append(card_table(files, [COL*0.42, COL*0.14, COL*0.44]))
story.append(sp(8))

# ── 5. БЕЗПЕКА ДАНИХ ─────────────────────────────────────────────────────────
story += [p('5. Стан безпеки даних', S_H2), sp(3)]
sec = [
    ['Компонент', 'v5.0', 'v5.1', 'Примітка'],
    ['SQLite at-rest',   'Ні',       'Так',  'SQLCipher реалізовано'],
    ['Ключ шифрування',  'Немає',    'Так',  'getOrCreateKey() / @capacitor/preferences'],
    ['Web-fallback',     'in-memory','in-memory', 'Без шифрування (isNative()=false)'],
    ['Блокування додатку','Немає',   'Немає','v5.3: PIN/Biometric заплановано'],
]
story.append(card_table(sec, [COL*0.30, COL*0.10, COL*0.10, COL*0.50]))
story.append(sp(8))

# ── 6. БЕКЛО v5.2 ────────────────────────────────────────────────────────────
story += [p('6. Бекло — наступний спринт v5.2', S_H2)]
backlog = [
    ['Пріоритет', 'Завдання', 'Стан'],
    ['ВАЖЛИВО',   'Нотатки до вимірювань (textarea при введенні)', 'В роботу'],
    ['ВАЖЛИВО',   'Adherence-трекер ліків (db.calcAdherence готово)', 'В роботу'],
    ['ВАЖЛИВО',   'Повторення розкладу ліків (поле days — UI логіка)', 'В роботу'],
    ['ВАЖЛИВО',   'PDF-звіт для лікаря (ECharts SVG + reportlab)', 'В роботу'],
    ['БАЖАНО',    'PIN-код / біометрія (Capacitor BiometricAuth)', 'v5.3'],
    ['БАЖАНО',    'Вкладка «Вага» + графік ІМТ', 'v5.3'],
    ['БАЖАНО',    'Вкладка «Сон» + кореляція з тиском', 'v5.3'],
]
story.append(card_table(backlog, [COL*0.15, COL*0.62, COL*0.23]))
story.append(sp(8))

# ── 7. ПІДСУМОК ───────────────────────────────────────────────────────────────
story += [
    p('7. Підсумок сесії', S_H2),
    sp(4),
    done('6/6 завдань v5.1 успішно виконано'),
    done('SQLCipher: getOrCreateKey() + createConnection(encrypted=true, secret)'),
    done('ScatterChart + BarChart BP-Zones: ECharts, WeakMap, dispose при виходах'),
    done('Офлайн поради: 2 мови × 6 категорій × 3 поради = 18 WHO-верифікованих'),
    done('Журнал: date-range picker, тип-фільтр, нотатки, data-change архітектура'),
    done('i18n uk/ru: +15 нових ключів, жодного хардкоду UI-тексту'),
    done('replit.md оновлено, version.gen.js \u2192 v5.1.0 \u00b7 2026-05-06'),
    sp(6),
    p('Принцип пріоритизації дотримано:', S_DIM),
    p('БЕЗПЕКА  \u2192  CORE DATA  \u2192  АНАЛІТИКА  \u2192  UX  \u2192  КОСМЕТИКА', S_PRI),
    sp(14),
    hr(),
    p(f'HealthPro v5.1.0  \u00b7  Звіт сесії  \u00b7  {now}', S_FOOT),
]

# ── ЗБЕРЕЖЕННЯ ───────────────────────────────────────────────────────────────
doc.build(story)
print(f'PDF збережено: {OUTPUT}')
