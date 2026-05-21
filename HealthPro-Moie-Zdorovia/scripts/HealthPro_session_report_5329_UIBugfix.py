#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HealthPro — Моє Здоров'я
Звіт сесії: UI Bugfix 10 пунктів
"""

VERSION     = "5.3.29"
DESCRIPTION = "UI_Bugfix_10_punktiv"
PART        = None

import datetime, os, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Шрифти ────────────────────────────────────────────────────────────────────
FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu",
    os.path.join(os.path.dirname(__file__), "../assets/fonts"),
    os.path.join(os.path.dirname(__file__), "../public/assets/fonts"),
]
DEJAVU = next((p for p in FONT_PATHS if os.path.exists(os.path.join(p, "DejaVuSans.ttf"))), FONT_PATHS[0])
pdfmetrics.registerFont(TTFont("Arial",        f"{DEJAVU}/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold",   f"{DEJAVU}/DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", f"{DEJAVU}/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Mono",   f"{DEJAVU}/DejaVuSansMono.ttf"))

# ── Кольори ───────────────────────────────────────────────────────────────────
C_COVER_BG   = colors.HexColor("#DBEAFE")
C_COVER_LINE = colors.HexColor("#1E40AF")
C_TITLE_TEXT = colors.HexColor("#1E3A5F")
C_SUB_TEXT   = colors.HexColor("#1D4ED8")
C_DATE_TEXT  = colors.HexColor("#64748B")
C_NAVY   = colors.HexColor("#0D1630")
C_ACCENT = colors.HexColor("#1A3A6E")
C_BLUE   = colors.HexColor("#1E40AF")
C_CYAN   = colors.HexColor("#0E7490")
C_TEAL   = colors.HexColor("#065F46")
C_ORANGE = colors.HexColor("#9A3412")
C_ROW_A  = colors.HexColor("#EFF6FF")
C_ROW_B  = colors.HexColor("#F8FAFC")
C_BORDER = colors.HexColor("#CBD5E1")
C_HEADER = colors.HexColor("#1E3A6E")
W, H = A4

# ── Стилі ─────────────────────────────────────────────────────────────────────
def S(name, **kw): return ParagraphStyle(name, **kw)
ST = {
  "Title":  S("Title",  fontName="Arial-Bold",  fontSize=24, textColor=C_TITLE_TEXT,
                        alignment=TA_CENTER, leading=30, spaceAfter=2),
  "Sub":    S("Sub",    fontName="Arial",        fontSize=12, textColor=C_SUB_TEXT,
                        alignment=TA_CENTER, leading=16, spaceAfter=2),
  "Date":   S("Date",   fontName="Arial-Italic", fontSize=9,  textColor=C_DATE_TEXT,
                        alignment=TA_CENTER, leading=12),
  "H1":     S("H1",     fontName="Arial-Bold",  fontSize=13, textColor=C_ACCENT,
                        spaceBefore=12, spaceAfter=5, leading=17),
  "H2":     S("H2",     fontName="Arial-Bold",  fontSize=11, textColor=C_CYAN,
                        spaceBefore=9, spaceAfter=4, leading=14),
  "Body":   S("Body",   fontName="Arial",        fontSize=9.5, textColor=colors.HexColor("#1E293B"),
                        leading=14, spaceAfter=4, alignment=TA_JUSTIFY),
  "Bullet": S("Bullet", fontName="Arial",        fontSize=9.5, textColor=colors.HexColor("#1E293B"),
                        leading=14, leftIndent=14, firstLineIndent=-10, spaceAfter=2),
  "Sub2":   S("Sub2",   fontName="Arial",        fontSize=9,  textColor=colors.HexColor("#475569"),
                        leading=13, leftIndent=28, firstLineIndent=-10, spaceAfter=2),
  "Code":   S("Code",   fontName="Arial-Mono",   fontSize=8,  textColor=colors.HexColor("#1E293B"),
                        backColor=colors.HexColor("#F1F5F9"), leading=12,
                        leftIndent=12, spaceAfter=2, borderPad=4),
  "Note":   S("Note",   fontName="Arial-Italic", fontSize=8.5, textColor=colors.HexColor("#64748B"),
                        leading=12, leftIndent=10, spaceAfter=3),
  "TH":     S("TH",     fontName="Arial-Bold",  fontSize=9,  textColor=colors.white,
                        alignment=TA_CENTER, leading=12),
  "TC":     S("TC",     fontName="Arial",        fontSize=8.5, textColor=colors.HexColor("#1E293B"),
                        leading=12),
  "TCC":    S("TCC",    fontName="Arial",        fontSize=8.5, textColor=colors.HexColor("#1E293B"),
                        alignment=TA_CENTER, leading=12),
  "StatV":  S("StatV",  fontName="Arial-Bold",  fontSize=22, textColor=C_BLUE,
                        alignment=TA_CENTER, leading=26),
  "StatL":  S("StatL",  fontName="Arial",        fontSize=8,  textColor=C_ACCENT,
                        alignment=TA_CENTER, leading=11),
  "StatS":  S("StatS",  fontName="Arial-Italic", fontSize=7.5, textColor=C_CYAN,
                        alignment=TA_CENTER, leading=10),
}

def sp(h=6):  return Spacer(1, h)
def hr():     return HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6, spaceBefore=4)
def body(t):  return Paragraph(t, ST["Body"])
def h1(t):    return Paragraph(f"<b>{t}</b>", ST["H1"])
def h2(t):    return Paragraph(f"<b>{t}</b>", ST["H2"])
def bullet(t, sub=False): return Paragraph(f"• {t}", ST["Sub2" if sub else "Bullet"])
def code(t):  return Paragraph(t, ST["Code"])
def note(t):  return Paragraph(f"<i>{t}</i>", ST["Note"])

def _session_label():
    part_str = f" · Part {PART}" if PART else ""
    return f"Звіт сесії v{VERSION} · {DESCRIPTION.replace('_', ' ')}{part_str}"

def cover():
    today = datetime.date.today()
    months = {1:"січня",2:"лютого",3:"березня",4:"квітня",5:"травня",
              6:"червня",7:"липня",8:"серпня",9:"вересня",
              10:"жовтня",11:"листопада",12:"грудня"}
    ds = f"{today.day} {months[today.month]} {today.year} р."
    rows = [
        [Paragraph("HealthPro · Моє Здоров'я", ST["Title"])],
        [Paragraph(_session_label(), ST["Sub"])],
        [Paragraph(ds, ST["Date"])],
    ]
    tbl = Table(rows, colWidths=[W - 4*cm],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), C_COVER_BG),
            ("TOPPADDING",    (0,0),(0,0), 22),
            ("BOTTOMPADDING", (0,0),(0,0), 6),
            ("TOPPADDING",    (0,1),(0,1), 0),
            ("BOTTOMPADDING", (0,1),(0,1), 6),
            ("TOPPADDING",    (0,2),(0,2), 0),
            ("BOTTOMPADDING", (0,2),(0,2), 20),
            ("LINEBELOW",     (0,2),(0,2), 2.5, C_COVER_LINE),
        ]))
    return tbl

def stat_cell(val, label, sub=""):
    inner = [[Paragraph(val, ST["StatV"])], [Paragraph(label, ST["StatL"])]]
    if sub: inner.append([Paragraph(sub, ST["StatS"])])
    return Table(inner, colWidths=[3.6*cm],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), C_ROW_A),
            ("TOPPADDING",    (0,0),(-1,-1), 8),
            ("BOTTOMPADDING", (0,0),(-1,-1), 8),
            ("BOX",           (0,0),(-1,-1), 1, C_BLUE),
        ]))

def stats_row(cells):
    return Table([cells], colWidths=[3.7*cm]*len(cells), hAlign="CENTER",
        style=TableStyle([("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4)]))

def section_box(num, title):
    n = Paragraph(f"<b>{num}</b>", ParagraphStyle("N", fontName="Arial-Bold",
                  fontSize=13, textColor=colors.white, alignment=TA_CENTER))
    t = Paragraph(f"<b>{title}</b>", ParagraphStyle("T", fontName="Arial-Bold",
                  fontSize=11, textColor=C_NAVY, leading=15))
    return Table([[n, t]], colWidths=[1.4*cm, 14.1*cm],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(0,0), C_NAVY),
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
            ("TOPPADDING",    (0,0),(-1,-1), 6),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("LEFTPADDING",   (0,0),(0,0), 6),
            ("RIGHTPADDING",  (0,0),(0,0), 6),
            ("LEFTPADDING",   (1,0),(1,0), 10),
            ("LINEBELOW",     (0,0),(-1,-1), 1.5, C_NAVY),
        ]))

def file_table(rows):
    SC = {"НОВИЙ":    colors.HexColor("#065F46"),
          "ОНОВЛЕНО": colors.HexColor("#1D4ED8"),
          "ВИДАЛЕНО": colors.HexColor("#991B1B")}
    head = [Paragraph("Файл", ST["TH"]), Paragraph("Статус", ST["TH"]), Paragraph("Опис змін", ST["TH"])]
    data = [head]
    for fname, status, desc in rows:
        clr = SC.get(status, C_BLUE)
        sp_ = Paragraph(status, ParagraphStyle("S", fontName="Arial-Bold", fontSize=7.5,
                        textColor=colors.white, alignment=TA_CENTER))
        sb  = Table([[sp_]], colWidths=[2.1*cm],
                    style=TableStyle([("BACKGROUND",(0,0),(-1,-1),clr),
                                      ("TOPPADDING",(0,0),(-1,-1),2),
                                      ("BOTTOMPADDING",(0,0),(-1,-1),2)]))
        data.append([Paragraph(fname, ST["TC"]), sb, Paragraph(desc, ST["TC"])])
    return Table(data, colWidths=[5.2*cm, 2.3*cm, 8*cm],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,0), C_HEADER),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [C_ROW_A, C_ROW_B]),
            ("GRID",          (0,0),(-1,-1), 0.4, C_BORDER),
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ]))

def arch_table(rows):
    head = [Paragraph("Пункт / Рішення", ST["TH"]), Paragraph("Деталі реалізації", ST["TH"])]
    data = [head]
    for decision, detail in rows:
        data.append([Paragraph(f"<b>{decision}</b>", ST["TC"]), Paragraph(detail, ST["TC"])])
    return Table(data, colWidths=[4.5*cm, 11*cm],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,0), C_HEADER),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [C_ROW_A, C_ROW_B]),
            ("GRID",          (0,0),(-1,-1), 0.4, C_BORDER),
            ("VALIGN",        (0,0),(-1,-1), "TOP"),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ]))

# ══════════════════════════════════════════════════════════════════════════════
def build_story():
    s = []
    s += [cover(), sp(12)]

    s += [stats_row([
        stat_cell("10",  "Пунктів виконано",  "UI Bugfix повний список"),
        stat_cell("6",   "Файлів змінено",    "JS · HTML · i18n · CSS"),
        stat_cell("513", "Тестів проходить",  "16/16 файлів ✓"),
        stat_cell("0",   "Помилок збірки",    "Vite build ✓"),
    ]), sp(14), hr()]

    # ═══ БЛОК 1: Модаль "Звіт для лікаря" — кнопки ═══════════════════════════
    s.append(section_box("1а", "Кнопки модалі 'Звіт для лікаря' — стиль виправлено"))
    s.append(sp(6))
    s.append(body(
        "Проблема: кнопки 'Зберегти звіт' та 'Поділитись' використовували клас btn-print "
        "з кольором var(--blue-dim) — синій текст на світло-синьому тлі. Іконки ледве видно. "
        "Рішення: замінено на btn btn-blue (як кнопка 'Зберегти вимір'). "
        "Кнопка 'Поділитись' отримала зелений градієнт linear-gradient(135deg,#059669,#047857) "
        "у межах тієї ж системи кнопок. Іконки стали білими — добре читаються."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("index.html · рядки 934–943", "ОНОВЛЕНО",
         "btn-print + inline style → btn btn-blue. "
         "Кнопка share: додано style з зеленим градієнтом."),
    ]))
    s += [sp(8), hr()]

    # ═══ БЛОК 2: shareReport — виправлено Share Sheet ═════════════════════════
    s.append(section_box("1б", "shareReport — виправлено Share Sheet Android"))
    s.append(sp(6))
    s.append(body(
        "Проблема: shareReport() викликав _platformShare({files: [result.blob]}) — "
        "Capacitor Share API не приймає Blob-об'єкти напряму, тому Share Sheet не відкривався. "
        "Рішення: замінено на platformDownload(filename, blob, 'application/pdf'). "
        "Функція platformDownload вже правильно записує файл у Files/Documents "
        "через Capacitor Filesystem, а потім відкриває системний Share Sheet з URI файлу."
    ))
    s.append(sp(4))
    s.append(arch_table([
        ("Було (зламано)",
         "_platformShare({ files: [result.blob] }) — "
         "Blob не є валідним типом для Capacitor Share.files[]. "
         "Потрібен File або URI рядок."),
        ("Стало (виправлено)",
         "await _platformDownload(result.filename, result.blob, 'application/pdf') — "
         "функція вже існувала і коректно обробляла файл + Share Sheet."),
    ]))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/export/index.js", "ОНОВЛЕНО",
         "import share → import download. shareReport() тепер використовує _platformDownload."),
    ]))
    s += [sp(8), hr()]

    # ═══ БЛОК 3: PDF page break ════════════════════════════════════════════════
    s.append(section_box("2а", "PDF: розумний перенос сторінок із заголовком секції"))
    s.append(sp(6))
    s.append(body(
        "Проблема: при генерації PDF через html2canvas + jsPDF вся сторінка рендерилась "
        "як одне велике зображення, яке розрізалось на рівні сторінки. Заголовок нової секції "
        "міг опинитися в кінці попередньої сторінки без вмісту, або бути розрізаний навпіл. "
        "Рішення: після рендеру (поки контейнер ще у DOM) вимірюються позиції всіх "
        ".pdf-section-head елементів. При нарізці на сторінки: якщо заголовок секції потрапляє "
        "у зону охорони (останні 22 мм сторінки) — нижня частина поточної сторінки "
        "заливається білим прямокутником (pdf.rect + fill), наступна сторінка починається "
        "прямо з заголовка."
    ))
    s.append(sp(4))
    s.append(arch_table([
        ("class pdf-section-head",
         "Додано до sectionTitle() — маркує кожен заголовок секції у HTML."),
        ("Вимір позицій (DOM)",
         "el.getBoundingClientRect().top - containerRect.top — "
         "відносна позиція в пікселях DOM. Множимо на pxToMm = pageW / canvas.width / scale."),
        ("GUARD = 22 мм",
         "Якщо заголовок секції знаходиться ближче ніж 22 мм до кінця сторінки — "
         "переносимо. Значення підібрано для A4 з полями 28px."),
        ("pdf.rect + setFillColor(255,255,255)",
         "Закриває 'звисаючий' хвіст зображення білим; наступна сторінка "
         "починається від позиції заголовка, що усуває дублювання."),
    ]))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/export/pdf-report.js", "ОНОВЛЕНО",
         "sectionTitle(): додано class='pdf-section-head'. "
         "_buildPDFBlob(): нова логіка нарізки з вимірюванням позицій + white-rect fill."),
    ]))
    s += [sp(8), hr()]

    # ═══ БЛОК 4: PDF заголовки ═════════════════════════════════════════════════
    s.append(section_box("2б", "PDF: виправлено заголовки секцій"))
    s.append(sp(6))
    s.append(body(
        "journalTitle містив '(останні 30)' / '(последние 30)' — некоректно, оскільки "
        "кількість вимірів залежить від обраного періоду і може бути не 30. "
        "adherTitle містив '— 30 днів' / '— 30 дней' — аналогічна проблема. "
        "Рядки виправлено в обох мовах (uk + ru) у файлі i18n/pdf.js."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/i18n/pdf.js", "ОНОВЛЕНО",
         "journalTitle uk: 'Журнал вимірів (останні 30)' → 'Журнал вимірів'. "
         "journalTitle ru: 'Журнал измерений (последние 30)' → 'Журнал измерений'. "
         "adherTitle uk: 'Прийом ліків — 30 днів' → 'Прийом ліків'. "
         "adherTitle ru: 'Приём лекарств — 30 дней' → 'Приём лекарств'."),
    ]))
    s += [sp(8), hr()]

    # ═══ БЛОК 5: Пульс на графіку PDF ═════════════════════════════════════════
    s.append(section_box("2в", "PDF: лінія пульсу на графіку + чекбокс"))
    s.append(sp(6))
    s.append(body(
        "Графік у PDF відображав лише систолічний та діастолічний тиск. "
        "Додано опцію відображення лінії пульсу. "
        "У модалі 'Звіт для лікаря' з'явився чекбокс 'Пульс на графіку' одразу після "
        "'Графік тиску'. buildBPChartSVG() отримав другий параметр showPulse. "
        "При увімкненні: значення пульсу включаються у розрахунок min/max осі Y, "
        "малюється помаранчева пунктирна лінія з точками та підписом 'Пульс' у легенді."
    ))
    s.append(sp(4))
    s.append(arch_table([
        ("buildBPChartSVG(data, showPulse)",
         "pulseVals = showPulse ? data.map(m => m.pulse).filter(Boolean) : []. "
         "Включаються у vals для розрахунку minV/maxV. "
         "pulseWithIdx: масив {i, p} для точок з наявним пульсом."),
        ("SVG пульс-лінія",
         "stroke=#f97316 (оранжевий), stroke-dasharray=5,3, stroke-width=1.8. "
         "Точки: circle r=2.5 fill=#f97316. Легенда: текст 'Пульс' поруч з кружком."),
        ("sections.pulse в modal.js",
         "_reportSections додано поле pulse: true. "
         "toggleReportSection підхоплює автоматично через data-section='pulse'."),
    ]))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/export/pdf-report.js", "ОНОВЛЕНО",
         "buildBPChartSVG(data, showPulse) — пульс-лінія + легенда. "
         "buildReportHTML: передає sections.pulse !== false."),
        ("src/features/export/modal.js",      "ОНОВЛЕНО",
         "_reportSections: додано pulse: true."),
        ("index.html",                         "ОНОВЛЕНО",
         "Чекбокс expS-pulse 'Пульс на графіку' після expS-chart у сітці секцій."),
    ]))
    s += [sp(8), hr()]

    # ═══ БЛОК 6: Логотип у PDF ═════════════════════════════════════════════════
    s.append(section_box("2г", "PDF: логотип у шапці звіту"))
    s.append(sp(6))
    s.append(body(
        "У ранніх версіях PDF шапка містила логотип. Він зник після рефакторингу. "
        "Оскільки favicon.svg — це великий файл з base64 PNG (554 КБ), "
        "він не підходить для inline-вбудови у html2canvas. "
        "Рішення: inline SVG-іконка ЕКГ-хвилі на синьому прямокутнику з округленими кутами — "
        "мінімалістичний логотип у стилі бренду HealthPro."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/export/pdf-report.js", "ОНОВЛЕНО",
         "БЛОК 1 шапки: div з flex + SVG-іконка 42x42px (rect+path ЕКГ). "
         "HealthPro · reportTitle поруч з логотипом."),
    ]))
    s += [sp(8), hr()]

    # ═══ БЛОК 7: Резервна копія — CSV ═════════════════════════════════════════
    s.append(section_box("3а", "Резервна копія: видалено рядок 'Експорт CSV'"))
    s.append(sp(6))
    s.append(body(
        "Рядок 'Експорт CSV' у блоці 'Резервна копія' (Налаштування) видалено. "
        "CSV-звіт доступний через модаль 'Звіт для лікаря' (перемикач формату PDF/CSV), "
        "тому дублювання у блоці Резервна копія недоречне."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("index.html · рядок 727", "ВИДАЛЕНО",
         "settings-row з Експорт CSV / кнопка CSV → видалено повністю."),
    ]))
    s += [sp(8), hr()]

    # ═══ БЛОК 8: Вкладка Ліки ═════════════════════════════════════════════════
    s.append(section_box("4а+4б+4в", "Вкладка 'Ліки' — 3 виправлення"))
    s.append(sp(6))
    s.append(arch_table([
        ("4а — Кнопка 'Додати препарат'",
         "btn-violet → btn-blue. Тепер відповідає єдиній системі кнопок додатку."),
        ("4б — Застереження: кнопка → SVG-трикутник",
         "Кнопку '? Застереження' (btn-outline внизу картки) замінено на "
         "абсолютно-позиційований SVG-трикутник ⚠ у правому верхньому куті картки. "
         "Трикутник: fill=#ef4444 (червоний), білий '!' всередині (line + circle). "
         "Розмір 28x28px. Картка отримала position:relative."),
        ("4в — Одиниця дозування",
         "Поле 'Дозування' тепер містить два елементи: input (число, flex:1) + "
         "select#pillUnit (72px) з варіантами мг/мкг/мл/шт./крап. "
         "addPill() об'єднує: dose = doseNum + ' ' + doseUnit. "
         "Зберігається як '50 мг' — коректно відображається у списку 'Усі препарати' та PDF."),
    ]))
    s.append(sp(4))
    s.append(file_table([
        ("index.html · Ліки-картка",       "ОНОВЛЕНО",
         "btn-violet→btn-blue; position:relative; трикутник absolute top-right; "
         "select#pillUnit поруч з pillDose; видалено старий flex-div ? Застереження."),
        ("src/features/meds/index.js",      "ОНОВЛЕНО",
         "addPill(): doseNum + doseUnit → dose. pillUnit?.value || 'мг'."),
    ]))
    s += [sp(8), hr()]

    # ═══ Підсумок ══════════════════════════════════════════════════════════════
    s.append(section_box("✓", "Підсумок сесії"))
    s.append(sp(6))
    s.append(body(
        "Всі 10 пунктів виконано. Тести 513/513 (16 файлів). Збірка Vite без помилок. "
        "Основні покращення: Share Sheet Android тепер працює; PDF не розрізає заголовки секцій; "
        "пульс відображається на графіку PDF; логотип повернуто; "
        "кнопки відповідають дизайн-системі; дозування зберігається з одиницями."
    ))
    s.append(sp(6))
    s.append(note(
        "Gotcha: Capacitor Share.share() не приймає Blob у полі files[] — "
        "потрібен File або URI (рядок). Завжди використовувати platformDownload "
        "для запису файлу перед Share Sheet."
    ))
    s.append(sp(4))
    s.append(note(
        "Наступна сесія (задача): реалізувати mailto: для кнопки 'Поділитись' — "
        "відкриває поштовий клієнт з PDF у вкладенні (блок email/sms нагадувань)."
    ))

    return s

# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    part_str = f"_part{PART}" if PART else ""
    fname = f"HealthPro_session_{VERSION}_{DESCRIPTION}{part_str}.pdf"
    out   = os.path.join(os.path.dirname(__file__), fname)
    doc   = SimpleDocTemplate(
        out, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=1.8*cm, bottomMargin=1.8*cm,
    )
    doc.build(build_story())
    print(f"✓ PDF готовий: {out}")
