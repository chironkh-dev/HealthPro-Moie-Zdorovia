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
VERSION     = "5.3.20"               # версія застосунку
DESCRIPTION = "CodeAudit_Bugfix"    # коротке уточнення теми сесії (без пробілів)
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
        stat_cell("15", "Багів виправлено",   "аудит HealthPro_CodeAudit_13_05_2026"),
        stat_cell("18", "Файлів змінено",     "JS · HTML · i18n · JSON · тести"),
        stat_cell("3",  "Тест-файлів оновл.", "veto-boundary · health-score · meas-window"),
        stat_cell("513","Тестів проходить",   "16/16 файлів ✓"),
    ]), sp(14), hr()]

    # ═══ 1. ІЗ-1 — AHA2017 у getBPThresholds ════════════════════════════════
    s.append(section_box("ІЗ-1", "AHA2017 підтримка у getBPThresholds()"))
    s.append(sp(6))
    s.append(body(
        "Функція getBPThresholds() у health-score.js не враховувала стандарт AHA2017. "
        "Виправлено: додано гілку if (std === 'aha2017') з відповідними порогами. "
        "Тепер розрахунок балів BP відповідає обраному стандарту (ESC2024 / AHA2017)."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/analytics/health-score.js", "ОНОВЛЕНО",
         "getBPThresholds(): гілка aha2017 з порогами Normal/Elevated/HT1/HT2/Crisis."),
    ]))
    s += [sp(6), hr()]

    # ═══ 2. ІЗ-2 — calcScoreForDay ══════════════════════════════════════════
    s.append(section_box("ІЗ-2", "calcScoreForDay() — виокремлено та re-use у iz-chart.js"))
    s.append(sp(6))
    s.append(body(
        "Логіку розрахунку денного скору дублювали health-score.js та iz-chart.js. "
        "Виправлено: calcScoreForDay(sys, dia, pulse) виокремлено у health-score.js як "
        "exported функцію. iz-chart.js більше не має власних scoreBPDay/scorePulseDay/"
        "calcDailyScore — імпортує calcScoreForDay. Єдине джерело правди для денного скору."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/analytics/health-score.js", "ОНОВЛЕНО",
         "Новий export: calcScoreForDay(sys, dia, pulse) — об'єднана логіка денного скору."),
        ("src/features/analytics/iz-chart.js",     "ОНОВЛЕНО",
         "Видалено scoreBPDay/scorePulseDay/calcDailyScore. import calcScoreForDay."),
    ]))
    s += [sp(6), hr()]

    # ═══ 3. ІЗ-3 — VETO Hard Caps ══════════════════════════════════════════
    s.append(section_box("ІЗ-3", "VETO Hard Caps замість множників"))
    s.append(sp(6))
    s.append(body(
        "Стара реалізація: VETO множила score на коефіцієнт (×0.30/0.60/0.55). "
        "Проблема: при низьких pre-veto значеннях результат міг бути надто м'яким. "
        "Нова реалізація: Hard Caps — Math.min(score, CAP) де CAP = 10/25/30."
    ))
    s.append(sp(4))
    s.append(arch_table([
        ("crisis ≥180/120 → max=10",
         "Гіпертонічний криз: скор не може перевищити 10 балів. "
         "Раніше: round(score × 0.30). Зараз: min(score, 10)."),
        ("hypertension-2 ≥160/100 → max=25",
         "Гіпертензія 2 ст.: скор не може перевищити 25 балів. "
         "Раніше: round(score × 0.60). Зараз: min(score, 25)."),
        ("hypotension <85/55 → max=30",
         "Гіпотонія: скор не може перевищити 30 балів. "
         "Раніше: round(score × 0.55). Зараз: min(score, 30)."),
    ]))
    s.append(sp(4))
    s.append(body(
        "Тест-файли оновлено під нові очікувані значення: "
        "veto-boundary.test.js (17 тестів), health-score.test.js (3 тести), "
        "measurement-window.test.js (5 тестів). Всі 513/513 ✅."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/analytics/health-score.js", "ОНОВЛЕНО",
         "applyVeto(): Math.min(score, 10/25/30) замість ×0.30/0.60/0.55."),
        ("tests/veto-boundary.test.js",            "ОНОВЛЕНО",
         "Всі expect() переписано під Hard Cap значення. Описи тестів оновлено."),
        ("tests/health-score.test.js",             "ОНОВЛЕНО",
         "3 тести VETO: expect(score).toBe(10/25/30) замість 11/26/28."),
        ("tests/measurement-window.test.js",       "ОНОВЛЕНО",
         "5 тестів: expect() та коментарі оновлено під Hard Caps."),
    ]))
    s += [sp(6), hr()]

    # ═══ 4. NET-1, PDF-1, E-9, B-9, B-9b ═══════════════════════════════════
    s.append(section_box("4", "Мережа, PDF, Журнал, Норми — виправлення"))
    s.append(sp(6))
    s.append(h2("NET-1 — useCORS:false у network.js"))
    s.append(body(
        "getNetworkStatus() викликав Capacitor Network.getStatus() з {useCORS: true} — "
        "зайвий параметр, що міг конфліктувати з деякими конфігураціями. Виправлено: useCORS: false."
    ))
    s.append(sp(4))
    s.append(h2("PDF-1 — порядок аргументів у platformDownload"))
    s.append(body(
        "pdf-report.js передавав аргументи platformDownload у неправильному порядку: "
        "(blob, fileName) замість (fileName, blob). Виправлено відповідно до сигнатури platform.js."
    ))
    s.append(sp(4))
    s.append(h2("E-9 — фільтр у журналі вимірювань"))
    s.append(body(
        "Фільтр журналу не відображав дані при першому відкритті. "
        "Виправлено: ініціалізацію фільтру додано до initJournal()."
    ))
    s.append(sp(4))
    s.append(h2("B-9 / B-9b — getBPStatus та фільтрація по даті"))
    s.append(body(
        "B-9: Hardcoded поріг 140 замінено викликом getBPStatus(sys, dia) з norm.js. "
        "B-9b: фільтрація даних замінена з .slice() на фільтр по даті."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/core/platform.js",                   "ОНОВЛЕНО", "NET-1: useCORS: false."),
        ("src/features/export/pdf-report.js",      "ОНОВЛЕНО", "PDF-1: (fileName, blob) правильний порядок аргументів."),
        ("src/features/journal/index.js",          "ОНОВЛЕНО", "E-9: ініціалізація фільтру у initJournal()."),
        ("src/features/analytics/bp-zones.js",     "ОНОВЛЕНО", "B-9: getBPStatus() замість hardcode 140. B-9b: date filter."),
    ]))
    s += [sp(6), hr()]

    # ═══ 5. C-5, REC-1, WHO-1, I18-1, ESC-1, MED-1 ═════════════════════════
    s.append(section_box("5", "UI, i18n, Поради, Ліки — виправлення"))
    s.append(sp(6))
    s.append(h2("C-5 — getDayName comma-separated"))
    s.append(body(
        "Функція getDayName повертала масив замість рядка. "
        "Виправлено: .join(', ') для коректного відображення днів прийому ліків."
    ))
    s.append(sp(4))
    s.append(h2("REC-1 — перевірка sysOk у рекомендаціях"))
    s.append(body(
        "Умова рекомендацій перевіряла лише діастолічний тиск. "
        "Виправлено: додано перевірку sysOk — обидва показники враховуються."
    ))
    s.append(sp(4))
    s.append(h2("WHO-1 — динамічний заголовок модалу норм"))
    s.append(body(
        "Заголовок модалу норм ВООЗ/АНА тепер відображає обраний стандарт динамічно. "
        "При зміні bpStandard заголовок оновлюється автоматично."
    ))
    s.append(sp(4))
    s.append(h2("I18-1 — явний uk-UA locale"))
    s.append(body(
        "Форматування дат та чисел тепер явно використовує 'uk-UA' locale "
        "замість системного — гарантує стабільне відображення на пристроях з іншою мовою."
    ))
    s.append(sp(4))
    s.append(h2("ESC-1 — source_url для pressure_high_1"))
    s.append(body(
        "Поради для категорії pressure_high_1 (Підвищений нормальний 130-139/85-89) "
        "тепер посилаються на ESC 2024 замість загальної сторінки ВООЗ. "
        "Оновлено обидва файли: public/assets/tips/tips_uk.json та assets/tips/tips_uk.json."
    ))
    s.append(sp(4))
    s.append(h2("MED-1 — placeholder для поля дози ліків"))
    s.append(body(
        "Поле введення дози ліків тепер має placeholder 'напр. 50 мг' "
        "для кращого UX при додаванні нових препаратів."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/medications/index.js",          "ОНОВЛЕНО", "C-5: getDayName().join(', ')."),
        ("src/features/analytics/recommendations.js",  "ОНОВЛЕНО", "REC-1: додано перевірку sysOk."),
        ("src/features/bp/norms-modal.js",             "ОНОВЛЕНО", "WHO-1: динамічний заголовок модалу."),
        ("src/features/analytics/health-score.js",     "ОНОВЛЕНО", "I18-1: 'uk-UA' explicit locale."),
        ("public/assets/tips/tips_uk.json",            "ОНОВЛЕНО", "ESC-1: source/source_url → ESC 2024."),
        ("assets/tips/tips_uk.json",                   "ОНОВЛЕНО", "ESC-1: дублюючий файл синхронізовано."),
        ("index.html",                                 "ОНОВЛЕНО", "MED-1: placeholder дози 'напр. 50 мг'."),
    ]))
    s += [sp(6), hr()]

    # ═══ 6. Архітектурні рішення ════════════════════════════════════════════
    s.append(section_box("6", "Архітектурні рішення сесії"))
    s.append(sp(6))
    s.append(arch_table([
        ("Hard Caps замість множників VETO",
         "Math.min(score, CAP) є детермінованим та незалежним від pre-veto значення. "
         "Множник ×0.30 давав різні результати (11, 24, ...) залежно від pre-veto. "
         "Hard Cap max=10 завжди гарантує що crisis score ≤ 10 — незалежно від пілюль/кроків."),
        ("calcScoreForDay() — єдине джерело правди",
         "Дублювання логіки між health-score.js та iz-chart.js порушувало DRY. "
         "Тепер iz-chart.js імпортує calcScoreForDay() — гарантована ідентичність алгоритму "
         "між ІЗ-графіком та загальним health score для конкретного дня."),
        ("AHA2017 у getBPThresholds",
         "Розширення стандарту у точці де зчитуються пороги (а не у кожній функції окремо). "
         "Єдиний параметр std проходить через getBPThresholds → scoreBP → calcHealthScore."),
        ("uk-UA explicit locale",
         "Явне вказання 'uk-UA' у Intl.DateTimeFormat та .toLocaleString() "
         "ізолює відображення від системних налаштувань пристрою. "
         "Критично для Android де користувач може мати системну мову ru/en."),
    ]))
    s += [sp(8), hr()]

    # ═══ 7. Роадмап ══════════════════════════════════════════════════════════
    s.append(section_box("7", "Наступні кроки / Роадмап"))
    s.append(sp(6))
    s.append(proposal_table([
        ("Тести / CI",   "Верифікувати APK pipeline після push. Hard Caps у APK-збірці.",                  "Високий"),
        ("Аналітика",    "calcScoreForDay() — покрити unit-тестами ізольовано від calcHealthScore()",       "Середній"),
        ("Поради",       "ESC-1 для tips_ru.json — оновити source_url для pressure_high_1",                 "Середній"),
        ("PDF звіт лікаря", "Відобразити обраний стандарт (ESC/AHA) у шапці лікарського PDF",             "Середній"),
        ("UX",           "MED-1 placeholder — додати i18n key med-dose-placeholder (uk+ru)",               "Низький"),
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
