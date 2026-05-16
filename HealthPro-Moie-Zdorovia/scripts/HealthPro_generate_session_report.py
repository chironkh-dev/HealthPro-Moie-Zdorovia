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
VERSION     = "5.3.22"               # версія застосунку
DESCRIPTION = "IZ4_PDF123_WHO2"     # коротке уточнення теми сесії (без пробілів)
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
        stat_cell("4",   "Задачі виконано",    "ІЗ-4 · PDF-1/2/3 · WHO-2"),
        stat_cell("12",  "Файлів змінено",     "JS · HTML · i18n · тести"),
        stat_cell("2",   "Тест-файлів оновл.", "health-score · meas-window"),
        stat_cell("513", "Тестів проходить",   "16/16 файлів ✓"),
    ]), sp(14), hr()]

    # ═══ 1. ІЗ-4 — Pulse null → excluded from denominator ════════════════════
    s.append(section_box("ІЗ-4", "Пульс null → виключається зі знаменника ІЗ"))
    s.append(sp(6))
    s.append(body(
        "Проблема: scorePulse(null) повертала 0, і пульс потрапляв у знаменник як активний "
        "модуль навіть без даних. Результат: при null пульсі максимальний скор = 75 замість 100. "
        "Виправлено трьома змінами у health-score.js:"
    ))
    s.append(sp(4))
    s.append(arch_table([
        ("scorePulse(null) → return null",
         "Раніше: scorePulse(null) === 0 (вважалось 0/20 балів). "
         "Тепер: scorePulse(null) === null — сигнал про відсутність даних."),
        ("calcScoreForDay() — динамічний знаменник",
         "maxPossible = ps !== null ? 60 : 40. "
         "Якщо пульс відсутній — максимум 40 балів (лише систолічний + діастолічний). "
         "При наявному пульсі — максимум 60 балів (40 + 20)."),
        ("calcHealthScore() — фільтрація null модулів",
         "modules.filter(m => m.score !== null) — пульс без даних виключається "
         "з переліку активних модулів (як BMI та кроки). "
         "currentDetailedScores.pulse = pulseRaw ?? 0 для відображення у UI."),
    ]))
    s.append(sp(4))
    s.append(body(
        "Результат: вимірювання без пульсу тепер дають максимальний ІЗ = 100 (якщо BP ідеальний). "
        "Два тест-файли оновлено: score 75 → 100 для null/відсутнього пульсу."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/analytics/health-score.js", "ОНОВЛЕНО",
         "scorePulse(null)→null. calcScoreForDay() динамічний знаменник. "
         "calcHealthScore() null-фільтрація модулів."),
        ("tests/health-score.test.js",             "ОНОВЛЕНО",
         "Тест pulse=null: expect(score).toBe(100) замість toBe(75)."),
        ("tests/measurement-window.test.js",       "ОНОВЛЕНО",
         "Тест pulse=0 (відсутній): expect(score).toBe(100) замість toBe(75)."),
    ]))
    s += [sp(6), hr()]

    # ═══ 2. PDF-1 — 8-блочний шаблон лікарського PDF ════════════════════════
    s.append(section_box("PDF-1", "8-блочний шаблон лікарського PDF (повний перепис)"))
    s.append(sp(6))
    s.append(body(
        "Повністю переписано pdf-report.js. Новий шаблон використовує html2canvas + jsPDF "
        "для рендерингу кожного блоку. 8 секцій документу:"
    ))
    s.append(sp(4))
    s.append(arch_table([
        ("Блок 1: Заголовок",
         "Назва 'Медична картка пацієнта', лікарня, підрозділ, дата, обраний стандарт (ESC/AHA)."),
        ("Блок 2: Пацієнт + Екстрений контакт",
         "ПІБ, дата народження, вік, вага/зріст/ІМТ, особиста норма, "
         "медикаменти (короткий список), ім'я та телефон екстреного контакту."),
        ("Блок 3: Статистика (4 картки)",
         "Середній систолічний/діастолічний, середній пульс, середній ІЗ, "
         "максимальний та мінімальний тиск за обраний період."),
        ("Блок 4: SVG-графік тиску",
         "Лінійний графік з нормативними лініями 140 мм рт.ст. (систола) та 90 (діастола). "
         "Мітки дат на осі X, точки за кожен день."),
        ("Блок 5: Журнал вимірювань",
         "Таблиця з усіма вимірюваннями: дата, час, систола/діастола/пульс, "
         "категорія, ІЗ. Смугасті рядки (зебра)."),
        ("Блок 6: Ліки",
         "Таблиця призначених ліків: назва, доза, час, дні. Смугасті рядки."),
        ("Блок 7: Прийом ліків (Adherence)",
         "Кольоровий bar chart: відсоток прийнятих ліків по кожному препарату. "
         "Зелений ≥80%, жовтий 50-79%, червоний <50%."),
        ("Блок 8: Блок лікаря",
         "Поле для нотаток лікаря (порожній прямокутник 6×1.5 см), підпис і дата. "
         "Дисклеймер зі стандартом ВООЗ."),
    ]))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/export/pdf-report.js", "ПЕРЕПИСАНО",
         "generateDoctorReport(measurements, sections) — приймає масив вимірювань та "
         "об'єкт sections {chart, journal, meds, adherence, doctorBlock}. "
         "8 блоків, html2canvas + jsPDF, кирилиця через Arial/system fonts."),
    ]))
    s += [sp(6), hr()]

    # ═══ 3. PDF-2 — Секції звіту (чекбокси) ══════════════════════════════════
    s.append(section_box("PDF-2", "Секції звіту — чекбокси у модалці експорту"))
    s.append(sp(6))
    s.append(body(
        "Користувач може вибирати які блоки включати в PDF. "
        "Реалізовано через _reportSections у modal.js та 5 чекбоксів у HTML."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/export/modal.js", "ОНОВЛЕНО",
         "_reportSections = {chart:true, journal:true, meds:true, adherence:true, doctorBlock:true}. "
         "getReportSections() — повертає копію. toggleReportSection(key) — перемикає секцію."),
        ("index.html", "ОНОВЛЕНО",
         "5 чекбоксів у модалці звіту: графік, журнал, ліки, прийом ліків, блок лікаря. "
         "data-change='toggleReportSection' + data-section='chart|journal|meds|adherence|doctorBlock'. "
         "Кнопка 'PDF для лікаря' — нова основна кнопка (primary action)."),
        ("src/i18n/ui.uk.js", "ОНОВЛЕНО",
         "Нові i18n ключі: exp-section-chart, exp-section-journal, exp-section-meds, "
         "exp-section-adherence, exp-section-doctor, exp-btn-doctor-pdf."),
        ("src/i18n/ui.ru.js", "ОНОВЛЕНО",
         "Паралельні переклади на русскую для 6 нових ключів."),
    ]))
    s += [sp(6), hr()]

    # ═══ 4. PDF-3 — Wire params, platformDownload, period ════════════════════
    s.append(section_box("PDF-3", "Wire: measurements + sections → generateDoctorReport"))
    s.append(sp(6))
    s.append(body(
        "export/index.js тепер правильно збирає дані та секції і передає їх у PDF-генератор. "
        "Модаль закривається до початку генерації (уникнення UX-блокування)."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/export/index.js", "ОНОВЛЕНО",
         "generateDoctorReport(): викликає getExportMeasurements() + getReportSections(). "
         "closeExportModal() до генерації. Передає {measurements, sections} у _generateDoctorReport(). "
         "platformDownload(fileName, blob) залишений для Android Share sheet."),
    ]))
    s += [sp(6), hr()]

    # ═══ 5. WHO-2 — Модаль стандартів ESC vs AHA ══════════════════════════
    s.append(section_box("WHO-2", "Модаль стандартів ESC 2024 vs AHA 2017"))
    s.append(sp(6))
    s.append(body(
        "Нова модаль #bpStandardModal з детальним поясненням різниці між стандартами. "
        "Відкривається кнопкою '?' поруч ESC/AHA toggle у Налаштуваннях."
    ))
    s.append(sp(4))
    s.append(arch_table([
        ("Таблиця порогів",
         "ESC 2024 vs AHA 2017: Normal, Elevated/High Normal, HT Stage 1/2, Crisis — "
         "два стовпці для прямого порівняння порогів систоли та діастоли."),
        ("Домашні вимірювання",
         "Блок з роз'ясненням що домашні норми нижчі: 135/85 мм рт.ст. за ESC, "
         "130/80 за AHA. Пояснення 'ефекту білого халату'."),
        ("Чому різні пороги?",
         "ESC 2024: зберіг 140/90 через ризик 'ефекту білого халату' + відсутність "
         "даних European cohorts. AHA 2017: знизила до 130/80 через american data — "
         "де &lt;140/90 вже асоціюється з вищим кардіоваскулярним ризиком."),
        ("Рекомендації",
         "Використовувати стандарт відповідно до рекомендацій вашого лікаря. "
         "Посилання на ESC 2024 та AHA 2017 офіційні документи."),
    ]))
    s.append(sp(4))
    s.append(file_table([
        ("index.html", "ОНОВЛЕНО",
         "#bpStandardModal: таблиця порогів, домашні норми, пояснення різниці, посилання. "
         "Кнопка '?' поруч ESC/AHA toggle у #settingsTab."),
        ("src/app.js", "ОНОВЛЕНО",
         "ACTIONS: openBPStandardModal / closeBPStandardModal. "
         "import toggleReportSection з modal.js."),
        ("src/i18n/ui.uk.js", "ОНОВЛЕНО",
         "18 нових ключів: bp-std-modal-title, bp-std-esc-col, bp-std-aha-col, "
         "bp-std-why-title, bp-std-why-text, bp-std-home-title, bp-std-home-text, "
         "bp-std-rec-title, bp-std-rec-text, та ін."),
        ("src/i18n/ui.ru.js", "ОНОВЛЕНО",
         "18 паралельних ключів мовою Ru."),
    ]))
    s += [sp(6), hr()]

    # ═══ 6. Архітектурні рішення ════════════════════════════════════════════
    s.append(section_box("6", "Архітектурні рішення сесії"))
    s.append(sp(6))
    s.append(arch_table([
        ("null як відсутні дані (null-as-absent)",
         "scorePulse(null) → null (не 0). Дозволяє відрізнити 'пульс = 0 уд/хв' від "
         "'пульс не виміряно'. Паттерн: будь-який score-модуль може повернути null "
         "як сигнал про відсутність даних — і тоді він виключається зі знаменника."),
        ("Динамічний знаменник ІЗ",
         "maxPossible залежить від наявності даних: без пульсу = 40, з пульсом = 60. "
         "Формула: score% = (rawScore / maxPossible) * 100. "
         "Масштабує до 100% незалежно від того скільки модулів активні."),
        ("_reportSections у modal.js",
         "Стан секцій PDF зберігається в модулі modal.js — не у state.js. "
         "Це тимчасовий стан UI (session-only), не потребує персистентності. "
         "Доступ через getReportSections() / toggleReportSection(key)."),
        ("platformDownload залишений для Android",
         "На Android jsPDF.save() не відкриває Share sheet — потрібен platformDownload. "
         "На вебі — використовується стандартний blob URL download. "
         "Умова: if (Capacitor.isNativePlatform()) platformDownload(...) else blobUrl."),
    ]))
    s += [sp(8), hr()]

    # ═══ 7. Роадмап ══════════════════════════════════════════════════════════
    s.append(section_box("7", "Наступні кроки / Роадмап"))
    s.append(sp(6))
    s.append(proposal_table([
        ("PDF звіт",       "Верифікувати PDF на реальному Android — Share sheet та завантаження",    "Високий"),
        ("PDF звіт",       "Відобразити обраний стандарт (ESC/AHA) у заголовку PDF",                 "Середній"),
        ("Аналітика",      "Покрити null-pulse кейс unit-тестами для calcHealthScore() ізольовано",  "Середній"),
        ("WHO-2",          "Перевірити коректне відображення модалу на малих екранах (320px)",        "Середній"),
        ("i18n",           "WHO-2 ключі — додати до tips_ru.json (source_url ESC 2024)",             "Низький"),
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
