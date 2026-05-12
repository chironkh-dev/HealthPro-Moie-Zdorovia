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
VERSION     = "5.3.17"               # версія застосунку
DESCRIPTION = "Roadmap_5tasks"      # коротке уточнення теми сесії (без пробілів)
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
        stat_cell("14", "Файлів змінено",      "JS · HTML · i18n · тести · docs"),
        stat_cell("1",  "Новий файл",           "steps/api.js (shared state)"),
        stat_cell("5",  "Задач виконано",       "з роадмапу v5.3.16 CI Fix"),
        stat_cell("513","Тестів проходить",     "16/16 файлів ✓"),
    ]), sp(14), hr()]

    # ═══ 1. README badges ════════════════════════════════════════════════════
    s.append(section_box("1", "Задача 1 — CI/README бейджі"))
    s.append(sp(6))
    s.append(body(
        "До README.md додано два бейджі GitHub Actions у самому початку документа, "
        "одразу після заголовка. Бейджі відображають поточний стан CI (тести) "
        "та збірки Android APK у реальному часі."
    ))
    s.append(sp(4))
    s.append(code(
        "[![CI](...ci.yml/badge.svg)](actions/workflows/ci.yml)  "
        "[![Android APK](...android-apk.yml/badge.svg)](actions/workflows/android-apk.yml)"
    ))
    s.append(sp(4))
    s.append(file_table([
        ("README.md", "ОНОВЛЕНО",
         "Додано два бейджі GitHub Actions (CI + Android APK) після заголовка h1."),
    ]))
    s += [sp(8), hr()]

    # ═══ 2. steps/api.js ════════════════════════════════════════════════════
    s.append(section_box("2", "Задача 2 — Архітектурний рефакторинг steps/api.js"))
    s.append(sp(6))
    s.append(body(
        "Ключова архітектурна проблема: health-score.js імпортував getStepCount() зі "
        "steps/index.js, який транзитивно тягнув charts.js → ECharts → zrender → "
        "browser globals (navigator). Це спричиняло падіння тестів на CI. "
        "Рішення: виокремити чистий стан кроків у steps/api.js без жодних залежностей."
    ))
    s.append(sp(4))
    s.append(h2("Новий файл: src/features/steps/api.js"))
    s.append(body(
        "Мінімальний модуль (4 рядки): зберігає _stepCount, "
        "експортує getStepCount() та _setStepCount(). "
        "Нульові залежності — не тягне charts, state, platform, DB."
    ))
    s.append(sp(4))
    s.append(h2("Оновлений ланцюжок імпортів"))
    s.append(code(
        "БУЛО: health-score.js → steps/index.js → charts.js → zrender → navigator  "
        "СТАЛО: health-score.js → steps/api.js  (0 транзитивних deps)"
    ))
    s.append(sp(4))
    s.append(h2("Синхронізація _stepCount у steps/index.js"))
    s.append(body(
        "_setStepCount(count) викликається у чотирьох точках: "
        "_persistSteps() (кожен крок), _checkDayRollover() (скидання → 0), "
        "enableSteps() (після завантаження з DB), restoreSteps() (відновлення після перезапуску). "
        "Тести для activity-score, bmi-activity-combo, stepgoal-bmi-combo оновлено: "
        "мокають steps/api.js замість steps/index.js."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/steps/api.js",          "НОВИЙ",
         "_stepCount, getStepCount(), _setStepCount() — без browser залежностей."),
        ("src/features/steps/index.js",        "ОНОВЛЕНО",
         "import+export getStepCount з api.js; _setStepCount у 4 місцях sync."),
        ("src/features/analytics/health-score.js", "ОНОВЛЕНО",
         "import getStepCount з steps/api.js (розриває chart-ланцюжок)."),
        ("tests/activity-score.test.js",       "ОНОВЛЕНО",
         "vi.mock(steps/api.js) замість steps/index.js."),
        ("tests/bmi-activity-combo.test.js",   "ОНОВЛЕНО",
         "vi.mock(steps/api.js) замість steps/index.js."),
        ("tests/stepgoal-bmi-combo.test.js",   "ОНОВЛЕНО",
         "vi.mock(steps/api.js) замість steps/index.js."),
    ]))
    s += [sp(8), hr()]

    # ═══ 3. 5-хв таймер блокування ══════════════════════════════════════════
    s.append(section_box("3", "Задача 3 — 5-хвилинний таймер блокування"))
    s.append(sp(6))
    s.append(body(
        "До цього блокування PIN активувалося при КОЖНОМУ поверненні з фону, "
        "навіть якщо користувач перемкнувся на 1 секунду у налаштування WiFi. "
        "Нова логіка: блокуємо ЛИШЕ якщо у фоні пройшло 5+ хвилин."
    ))
    s.append(sp(4))
    s.append(h2("platform.js — новий хелпер onPause()"))
    s.append(body(
        "Аналог onResume() для App.addListener('appStateChange', {isActive: false}). "
        "Викликається при згортанні додатку у фон."
    ))
    s.append(sp(4))
    s.append(h2("app.js — логіка таймера"))
    s.append(body(
        "_bgTimestamp (let) зберігає Date.now() при переході у фон (onPause). "
        "BG_LOCK_TIMEOUT_MS = 5 * 60 * 1000 (5 хвилин). "
        "onResume перевіряє elapsed = Date.now() - _bgTimestamp >= 5 хв → lockCheck(). "
        "Якщо _bgTimestamp = 0 (перший запуск) → Infinity → блокуємо завжди (безпечно)."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/core/platform.js", "ОНОВЛЕНО",
         "Новий експорт onPause() — Capacitor App appStateChange {isActive: false}."),
        ("src/app.js",          "ОНОВЛЕНО",
         "_bgTimestamp, BG_LOCK_TIMEOUT_MS, onPause handler, onResume з elapsed-check."),
    ]))
    s += [sp(8), hr()]

    # ═══ 4. Середні кроки ══════════════════════════════════════════════════
    s.append(section_box("4", "Задача 4 — Середні кроки (тиждень/місяць)"))
    s.append(sp(6))
    s.append(body(
        "На картці активності під рядком цілі тепер відображаються два рядки: "
        "'Середнє за тиждень: X' та 'Середнє за місяць: X'. "
        "Дані беруться з steps_log за 30 днів (без сьогодні). "
        "Кеш 5 хвилин — не запитує DB при кожному оновленні UI."
    ))
    s.append(sp(4))
    s.append(h2("refreshStepAvg() — нова async функція у steps/index.js"))
    s.append(body(
        "queryStepLog({ days: 30 }) → фільтр по діапазону дат → "
        "wRows (7 днів), mRows (30 днів) → round(sum/length). "
        "null якщо немає даних (рядок не відображається). "
        "Викликається з enableSteps(), restoreSteps(), updateStepUI()."
    ))
    s.append(sp(4))
    s.append(h2("index.html — два нових DOM-елементи"))
    s.append(body(
        "#stepWeekAvg та #stepMonthAvg — div.step-avg-row під .step-goal-row. "
        "font-size: 11px, color: var(--text2) — другорядний стиль, не домінує."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/steps/index.js", "ОНОВЛЕНО",
         "refreshStepAvg(), _renderStepAvg(), _weekAvg, _monthAvg, _avgLastRefresh."),
        ("index.html",                  "ОНОВЛЕНО",
         "#stepWeekAvg та #stepMonthAvg у step-ring-info, під step-goal-row."),
        ("src/i18n/ui.uk.js",           "ОНОВЛЕНО",
         "st-week-avg, st-month-avg — підписи рядків середніх."),
        ("src/i18n/ui.ru.js",           "ОНОВЛЕНО",
         "st-week-avg, st-month-avg — підписи рядків середніх (рос.)."),
    ]))
    s += [sp(8), hr()]

    # ═══ 5. Автобекап 7 днів ═══════════════════════════════════════════════
    s.append(section_box("5", "Задача 5 — Нагадування про бекап (7 днів)"))
    s.append(sp(6))
    s.append(body(
        "Після кожного успішного експорту backup.js зберігає поточну дату у "
        "state.settings.lastBackupDate. При наступному старті додатку app.js "
        "перевіряє скільки днів пройшло. Якщо 7+, через 4 секунди після init "
        "показує toast-нагадування (тривалість 5 секунд)."
    ))
    s.append(sp(4))
    s.append(h2("Деталі реалізації"))
    s.append(bullet(
        "storage.js: defaultSettings.lastBackupDate = '' (вже було на місці з попередньої сесії)."
    ))
    s.append(bullet(
        "backup.js exportBackup(): після platformDownload → state.settings.lastBackupDate = today(); saveData()."
    ))
    s.append(bullet(
        "app.js _checkAutoBackupReminder(): daysSince = Math.floor((now - new Date(lastDate)) / 86400000). "
        "Якщо >= 7 → setTimeout(() => showToast(t('bk-auto-remind'), 5000), 4000)."
    ))
    s.append(bullet(
        "i18n: bk-auto-remind вже на місці (uk + ru)."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/export/backup.js", "ОНОВЛЕНО",
         "Після export: state.settings.lastBackupDate = today(); saveData()."),
        ("src/app.js",                    "ОНОВЛЕНО",
         "_checkAutoBackupReminder() — перевірка при init, toast якщо 7+ днів без бекапу."),
    ]))
    s += [sp(8), hr()]

    # ═══ 6. Архітектурні рішення ════════════════════════════════════════════
    s.append(section_box("6", "Архітектурні рішення сесії"))
    s.append(sp(6))
    s.append(arch_table([
        ("steps/api.js — zero-dep shared state",
         "Патерн: виокремлення чистого стану з модуля що має важкі залежності. "
         "Результат: health-score.js залежить лише від steps/api.js (0 транзитивних) "
         "замість steps/index.js (→ charts → zrender → navigator). "
         "Тести не потребують alias/stub для charts при тестуванні health score."),
        ("ESM re-export з api.js",
         "steps/index.js: import { getStepCount } from './api.js'; export { getStepCount }. "
         "Зворотна сумісність: будь-який код що імпортує getStepCount зі steps/index.js "
         "продовжує працювати без змін. health-score.js явно вказує steps/api.js."),
        ("onPause + _bgTimestamp",
         "Збереження часу у module-level змінній (не localStorage) — достатньо для "
         "in-process таймера. При cold start _bgTimestamp = 0 → elapsed = Infinity → "
         "безпечне блокування. При warm resume — точний elapsed."),
        ("TTL-кеш для step averages",
         "_avgLastRefresh: number — Date.now() при останньому запиті. "
         "Якщо now - _avgLastRefresh < 5 хв → використовуємо кешовані _weekAvg/_monthAvg. "
         "Запобігає зайвим queryStepLog при кожному оновленні крокоміра."),
        ("toast з затримкою 4с для нагадування",
         "setTimeout(..., 4000) після init дозволяє UI повністю завантажитися до показу "
         "нагадування. Уникає race condition з splash screen та першим рендером."),
    ]))
    s += [sp(8), hr()]

    # ═══ 7. Роадмап ══════════════════════════════════════════════════════════
    s.append(section_box("7", "Наступні кроки / Роадмап"))
    s.append(sp(6))
    s.append(proposal_table([
        ("Тести",        "Перевірити APK artifact pipeline після push до GitHub",                          "Високий"),
        ("Крокомір",     "Дозволити налаштування BG_LOCK_TIMEOUT_MS у Налаштуваннях (1, 5, 15 хв)",       "Середній"),
        ("Кроки",        "Trend-графік середніх кроків (тижні) у вкладці Аналітика",                      "Середній"),
        ("Бекап",        "Вибір частоти нагадування (3/7/14 днів) у Налаштуваннях",                       "Низький"),
        ("PDF звіт",     "Додати середні кроки у розділ Активності лікарського PDF-звіту",                 "Середній"),
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
