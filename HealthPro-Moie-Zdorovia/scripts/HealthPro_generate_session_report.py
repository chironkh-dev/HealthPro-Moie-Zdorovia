#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HealthPro — Моє Здоров'я
Шаблон звіту сесії розробки.
Використання: налаштуй VERSION / DESCRIPTION / PART нижче, заповни build_story().
Запуск: python3 scripts/HealthPro_generate_session_report.py
"""

# ══════════════════════════════════════════════════════════════════════════════
# НАЛАШТУВАННЯ ЗВІТУ — редагуй перед кожною сесією
# ══════════════════════════════════════════════════════════════════════════════
VERSION     = "5.3.24"               # версія застосунку
DESCRIPTION = "DATE1_PDFi18n_WHOfix_ReportModal"  # коротке уточнення теми сесії (без пробілів)
PART        = None                   # номер частини, якщо сесія розбита (1, 2, …) або None
# ══════════════════════════════════════════════════════════════════════════════

import datetime, os
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

# ── Шрифти DejaVu Sans (кирилиця) ────────────────────────────────────────────
DEJAVU = "/usr/share/fonts/truetype/dejavu"
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
  "H3":     S("H3",     fontName="Arial-Bold",  fontSize=10, textColor=C_ORANGE,
                        spaceBefore=6, spaceAfter=3, leading=13),
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
  "Footer": S("Footer", fontName="Arial-Italic", fontSize=7.5, textColor=colors.HexColor("#94A3B8"),
                        alignment=TA_CENTER),
}

# ── Хелпери ───────────────────────────────────────────────────────────────────
def sp(h=6):  return Spacer(1, h)
def hr():     return HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6, spaceBefore=4)
def body(t):  return Paragraph(t, ST["Body"])
def h1(t):    return Paragraph(f"<b>{t}</b>", ST["H1"])
def h2(t):    return Paragraph(f"<b>{t}</b>", ST["H2"])
def h3(t):    return Paragraph(f"<b>{t}</b>", ST["H3"])
def bullet(t, sub=False): return Paragraph(f"• {t}", ST["Sub2" if sub else "Bullet"])
def code(t):  return Paragraph(t, ST["Code"])
def note(t):  return Paragraph(f"<i>{t}</i>", ST["Note"])

# ── Назва версії для відображення ─────────────────────────────────────────────
def _session_label():
    part_str = f" · Part {PART}" if PART else ""
    return f"Звіт сесії v{VERSION} · {DESCRIPTION.replace('_', ' ')}{part_str}"

# ── Обкладинка (світло-синя) ──────────────────────────────────────────────────
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

# ── Статистичні плитки ────────────────────────────────────────────────────────
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

# ── Секційний блок з номером ──────────────────────────────────────────────────
def section_box(num, title):
    n = Paragraph(f"<b>{num}</b>", ParagraphStyle("N", fontName="Arial-Bold",
                  fontSize=16, textColor=colors.white, alignment=TA_CENTER))
    t = Paragraph(f"<b>{title}</b>", ParagraphStyle("T", fontName="Arial-Bold",
                  fontSize=12, textColor=C_NAVY, leading=15))
    return Table([[n, t]], colWidths=[1*cm, 14.5*cm],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(0,0), C_NAVY),
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(0,0), 6),
            ("RIGHTPADDING",  (0,0),(0,0), 6),
            ("LEFTPADDING",   (1,0),(1,0), 10),
            ("LINEBELOW",     (0,0),(-1,-1), 1.5, C_NAVY),
        ]))

# ── Таблиця змінених файлів ───────────────────────────────────────────────────
def file_table(rows):
    SC = {"НОВИЙ":    colors.HexColor("#065F46"),
          "ОНОВЛЕНО": colors.HexColor("#1D4ED8"),
          "ПЕРЕЗАПИС":colors.HexColor("#92400E")}
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

# ── Таблиця пропозицій / роадмапу ─────────────────────────────────────────────
def proposal_table(rows):
    head = [Paragraph("Вкладка / Функція", ST["TH"]),
            Paragraph("Пропозиція", ST["TH"]),
            Paragraph("Пріоритет", ST["TH"])]
    data = [head]
    PC = {"Високий": colors.HexColor("#B91C1C"),
          "Середній": colors.HexColor("#B45309"),
          "Низький":  colors.HexColor("#065F46")}
    for tab, prop, pri in rows:
        clr = PC.get(pri, C_BLUE)
        pc  = Paragraph(pri, ParagraphStyle("P", fontName="Arial-Bold", fontSize=7.5,
                        textColor=colors.white, alignment=TA_CENTER))
        pb  = Table([[pc]], colWidths=[1.8*cm],
                    style=TableStyle([("BACKGROUND",(0,0),(-1,-1),clr),
                                      ("TOPPADDING",(0,0),(-1,-1),2),
                                      ("BOTTOMPADDING",(0,0),(-1,-1),2)]))
        data.append([Paragraph(tab, ST["TC"]), Paragraph(prop, ST["TC"]), pb])
    return Table(data, colWidths=[3.5*cm, 10*cm, 2*cm],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,0), C_HEADER),
            ("ROWBACKGROUNDS",(0,1),(-1,-1), [C_ROW_A, C_ROW_B]),
            ("GRID",          (0,0),(-1,-1), 0.4, C_BORDER),
            ("VALIGN",        (0,0),(-1,-1), "TOP"),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ]))

# ── Таблиця архітектурних рішень ──────────────────────────────────────────────
def arch_table(rows):
    head = [Paragraph("Рішення", ST["TH"]), Paragraph("Деталі", ST["TH"])]
    data = [head]
    for decision, detail in rows:
        data.append([Paragraph(f"<b>{decision}</b>", ST["TC"]), Paragraph(detail, ST["TC"])])
    return Table(data, colWidths=[5*cm, 10.5*cm],
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
# ЗМІСТ ЗВІТУ
# ══════════════════════════════════════════════════════════════════════════════
def build_story():
    s = []

    s += [cover(), sp(12)]

    # Статистичні плитки
    s += [stats_row([
        stat_cell("4",   "Блоки виконано",     "DATE-1 · PDF-i18n · WHO-fix · Report-Modal"),
        stat_cell("10",  "Файлів змінено",     "JS · HTML · i18n · py-звіт"),
        stat_cell("36",  "Нових i18n ключів",  "pdf.js uk+ru (по 18)"),
        stat_cell("513", "Тестів проходить",   "16/16 файлів ✓"),
    ]), sp(14), hr()]

    # ═══ 1. DATE-1 — Уніфікація форматів дат ════════════════════════════════
    s.append(section_box("DATE-1", "Уніфікація форматів дат по всьому додатку"))
    s.append(sp(6))
    s.append(body(
        "Проблема: дати відображались у різних форматах (YYYY-MM-DD, DD.MM, DD/MM/YYYY) "
        "залежно від модуля. Рішення: централізовані helper-функції у core/utils.js "
        "та уніфікація у 9 файлах. Внутрішні ключі БД залишаються у форматі YYYY-MM-DD."
    ))
    s.append(sp(4))
    s.append(arch_table([
        ("formatDate(dateStr) → ДД.ММ.РРРР",
         "Основний формат для відображення. Вхід: ISO-рядок або Date. "
         "Вихід: '20.05.2026'. Використовується у заголовках, журналі, PDF."),
        ("formatDateShort(dateStr) → ДД.ММ",
         "Короткий формат для компактних місць (осі графіків, tooltip, "
         "рядки таблиць). Вихід: '20.05'."),
        ("formatTime(dateStr) → ГГ:ХХ",
         "24-годинний формат часу. Вихід: '14:35'. "
         "Замінює toLocaleTimeString() з непередбачуваним locale."),
    ]))
    s.append(sp(4))
    s.append(file_table([
        ("src/core/utils.js",                    "ОНОВЛЕНО",
         "Нові exports: formatDate, formatDateShort, formatTime."),
        ("src/app.js",                           "ОНОВЛЕНО",
         "Заголовок дати у хедері — через formatDate()."),
        ("src/features/export/csv.js",           "ОНОВЛЕНО",
         "Дата/час у CSV-рядках — formatDate + formatTime."),
        ("src/features/export/pdf.js",           "ОНОВЛЕНО",
         "Дата генерації PDF — formatDate()."),
        ("src/features/export/print.js",         "ОНОВЛЕНО",
         "Заголовок друку — formatDate()."),
        ("src/features/export/pdf-report.js",    "ОНОВЛЕНО",
         "formedAt, period, colDateShort, colTimeShort — через format*."),
        ("src/features/export/backup.js",        "ОНОВЛЕНО",
         "Дата бекапу у назві файлу та вмісті — formatDate()."),
        ("src/features/settings/disclaimer.js",  "ОНОВЛЕНО",
         "Дата дисклеймера — formatDate()."),
        ("src/features/steps/index.js",          "ОНОВЛЕНО",
         "Графік кроків: мітки осі X → formatDateShort, tooltip → formatDate."),
    ]))
    s += [sp(6), hr()]

    # ═══ 2. PDF-4 (i18n) — PDF звіт повністю локалізовано ═══════════════════
    s.append(section_box("PDF-4", "PDF звіт повністю локалізовано (uk/ru)"))
    s.append(sp(6))
    s.append(body(
        "Проблема: pdf-report.js містив 35+ хардкодованих українських рядків — "
        "звіт завжди генерувався українською незалежно від мови інтерфейсу. "
        "Рішення: новий файл i18n/pdf.js + PDF_L = PDF_LABELS[state.lang]."
    ))
    s.append(sp(4))
    s.append(arch_table([
        ("PDF-3: genderMap виправлено",
         "Стара логіка: genderMap = { male: '...', female: '...' } та key = profile.gender. "
         "Виправлено: key = profile.gender === 'm' ? PDF_L.male : PDF_L.female. "
         "Стать тепер відображається коректно в обох мовах."),
        ("i18n/pdf.js — 36 нових ключів",
         "По 18 ключів для uk та ru. Охоплюють весь вміст PDF: "
         "заголовок, блоки, таблиця колонок, категорії ІМТ, одиниці виміру, дисклеймер."),
        ("const PDF_L = PDF_LABELS[state.lang]",
         "pdf-report.js читає мову з state.lang при кожному виклику генерації. "
         "Перемикання uk↔ru одразу відображається у наступному згенерованому PDF."),
    ]))
    s.append(sp(4))
    s.append(file_table([
        ("src/i18n/pdf.js",                   "НОВИЙ",
         "PDF_LABELS = { uk: {...}, ru: {...} }. 36 ключів: reportTitle, stdLabel, "
         "formedAt, period, patientData, heightWeight, personalNorm, mmHgUnit, "
         "emergContact, alertBP, noEmergency, avgBP, avgPulse, bpmUnit, hiScale, "
         "maxMinSys, measUnit, bpChart, journalTitle, colDateShort, colTimeShort, "
         "colBPShort, colCat, colNoteShort, medsTitle, noActiveMeds, adherTitle, "
         "doctorBlock, doctorNotes, doctorSign, signDateLine, disclaimer, "
         "bmiUnder/Normal/Over/Obese."),
        ("src/features/export/pdf-report.js", "ОНОВЛЕНО",
         "import PDF_LABELS; const PDF_L = PDF_LABELS[state.lang]. "
         "37 місць замінено з хардкоду на PDF_L.*. genderMap виправлено."),
    ]))
    s += [sp(6), hr()]

    # ═══ 3. WHO-fix — Два виправлення медичних норм ══════════════════════════
    s.append(section_box("WHO-fix", "Два виправлення медичних норм у i18n"))
    s.append(sp(6))
    s.append(arch_table([
        ("WHO-fix-1: 115/75 → ≥135/85",
         "Ключ t-bp-std-home-text у uk.js та ru.js містив некоректний поріг <115/75. "
         "Правильне значення за ESC 2024 для домашніх вимірів — ≥135/85 мм рт. ст. "
         "Виправлено в обох мовах."),
        ("WHO-fix-2: Elevated → Підвищений/Повышенный",
         "who.i18n.js: рядок 64 (uk) та 153 (ru) — заголовок категорії "
         "'Elevated — AHA 2017' залишався англійською. "
         "UA: 'Підвищений (Elevated) — AHA 2017'. RU: 'Повышенный (Elevated) — AHA 2017'. "
         "Тіло статті також оновлено відповідними перекладами."),
    ]))
    s.append(sp(4))
    s.append(file_table([
        ("src/i18n/ui.uk.js",      "ОНОВЛЕНО", "t-bp-std-home-text: <115/75 → ≥135/85 мм рт.ст."),
        ("src/i18n/ui.ru.js",      "ОНОВЛЕНО", "t-bp-std-home-text: аналогічне виправлення RU."),
        ("src/i18n/who.i18n.js",   "ОНОВЛЕНО",
         "Рядки 64+153: заголовок 'Elevated' перекладено UK+RU. Тіло статті оновлено."),
    ]))
    s += [sp(6), hr()]

    # ═══ 4. Report-Modal (Блок 3) ════════════════════════════════════════════
    s.append(section_box("Report-Modal", "Модаль звіту: формат PDF/CSV + кнопка 90 днів"))
    s.append(sp(6))
    s.append(body(
        "Модаль експорту розширено: обраний формат (PDF або CSV) визначає що саме "
        "генерується. Кнопка 90 днів додана поруч з 30/7 днями. "
        "Standalone-кнопки у журналі та налаштуваннях тепер відкривають модаль (не генерують прямо)."
    ))
    s.append(sp(4))
    s.append(arch_table([
        ("_expFormat + getExportFormat() + selectExportFormat()",
         "modal.js: _expFormat = 'pdf' за замовчуванням. "
         "selectExportFormat(fmt) перемикає active-клас на .exp-format-btn "
         "та показує/ховає #expSectionsBlock (секції PDF видимі лише при PDF форматі)."),
        ("generateDoctorReport() — format-aware",
         "export/index.js: if (getExportFormat() === 'csv') _exportReportCSV(...) "
         "else _generateDoctorReport(...). Один ентрі-поінт для обох форматів."),
        ("openExportModal замість прямої генерації",
         "Кнопки у журналі (#t-journal-print) та налаштуваннях (#t-settings-doc-btn) "
         "тепер викликають openExportModal — користувач обирає формат/секції до генерації."),
        ("Кнопка 90 днів (quarter)",
         "index.html: кнопка expP-quarter. modal.js: selectExportPeriod підтримує 'quarter' = 90 днів."),
    ]))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/export/modal.js",  "ОНОВЛЕНО",
         "_expFormat, getExportFormat(), selectExportFormat(fmt). "
         "selectExportPeriod: підтримка 'quarter'. Reset _expFormat='pdf' у openExportModal."),
        ("src/features/export/index.js",  "ОНОВЛЕНО",
         "generateDoctorReport(): format-aware dispatch до CSV або PDF генератора."),
        ("src/app.js",                    "ОНОВЛЕНО",
         "import selectExportFormat; ACTIONS['selectExportFormat'] = selectExportFormat."),
        ("index.html",                    "ОНОВЛЕНО",
         "Кнопка expP-quarter (90 днів). Format selector (PDF/CSV). "
         "#expSectionsBlock обгортка. Кнопки журналу/налаштувань → openExportModal. "
         "Закрито </div> для expSectionsBlock."),
        ("src/i18n/ui.uk.js",             "ОНОВЛЕНО",
         "t-exp-btn-quarter, t-exp-format-lbl, t-exp-format-pdf, t-exp-format-csv."),
        ("src/i18n/ui.ru.js",             "ОНОВЛЕНО",
         "Паралельні 4 ключі RU."),
    ]))
    s += [sp(6), hr()]

    # ═══ 5. Block 4 — Android Share (вже реалізовано) ════════════════════════
    s.append(section_box("Block 4", "Android Share — підтверджено реалізацію"))
    s.append(sp(6))
    s.append(body(
        "Аудит platform.js підтвердив: _blobToBase64(), Filesystem.writeFile(), "
        "Share.share() вже реалізовані та правильно підключені. "
        "Жодних змін не потребувалось — блок завершено підтвердженням."
    ))
    s += [sp(6), hr()]

    # ═══ 6. Архітектурні рішення ════════════════════════════════════════════
    s.append(section_box("6", "Архітектурні рішення сесії"))
    s.append(sp(6))
    s.append(arch_table([
        ("Централізовані date-helpers у utils.js",
         "Єдине місце визначення форматів дат. Заміна toLocaleDateString з locale 'uk-UA' "
         "на детерміністичні formatDate/formatDateShort/formatTime — "
         "однаковий вивід на будь-якій локалі пристрою."),
        ("PDF_LABELS — окремий i18n модуль для PDF",
         "PDF-рядки відокремлено від ui.*.js (там сотні ключів UI). "
         "pdf.js є компактним (36 ключів) та легко розширюється для нових мов."),
        ("#expSectionsBlock show/hide",
         "Секції звіту (чекбокси) показуються лише при PDF форматі. "
         "При CSV — блок прихований через display:none. "
         "UX: при перемиканні формату UI одразу адаптується без перезавантаження модалі."),
        ("openExportModal як єдиний ентрі-поінт для звіту",
         "Раніше кнопки у 3 місцях викликали generateDoctorReport() прямо. "
         "Тепер — всі через openExportModal(). "
         "Дозволяє користувачу обрати формат/секції перед генерацією."),
    ]))
    s += [sp(8), hr()]

    # ═══ 7. Роадмап ══════════════════════════════════════════════════════════
    s.append(section_box("7", "Наступні кроки / Роадмап"))
    s.append(sp(6))
    s.append(proposal_table([
        ("PDF звіт",    "Верифікувати PDF+CSV на реальному Android — Share sheet та завантаження",   "Високий"),
        ("PDF звіт",    "Додати preview PDF у модалці (iframe або canvas) перед завантаженням",       "Середній"),
        ("Аналітика",   "Графік розподілу категорій BP за місяць (pie/donut) у аналітиці",           "Середній"),
        ("i18n",        "Перевірити всі нові PDF_L ключі з RU мовою на реальному пристрої",          "Середній"),
        ("UX",          "Показувати тост-підтвердження після успішного генерування PDF/CSV",          "Низький"),
    ]))
    s += [sp(8), hr()]

    s.append(Paragraph(
        f"Звіт згенеровано автоматично · HealthPro v{VERSION} · "
        f"{datetime.datetime.now().strftime('%d.%m.%Y %H:%M')}",
        ST["Footer"]
    ))
    return s

# ── Генерація PDF ──────────────────────────────────────────────────────────────
def _out_path():
    part_str = f"_Part{PART}" if PART else ""
    filename = f"HealthPro_Session_v{VERSION}_{DESCRIPTION}{part_str}_Report.pdf"
    report_dir = os.path.join(os.path.dirname(__file__), "..", "report")
    os.makedirs(report_dir, exist_ok=True)
    return os.path.abspath(os.path.join(report_dir, filename))

OUT = _out_path()

doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=1.8*cm, bottomMargin=1.8*cm,
    title=f"HealthPro · Звіт сесії v{VERSION}",
    author="HealthPro Agent",
)
doc.build(build_story())
print(f"✓ PDF збережено: {OUT}")
