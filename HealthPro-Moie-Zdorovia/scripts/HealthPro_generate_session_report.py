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
VERSION     = "5.2.0"                   # версія застосунку
DESCRIPTION = "Biometric_PDF_DaysPicker" # коротке уточнення теми сесії (без пробілів)
PART        = 3                          # номер частини, якщо сесія розбита (1, 2, …) або None
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
C_COVER_BG   = colors.HexColor("#DBEAFE")  # світло-синій фон обкладинки
C_COVER_LINE = colors.HexColor("#1E40AF")  # акцентна лінія на обкладинці
C_TITLE_TEXT = colors.HexColor("#1E3A5F")  # заголовок обкладинки (темно-синій)
C_SUB_TEXT   = colors.HexColor("#1D4ED8")  # підзаголовок обкладинки
C_DATE_TEXT  = colors.HexColor("#64748B")  # дата на обкладинці

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
    """cells = [(value, label, sub), ...]  — до 4 плиток"""
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
    """rows = [(файл, статус, опис), ...]
    статус: 'НОВИЙ' | 'ОНОВЛЕНО' | 'ПЕРЕЗАПИС'
    """
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
    """rows = [(вкладка, пропозиція, пріоритет), ...]
    пріоритет: 'Високий' | 'Середній' | 'Низький'
    """
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
    """rows = [(рішення, деталі), ...]"""
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
# ЗМІСТ ЗВІТУ — заповнюй для кожної сесії
# ══════════════════════════════════════════════════════════════════════════════
def build_story():
    s = []

    s += [cover(), sp(12)]

    # Статистичні плитки — v5.2 Part 3
    s += [stats_row([
        stat_cell("7",  "Завдань реалізовано",   "Tasks 1–7 (Part 3)"),
        stat_cell("18", "Файлів оновлено",        "JS·HTML·CSS·i18n·py"),
        stat_cell("3",  "Нові файли",             "biometric·adherence·pdf-report"),
        stat_cell("0",  "Помилок компіляції",     "Vite build ✓ · dev ✓"),
    ]), sp(14), hr()]

    # ═══ 1. Task 1 — Tabletki.ua security ════════════════════════════════════
    s.append(section_box("1", "Task 1 — Tabletki.ua · Безпека посилань"))
    s.append(sp(6))
    s.append(body(
        "searchPharmacy() тепер відкриває виключно tabletki.ua — видалено мультисайт. "
        "У openDrugWarnModal(): іконка ⚠ (emoji) замінена на inline SVG; теги &lt;a href&gt; "
        "замінені на &lt;button data-action='searchTabletki'&gt; з атрибутом data-drug. "
        "URL ніколи не потрапляє в DOM — захист від XSS та Google Safe Browsing false-positives."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/meds/index.js", "ОНОВЛЕНО",
         "searchPharmacy() → тільки tabletki.ua; searchTabletki(drug) — новий helper; "
         "openDrugWarnModal() → SVG замість emoji, button замість &lt;a href&gt;"),
        ("src/app.js",                  "ОНОВЛЕНО", "ACTIONS: searchTabletki, selectPillDay"),
        ("src/i18n/ui.uk.js",           "ОНОВЛЕНО", "m-search-source — підпис 'Пошук: Tabletki.ua'"),
        ("src/i18n/ui.ru.js",           "ОНОВЛЕНО", "m-search-source (ru)"),
        ("styles/features.css",         "ОНОВЛЕНО", ".pill-link-btn — стиль кнопки-посилання"),
    ]))
    s += [sp(8), hr()]

    # ═══ 2. Task 2 — Biometric Auth ═══════════════════════════════════════════
    s.append(section_box("2", "Task 2 — Biometric / PIN Lock Screen"))
    s.append(sp(6))
    s.append(body(
        "Модуль src/core/biometric.js реалізує Capacitor BiometricAuth wrapper. "
        "checkBiometric() та authenticate() — безпечні на вебі (завжди false). "
        "На Android APK з плагіном @aparajita/capacitor-biometric-auth активується "
        "fingerprint/PIN. Lock-screen overlay (#lockScreen) відображається при запуску якщо "
        "biometricLock=true у settings. Toggle у вкладці 'Налаштування' → секція 'Безпека'."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/core/biometric.js",  "НОВИЙ",
         "checkBiometric(), authenticate() — web-safe dynamic import Capacitor plugin"),
        ("index.html",             "ОНОВЛЕНО",
         "#lockScreen overlay + .lock-screen div; settings card 'Безпека' з toggle #biometricToggle"),
        ("src/app.js",             "ОНОВЛЕНО",
         "import checkBiometric/authenticate; init: lockCheck при старті; "
         "ACTIONS: toggleBiometric, unlockApp"),
        ("styles/base.css",        "ОНОВЛЕНО",
         "#lockScreen, .lock-screen стилі"),
        ("src/i18n/ui.uk.js",      "ОНОВЛЕНО", "s-biometric, t-lock-title/sub/btn"),
    ]))
    s += [sp(8), hr()]

    # ═══ 3. Task 3 — Adherence Chart Modal ════════════════════════════════════
    s.append(section_box("3", "Task 3 — Adherence Chart (Графік прийому ліків)"))
    s.append(sp(6))
    s.append(body(
        "Новий файл src/features/analytics/adherence.js. Обчислює добову adherence "
        "з state.pillsTaken (без async). Рендерить ECharts LineChart з ВООЗ 80% markLine. "
        "Кольор лінії: зелений ≥80%, червоний <80%. Карта 'Прийом ліків' у bento тепер "
        "tap-тригер → bottom-sheet модалка #adherenceModal."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/analytics/adherence.js", "НОВИЙ",
         "renderAdherenceChart(containerId), disposeAdherenceChart(containerId)"),
        ("src/features/analytics/index.js",     "ОНОВЛЕНО",
         "re-export renderAdherenceChart, disposeAdherenceChart"),
        ("index.html",                           "ОНОВЛЕНО",
         "bento-card bc-amber: data-action='openAdherenceModal', tap-hint; #adherenceModal bottom-sheet"),
        ("src/app.js",                           "ОНОВЛЕНО",
         "ACTIONS: openAdherenceModal (render+show), closeAdherenceModal (dispose+hide)"),
        ("src/i18n/ui.uk.js",                    "ОНОВЛЕНО", "t-adherence-title, t-adherence-empty, t-btn-adherence"),
    ]))
    s += [sp(8), hr()]

    # ═══ 4. Task 4 — Notes ════════════════════════════════════════════════════
    s.append(section_box("4", "Task 4 — Нотатки до вимірів (вже реалізовано в v5.1)"))
    s.append(sp(6))
    s.append(body(
        "Поле #note є у формі вимірювань. saveMeasurement() зчитує його. "
        "journal.js відображає нотатки з SVG-іконкою (.history-note). "
        "Завдання повністю реалізоване в попередніх сесіях — перевірено та підтверджено."
    ))
    s += [sp(8), hr()]

    # ═══ 5. Task 5 — PDF Doctor Report ════════════════════════════════════════
    s.append(section_box("5", "Task 5 — PDF-звіт для лікаря (html2canvas + jsPDF)"))
    s.append(sp(6))
    s.append(body(
        "Новий файл src/features/export/pdf-report.js. Варіант А: html2canvas → jsPDF. "
        "Повністю офлайн, кирилиця через рендер браузера. Звіт включає: "
        "інфо пацієнта, статистика тиску (середній, макс, мін), SVG-графік 30 днів "
        "побудований inline, таблиця останніх 30 вимірів, ліки, графік adherence. "
        "Дисклеймер. Кнопка 'Друк' у журналі та 'PDF' у налаштуваннях → generateDoctorReport()."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/export/pdf-report.js", "НОВИЙ",
         "generateDoctorReport(): buildReportHTML + html2canvas + jsPDF; buildBPChartSVG(); "
         "buildAdherenceSVG(); computeDailyAdherence()"),
        ("src/features/export/index.js",       "ОНОВЛЕНО",
         "import + export generateDoctorReport"),
        ("src/app.js",                          "ОНОВЛЕНО", "ACTIONS: generateDoctorReport"),
        ("index.html",                           "ОНОВЛЕНО",
         "Журнал 'Друк' → generateDoctorReport; Налаштування 'PDF' → generateDoctorReport"),
        ("assets/fonts/DejaVuSans.ttf",          "СКОПІЙОВАНО", "De Ja Vu Sans для pdf-report (html2canvas рендерить шрифт браузера)"),
        ("package.json",                          "ОНОВЛЕНО", "svg2pdf.js встановлено (для майбутніх SVG-exports)"),
    ]))
    s += [sp(8), hr()]

    # ═══ 6. Task 6 — Days-Picker ══════════════════════════════════════════════
    s.append(section_box("6", "Task 6 — Days-Picker (кнопки замість select)"))
    s.append(sp(6))
    s.append(body(
        "select#pillDays замінено на .days-picker — горизонтальний ряд кнопок-chips. "
        "Варіанти: Щодня / Пн/Ср/Пт / Вт/Чт/Сб/Нд / Будні / Дата. "
        "selectPillDay(el) — нова функція в meds/index.js: toggle .active, "
        "викликає onPillDaysChange(days). addPill() читає активну кнопку через "
        "querySelector('#pillDays .days-btn.active')?.dataset.days. "
        "Reset після додавання: querySelector('#pillDays .days-btn[data-days=daily]').active."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("index.html",                  "ОНОВЛЕНО",
         "&lt;div class='days-picker'&gt; з 5 кнопками .days-btn data-action='selectPillDay'"),
        ("src/features/meds/index.js",  "ОНОВЛЕНО",
         "onPillDaysChange(days?): backward-compat; selectPillDay(el); addPill: querySelector; reset"),
        ("styles/features.css",         "ОНОВЛЕНО", ".days-picker, .days-btn, .days-btn.active"),
        ("src/i18n/ui.uk.js",           "ОНОВЛЕНО", "m-day-mon-wed-fri, m-day-tue-thu-sat-sun"),
    ]))
    s += [sp(8), hr()]

    # ═══ 7. Task 7 — gen-version.js ═══════════════════════════════════════════
    s.append(section_box("7", "Task 7 — gen-version.js · Новий формат версії"))
    s.append(sp(6))
    s.append(body(
        "scripts/gen-version.js оновлено: PATCH тепер padStart(3, '0') → '000'...'999'. "
        "Додано окремий export APP_DATE (DD.MM.YYYY) та APP_VERSION (5.2.000). "
        "APP_BUILD_FULL: 'v5.2.000 / 08.05.2026'. "
        "src/core/constants.js: re-export APP_VERSION, APP_DATE (видалено const APP_VERSION = '5.0'). "
        "npm run version → version.gen.js успішно оновлено: v5.2.000 / 08.05.2026."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("scripts/gen-version.js",      "ОНОВЛЕНО",
         "PATCH padStart(3,'0'); APP_DATE DD.MM.YYYY; APP_BUILD_FULL 'v5.2.000 / DD.MM.YYYY'"),
        ("src/core/constants.js",       "ОНОВЛЕНО",
         "re-export APP_VERSION, APP_DATE; видалено const APP_VERSION='5.0'"),
        ("src/core/version.gen.js",     "РЕГЕНЕРОВАНО",
         "npm run version → v5.2.000 / 08.05.2026 (3f2242b)"),
    ]))
    s += [sp(8), hr()]

    # ═══ 8. Архітектурні рішення ══════════════════════════════════════════════
    s.append(section_box("8", "Архітектурні рішення сесії"))
    s.append(sp(6))
    s.append(arch_table([
        ("No &lt;a href&gt; в модалках",
         "Всі зовнішні посилання — через <button data-action='searchTabletki'> та JS window.open(). "
         "URL не в DOM → захист від XSS та Safe Browsing false positive."),
        ("Biometric: web-safe dynamic import",
         "loadPlugin() динамічно завантажує Capacitor плагін. На вебі — завжди false. "
         "Vite не падає, бо пакет @aparajita/capacitor-biometric-auth встановлено."),
        ("Adherence: обчислення з state (без async)",
         "computeDailyAdherence() ітерує state.pillsTaken синхронно. "
         "Немає залежності від SQLite API → працює на вебі і native однаково."),
        ("PDF: html2canvas Variant A",
         "html2canvas рендерить скрите &lt;div&gt; з повним звітом → canvas → jsPDF images. "
         "Кирилиця через рендер браузера — не потрібен DejaVu у jsPDF."),
        ("Days-picker: state у DOM",
         ".days-btn.active — єдине джерело правди. Немає змінних у модулі. "
         "Reset: querySelectorAll + classList.toggle за data-days."),
    ]))
    s += [sp(8), hr()]

    # ═══ 9. Роадмап ═══════════════════════════════════════════════════════════
    s.append(section_box("9", "Наступні кроки / Роадмап"))
    s.append(sp(6))
    s.append(proposal_table([
        ("Ліки",    "Days-picker: weekdays/custom підтримка у isPillDueToday()",   "Високий"),
        ("PDF",     "Варіант Б: ECharts SVG → svg2pdf.js → jsPDF (вища якість)",   "Середній"),
        ("Безпека", "AppState listener Capacitor: блокувати при згортанні в фон",  "Середній"),
        ("Профіль", "Вкладки «Вага» та «Сон»",                                     "Середній"),
        ("Аналіз",  "Adherence weekly/monthly trend drill-down",                   "Низький"),
        ("i18n",    "Стрінги days-picker у i18n (Будні ← id='t-day-weekdays')",    "Низький"),
    ]))
    s += [sp(8), hr()]

    # Підпис
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
