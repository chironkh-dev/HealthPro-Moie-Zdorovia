#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HealthPro — Моє Здоров'я
Фінальний звіт сесії: Рефакторинг крокоміра (травень 2026)
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os, datetime

# ── Шрифти (DejaVu Sans — повна кирилична підтримка) ────────────────────────
DEJAVU = "/usr/share/fonts/truetype/dejavu"
pdfmetrics.registerFont(TTFont("Arial",        f"{DEJAVU}/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold",   f"{DEJAVU}/DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", f"{DEJAVU}/DejaVuSans.ttf"))   # DejaVu не має Italic; регулярний
pdfmetrics.registerFont(TTFont("Arial-Mono",   f"{DEJAVU}/DejaVuSansMono.ttf"))

# ── Кольори ──────────────────────────────────────────────────────────────────
C_NAVY       = colors.HexColor("#1A237E")   # заголовок
C_ACCENT     = colors.HexColor("#0D47A1")   # рядок-заголовок таблиці
C_TEAL       = colors.HexColor("#00695C")   # секція
C_ORANGE     = colors.HexColor("#E65100")   # попередження / виправлення
C_GREEN      = colors.HexColor("#1B5E20")   # ✓ успіх
C_RED        = colors.HexColor("#B71C1C")   # помилка / баг
C_LIGHT_BLUE = colors.HexColor("#E3F2FD")   # парний рядок таблиці
C_LIGHT_GREY = colors.HexColor("#F5F5F5")   # непарний рядок
C_DIVIDER    = colors.HexColor("#BDBDBD")
C_HEADER_BG  = colors.HexColor("#1A237E")
C_STAT_BG    = colors.HexColor("#E8EAF6")
C_CODE_BG    = colors.HexColor("#ECEFF1")

W, H = A4   # 595 × 842 pt

# ── Стилі ────────────────────────────────────────────────────────────────────
def make_styles():
    s = {}

    def sty(name, **kw):
        s[name] = ParagraphStyle(name, **kw)

    sty("Title",      fontName="Arial-Bold",  fontSize=26, textColor=colors.white,
                      alignment=TA_CENTER, spaceAfter=4, leading=32)
    sty("Subtitle",   fontName="Arial",        fontSize=13, textColor=colors.HexColor("#E8EAF6"),
                      alignment=TA_CENTER, spaceAfter=2, leading=17)
    sty("DateLine",   fontName="Arial-Italic", fontSize=10, textColor=colors.HexColor("#B0BEC5"),
                      alignment=TA_CENTER, spaceAfter=0)

    sty("H1",         fontName="Arial-Bold",  fontSize=14, textColor=C_NAVY,
                      spaceBefore=14, spaceAfter=5, leading=18,
                      borderPad=(0,0,3,0))
    sty("H2",         fontName="Arial-Bold",  fontSize=11, textColor=C_TEAL,
                      spaceBefore=10, spaceAfter=4, leading=15)
    sty("H3",         fontName="Arial-Bold",  fontSize=10, textColor=C_ORANGE,
                      spaceBefore=6, spaceAfter=3, leading=13)
    sty("Body",       fontName="Arial",        fontSize=9.5, textColor=colors.HexColor("#212121"),
                      leading=14, spaceAfter=4, alignment=TA_JUSTIFY)
    sty("Bullet",     fontName="Arial",        fontSize=9.5, textColor=colors.HexColor("#212121"),
                      leading=14, leftIndent=14, firstLineIndent=-10, spaceAfter=2)
    sty("SubBullet",  fontName="Arial",        fontSize=9,   textColor=colors.HexColor("#424242"),
                      leading=13, leftIndent=28, firstLineIndent=-10, spaceAfter=2)
    sty("Code",       fontName="Arial",        fontSize=8.5, textColor=colors.HexColor("#263238"),
                      backColor=C_CODE_BG, leading=13, leftIndent=12, spaceAfter=2,
                      borderPad=4)
    sty("Footer",     fontName="Arial-Italic", fontSize=8,   textColor=colors.HexColor("#9E9E9E"),
                      alignment=TA_CENTER)
    sty("StatLabel",  fontName="Arial",        fontSize=8.5, textColor=C_NAVY,
                      alignment=TA_CENTER, leading=11)
    sty("StatValue",  fontName="Arial-Bold",   fontSize=22, textColor=C_NAVY,
                      alignment=TA_CENTER, leading=26)
    sty("StatSub",    fontName="Arial",        fontSize=7.5, textColor=C_TEAL,
                      alignment=TA_CENTER, leading=10)
    sty("TableHead",  fontName="Arial-Bold",   fontSize=9,   textColor=colors.white,
                      alignment=TA_CENTER, leading=12)
    sty("TableCell",  fontName="Arial",        fontSize=8.5, textColor=colors.HexColor("#212121"),
                      leading=12, spaceAfter=1)
    sty("TableCellC", fontName="Arial",        fontSize=8.5, textColor=colors.HexColor("#212121"),
                      leading=12, alignment=TA_CENTER)
    sty("Tag",        fontName="Arial-Bold",   fontSize=8,   textColor=colors.white,
                      alignment=TA_CENTER, leading=11)
    sty("Note",       fontName="Arial-Italic", fontSize=8.5, textColor=colors.HexColor("#546E7A"),
                      leading=12, leftIndent=10, spaceAfter=3)
    return s

ST = make_styles()

# ── Допоміжні блоки ──────────────────────────────────────────────────────────

def h1(text): return Paragraph(f"<b>{text}</b>", ST["H1"])
def h2(text): return Paragraph(f"<b>{text}</b>", ST["H2"])
def h3(text): return Paragraph(f"<b>{text}</b>", ST["H3"])
def body(text): return Paragraph(text, ST["Body"])
def note(text): return Paragraph(f"<i>{text}</i>", ST["Note"])
def bullet(text, sub=False):
    key = "SubBullet" if sub else "Bullet"
    return Paragraph(f"• {text}", ST[key])
def code(text): return Paragraph(text, ST["Code"])
def sp(h=6): return Spacer(1, h)
def hr(): return HRFlowable(width="100%", thickness=0.5, color=C_DIVIDER, spaceAfter=6, spaceBefore=4)

def tag_cell(label, bg):
    return Table([[Paragraph(label, ST["Tag"])]],
                 colWidths=[2.2*cm],
                 style=TableStyle([
                     ("BACKGROUND", (0,0), (-1,-1), bg),
                     ("ROUNDEDCORNERS", [4]),
                     ("BOX", (0,0), (-1,-1), 0, bg),
                     ("TOPPADDING",(0,0),(-1,-1),2),
                     ("BOTTOMPADDING",(0,0),(-1,-1),2),
                 ]))

def section_number_box(num, title):
    """Блок з номером секції + назвою"""
    num_p  = Paragraph(f"<b>{num}</b>", ParagraphStyle("N", fontName="Arial-Bold",
              fontSize=16, textColor=colors.white, alignment=TA_CENTER))
    title_p = Paragraph(f"<b>{title}</b>", ParagraphStyle("T", fontName="Arial-Bold",
              fontSize=12, textColor=C_NAVY, leading=15))
    t = Table([[num_p, title_p]], colWidths=[1*cm, 14.5*cm],
              style=TableStyle([
                  ("BACKGROUND",  (0,0),(0,0), C_NAVY),
                  ("VALIGN",      (0,0),(-1,-1), "MIDDLE"),
                  ("LEFTPADDING", (0,0),(0,0), 6),
                  ("RIGHTPADDING",(0,0),(0,0), 6),
                  ("TOPPADDING",  (0,0),(-1,-1), 5),
                  ("BOTTOMPADDING",(0,0),(-1,-1),5),
                  ("LEFTPADDING", (1,0),(1,0), 10),
                  ("LINEBELOW",   (0,0),(-1,-1), 1.5, C_NAVY),
              ]))
    return t

def file_table(rows):
    """Таблиця змінених файлів"""
    head = [
        Paragraph("Файл", ST["TableHead"]),
        Paragraph("Статус", ST["TableHead"]),
        Paragraph("Зміни", ST["TableHead"]),
    ]
    data = [head]
    for i, (fname, status, desc) in enumerate(rows):
        bg_color = {"НОВИЙ": C_GREEN, "ПЕРЕЗАПИС": C_ORANGE,
                    "ОНОВЛЕНО": C_ACCENT}.get(status, C_ACCENT)
        status_p = Paragraph(status, ParagraphStyle("S", fontName="Arial-Bold", fontSize=8,
                             textColor=colors.white, alignment=TA_CENTER))
        row_bg = C_LIGHT_BLUE if i % 2 == 0 else C_LIGHT_GREY
        data.append([
            Paragraph(fname,  ST["TableCell"]),
            Table([[status_p]], colWidths=[2*cm], style=TableStyle([
                ("BACKGROUND",(0,0),(-1,-1), bg_color),
                ("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2),
            ])),
            Paragraph(desc, ST["TableCell"]),
        ])

    t = Table(data, colWidths=[5.5*cm, 2.2*cm, 7.8*cm],
              style=TableStyle([
                  ("BACKGROUND",    (0,0), (-1,0), C_HEADER_BG),
                  ("ROWBACKGROUNDS",(0,1), (-1,-1), [C_LIGHT_BLUE, C_LIGHT_GREY]),
                  ("GRID",          (0,0), (-1,-1), 0.4, colors.HexColor("#B0BEC5")),
                  ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
                  ("TOPPADDING",    (0,0), (-1,-1), 5),
                  ("BOTTOMPADDING", (0,0), (-1,-1), 5),
                  ("LEFTPADDING",   (0,0), (-1,-1), 6),
              ]))
    return t

def bug_table(rows):
    """Таблиця трьох багів"""
    head = [
        Paragraph("#",        ST["TableHead"]),
        Paragraph("Симптом",  ST["TableHead"]),
        Paragraph("Першопричина", ST["TableHead"]),
        Paragraph("Рішення",  ST["TableHead"]),
    ]
    data = [head]
    for i, (num, symptom, cause, fix) in enumerate(rows):
        row_bg = C_LIGHT_BLUE if i % 2 == 0 else C_LIGHT_GREY
        data.append([
            Paragraph(f"<b>{num}</b>", ST["TableCellC"]),
            Paragraph(symptom,  ST["TableCell"]),
            Paragraph(cause,    ST["TableCell"]),
            Paragraph(fix,      ST["TableCell"]),
        ])
    t = Table(data, colWidths=[0.7*cm, 4.1*cm, 4.7*cm, 6*cm],
              style=TableStyle([
                  ("BACKGROUND",    (0,0), (-1,0), C_HEADER_BG),
                  ("ROWBACKGROUNDS",(0,1), (-1,-1), [C_LIGHT_BLUE, C_LIGHT_GREY]),
                  ("GRID",          (0,0), (-1,-1), 0.4, colors.HexColor("#B0BEC5")),
                  ("VALIGN",        (0,0), (-1,-1), "TOP"),
                  ("TOPPADDING",    (0,0), (-1,-1), 5),
                  ("BOTTOMPADDING", (0,0), (-1,-1), 5),
                  ("LEFTPADDING",   (0,0), (-1,-1), 5),
              ]))
    return t

def const_table(rows):
    """Таблиця констант"""
    head = [
        Paragraph("Константа",    ST["TableHead"]),
        Paragraph("До",           ST["TableHead"]),
        Paragraph("Після",        ST["TableHead"]),
        Paragraph("Пояснення",    ST["TableHead"]),
    ]
    data = [head]
    for i, (name, before, after, reason) in enumerate(rows):
        data.append([
            Paragraph(f"<b>{name}</b>", ST["TableCell"]),
            Paragraph(before, ST["TableCellC"]),
            Paragraph(f"<b>{after}</b>", ParagraphStyle("A", fontName="Arial-Bold", fontSize=8.5,
                      textColor=C_GREEN, alignment=TA_CENTER)),
            Paragraph(reason, ST["TableCell"]),
        ])
    t = Table(data, colWidths=[4.5*cm, 2.2*cm, 2.2*cm, 6.6*cm],
              style=TableStyle([
                  ("BACKGROUND",    (0,0), (-1,0), C_HEADER_BG),
                  ("ROWBACKGROUNDS",(0,1), (-1,-1), [C_LIGHT_BLUE, C_LIGHT_GREY]),
                  ("GRID",          (0,0), (-1,-1), 0.4, colors.HexColor("#B0BEC5")),
                  ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
                  ("TOPPADDING",    (0,0), (-1,-1), 5),
                  ("BOTTOMPADDING", (0,0), (-1,-1), 5),
                  ("LEFTPADDING",   (0,0), (-1,-1), 6),
              ]))
    return t

def test_table(rows):
    """Таблиця тестів"""
    head = [
        Paragraph("Тест-файл",     ST["TableHead"]),
        Paragraph("Тести",         ST["TableHead"]),
        Paragraph("Що покривається", ST["TableHead"]),
    ]
    data = [head]
    for i, (fname, count, what) in enumerate(rows):
        data.append([
            Paragraph(fname, ST["TableCell"]),
            Paragraph(f"<b>{count}</b>", ParagraphStyle("C", fontName="Arial-Bold", fontSize=9,
                      textColor=C_NAVY, alignment=TA_CENTER)),
            Paragraph(what, ST["TableCell"]),
        ])
    t = Table(data, colWidths=[5*cm, 1.8*cm, 8.7*cm],
              style=TableStyle([
                  ("BACKGROUND",    (0,0), (-1,0), C_HEADER_BG),
                  ("ROWBACKGROUNDS",(0,1), (-1,-1), [C_LIGHT_BLUE, C_LIGHT_GREY]),
                  ("GRID",          (0,0), (-1,-1), 0.4, colors.HexColor("#B0BEC5")),
                  ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
                  ("TOPPADDING",    (0,0), (-1,-1), 5),
                  ("BOTTOMPADDING", (0,0), (-1,-1), 5),
                  ("LEFTPADDING",   (0,0), (-1,-1), 6),
              ]))
    return t


# ── Обкладинка (header-блок) ─────────────────────────────────────────────────

def cover_block():
    items = []
    # Темно-синій фон із заголовком
    header_data = [[
        Paragraph("HealthPro", ST["Title"]),
    ]]
    header_t = Table(header_data, colWidths=[W - 4*cm],
                     style=TableStyle([
                         ("BACKGROUND",    (0,0),(-1,-1), C_NAVY),
                         ("TOPPADDING",    (0,0),(-1,-1), 18),
                         ("BOTTOMPADDING", (0,0),(-1,-1), 6),
                     ]))
    items.append(header_t)

    sub_data = [[
        Paragraph("Моє Здоров'я", ST["Subtitle"]),
    ]]
    sub_t = Table(sub_data, colWidths=[W - 4*cm],
                  style=TableStyle([
                      ("BACKGROUND",    (0,0),(-1,-1), C_NAVY),
                      ("TOPPADDING",    (0,0),(-1,-1), 0),
                      ("BOTTOMPADDING", (0,0),(-1,-1), 4),
                  ]))
    items.append(sub_t)

    rub_data = [[
        Paragraph("Звіт сесії — Рефакторинг крокоміра (Баги #1, #2, #3)", ST["Subtitle"]),
    ]]
    rub_t = Table(rub_data, colWidths=[W - 4*cm],
                  style=TableStyle([
                      ("BACKGROUND",    (0,0),(-1,-1), C_NAVY),
                      ("TOPPADDING",    (0,0),(-1,-1), 0),
                      ("BOTTOMPADDING", (0,0),(-1,-1), 4),
                  ]))
    items.append(rub_t)

    date_data = [[
        Paragraph(f"Дата: {datetime.date.today().strftime('%-d %B %Y р.').replace('May','травня').replace('April','квітня').replace('June','червня')}", ST["DateLine"]),
    ]]
    date_t = Table(date_data, colWidths=[W - 4*cm],
                   style=TableStyle([
                       ("BACKGROUND",    (0,0),(-1,-1), C_NAVY),
                       ("TOPPADDING",    (0,0),(-1,-1), 0),
                       ("BOTTOMPADDING", (0,0),(-1,-1), 18),
                   ]))
    items.append(date_t)
    return items


def stats_block():
    """4 статистичних плитки"""
    def cell(value, label, sub=""):
        inner = [
            [Paragraph(value, ST["StatValue"])],
            [Paragraph(label, ST["StatLabel"])],
        ]
        if sub:
            inner.append([Paragraph(sub, ST["StatSub"])])
        return Table(inner, colWidths=[3.5*cm],
                     style=TableStyle([
                         ("BACKGROUND",    (0,0),(-1,-1), C_STAT_BG),
                         ("TOPPADDING",    (0,0),(-1,-1), 8),
                         ("BOTTOMPADDING", (0,0),(-1,-1), 8),
                         ("BOX",           (0,0),(-1,-1), 1, C_ACCENT),
                     ]))

    row = [[
        cell("475", "Тестів пройшло", "+3 нових"),
        cell("3",   "Баги виправлено", "всі критичні"),
        cell("11",  "Файлів змінено", "Java + JS + i18n"),
        cell("15",  "Тест-файлів", "усі зелені"),
    ]]
    return Table(row, colWidths=[3.7*cm, 3.7*cm, 3.7*cm, 3.7*cm],
                 hAlign="CENTER",
                 style=TableStyle([
                     ("LEFTPADDING",   (0,0),(-1,-1), 4),
                     ("RIGHTPADDING",  (0,0),(-1,-1), 4),
                     ("TOPPADDING",    (0,0),(-1,-1), 0),
                     ("BOTTOMPADDING", (0,0),(-1,-1), 0),
                 ]))


# ── Основний зміст ────────────────────────────────────────────────────────────

def build_story():
    story = []

    # ── Обкладинка ──
    story += cover_block()
    story.append(sp(10))
    story.append(stats_block())
    story.append(sp(14))
    story.append(hr())

    # ════════════════════════════════════════════════════════════════════════
    # 1. КОНТЕКСТ СЕСІЇ
    # ════════════════════════════════════════════════════════════════════════
    story.append(section_number_box("1", "Контекст сесії"))
    story.append(sp(6))
    story.append(body(
        "Попередня сесія (травень 2026) реалізувала Android Foreground Service для "
        "крокоміра — апаратний датчик TYPE_STEP_COUNTER, який не вимикається при згортанні "
        "додатку. Після реального тестування на вулиці було знайдено <b>3 критичні баги</b>, "
        "що унеможливлювали надійну роботу лічильника."
    ))
    story.append(sp(4))

    bug_rows = [
        ("1", "Кількість у сповіщенні ≠ кількість в додатку",
               "Сервіс транслював дельту сесії; JS додавав її поверх денного підсумку з БД",
               "Новий EXTRA_INITIAL_STEPS: сервіс отримує денний підсумок з БД і завжди "
               "транслює повний добовий результат"),
        ("2", "Тапи по екрану рахуються як кроки",
               "LINEAR_THRESHOLD=2.0 м/с&#178; — надто чутливий; тапи дають пік ~2–4 м/с&#178;",
               "Підвищення до 3.0 м/с&#178; + STEP_MIN_PEAK_SAMPLES=2 (потрібно 2 послідовних "
               "зразки вище порогу ~40 мс мін.; кроки ≥80 мс, тапи &lt;20 мс)"),
        ("3", "Сервіс зупиняється після тесту на вулиці (Doze / Samsung kill)",
               "Відсутній BootReceiver; немає SharedPreferences для збереження стану; "
               "stopWithTask=true за замовчуванням",
               "BootReceiver (перезапуск після reboot/оновлення) + stopWithTask=false + "
               "onResume health-check у JS (тихий перезапуск без дії користувача)"),
    ]
    story.append(KeepTogether([
        h2("Три критичні баги (реальне тестування)"),
        bug_table(bug_rows),
    ]))
    story.append(sp(8))
    story.append(hr())

    # ════════════════════════════════════════════════════════════════════════
    # 2. ANDROID-НАТИВНИЙ РІВЕНЬ
    # ════════════════════════════════════════════════════════════════════════
    story.append(section_number_box("2", "Android-нативний рівень — виправлення"))
    story.append(sp(6))

    # 2.1
    story.append(h2("2.1  StepCounterService.java — повна перезапис"))
    story.append(bullet("Новий extras: <b>EXTRA_INITIAL_STEPS</b> — денний підсумок з БД, "
                         "переданий плагіном при запуску сервісу"))
    story.append(bullet("Формула сервісу тепер: <b>currentSteps = (rawSteps − baseline) + initialSteps</b> "
                         "→ трансляція завжди відображає повний добовий результат (виправлення Бага #1)"))
    story.append(bullet("<b>onTaskRemoved()</b> — при свайпі з Recent Apps планує AlarmManager-перезапуск "
                         "через 2 секунди (подолання агресивного вбивства Samsung)"))
    story.append(bullet("SharedPreferences (<i>hp_step_prefs</i>): зберігає was_running, goal, step_date, "
                         "saved_steps при кожному оновленні сповіщення"))
    story.append(bullet("<b>clearRunningState()</b> — явна зупинка через UI скидає was_running=false, "
                         "щоб BootReceiver не відновлював після reboot якщо користувач сам вимкнув"))
    story.append(sp(6))

    # 2.2
    story.append(h2("2.2  ForegroundStepPlugin.java — оновлений API"))
    story.append(bullet("Метод <b>start()</b> тепер приймає 4-й аргумент initialSteps (int) і "
                         "передає його сервісу через Intent"))
    story.append(bullet("Метод <b>getSteps()</b> повертає <b>{ steps, running, sensorAvailable }</b> "
                         "— поле <i>running</i> дозволяє JS виявити мертвий сервіс без окремого дзвінка"))
    story.append(bullet("Два нових методи: <b>getBatteryOptStatus()</b> та <b>requestBatteryOpt()</b> "
                         "— відкривають системний діалог оптимізації батареї (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)"))
    story.append(sp(6))

    # 2.3
    story.append(KeepTogether([
        h2("2.3  BootReceiver.java — НОВИЙ файл"),
        bullet("Слухає <b>BOOT_COMPLETED</b> та <b>MY_PACKAGE_REPLACED</b>"),
        bullet("Читає SharedPreferences: якщо was_running=true і дата збігається → "
               "перезапускає сервіс з тими самими initialSteps що були до reboot"),
        bullet("Якщо збережена дата — вчорашня: initialSteps=0 (новий день)"),
    ]))
    story.append(sp(6))

    # 2.4
    story.append(KeepTogether([
        h2("2.4  AndroidManifest.xml — зміни"),
        bullet("<b>android:stopWithTask=\"false\"</b> у &lt;service&gt; — сервіс виживає "
               "при свайпі з Recent Apps (раніше вмирав)"),
        bullet("Реєстрація <b>&lt;receiver android:name=\".BootReceiver\"&gt;</b> з "
               "BOOT_COMPLETED + MY_PACKAGE_REPLACED"),
        bullet("Новий дозвіл: <b>REQUEST_IGNORE_BATTERY_OPTIMIZATIONS</b>"),
    ]))
    story.append(sp(8))
    story.append(hr())

    # ════════════════════════════════════════════════════════════════════════
    # 3. JAVASCRIPT-РІВЕНЬ
    # ════════════════════════════════════════════════════════════════════════
    story.append(section_number_box("3", "JavaScript-рівень — виправлення"))
    story.append(sp(6))

    # 3.1 constants.js
    story.append(h2("3.1  constants.js — нові параметри фільтрації"))
    story.append(const_table([
        ("STEP_LINEAR_THRESHOLD",  "2.0 м/с²", "3.0 м/с²",
         "Тапи дають пік ~2–4 м/с²; поріг 3.0 відсіює більшість тапів"),
        ("STEP_MIN_PEAK_SAMPLES",  "—",          "2",
         "Потрібно 2 послідовних зразки вище порогу (~40 мс); тапи &lt;20 мс не проходять"),
    ]))
    story.append(sp(6))

    # 3.2 platform.js
    story.append(h2("3.2  platform.js — нові функції"))
    plat_rows = [
        ("startStepService(goal, title, text, <b>initialSteps</b>)",
         "4-й аргумент initialSteps передається сервісу — синхронізація з БД"),
        ("getServiceStatus()",
         "Повертає { steps, running, sensorAvailable } замість просто числа"),
        ("getBatteryOptStatus()",
         "Перевіряє чи виключений додаток з оптимізації батареї"),
        ("requestBatteryOptExemption()",
         "Відкриває системний діалог ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"),
        ("getServiceStepCount()",
         "Збережено як shim → getServiceStatus().steps (зворотна сумісність)"),
    ]
    plat_data = [[Paragraph("Функція", ST["TableHead"]), Paragraph("Опис", ST["TableHead"])]]
    for i, (fn, desc_) in enumerate(plat_rows):
        bg = C_LIGHT_BLUE if i % 2 == 0 else C_LIGHT_GREY
        plat_data.append([
            Paragraph(fn,    ST["TableCell"]),
            Paragraph(desc_, ST["TableCell"]),
        ])
    plat_t = Table(plat_data, colWidths=[6.5*cm, 9*cm],
                   style=TableStyle([
                       ("BACKGROUND",    (0,0),(-1,0), C_HEADER_BG),
                       ("ROWBACKGROUNDS",(0,1),(-1,-1), [C_LIGHT_BLUE, C_LIGHT_GREY]),
                       ("GRID",          (0,0),(-1,-1), 0.4, colors.HexColor("#B0BEC5")),
                       ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
                       ("TOPPADDING",    (0,0),(-1,-1), 5),
                       ("BOTTOMPADDING", (0,0),(-1,-1), 5),
                       ("LEFTPADDING",   (0,0),(-1,-1), 6),
                   ]))
    story.append(plat_t)
    story.append(sp(6))

    # 3.3 steps/index.js
    story.append(h2("3.3  steps/index.js — ключові зміни"))

    story.append(h3("Фільтр тапів (_peakSamples)"))
    story.append(body(
        "Лічильник <b>_peakSamples</b> накопичує послідовні зразки вище порогу. "
        "Пік оголошується тільки після STEP_MIN_PEAK_SAMPLES=2 таких зразків. "
        "При падінні нижче порогу лічильник скидається в 0. "
        "Якщо <i>_inPeak=true</i> і сигнал падає нижче порогу — крок зараховується "
        "(при виконанні debounce MIN_INTERVAL_MS=250 мс)."
    ))
    story.append(sp(3))

    story.append(h3("enableSteps('foreground') — синхронізація з БД"))
    story.append(bullet("stepCount зчитується з БД → передається як <b>initialSteps</b> "
                         "у startStepService() → сервіс додає delta поверх → трансляція = повний добовий підсумок"))
    story.append(bullet("Після старту сервісу — запит getServiceStatus(); якщо steps > stepCount → "
                         "оновлення (сервіс вже нарахував кроки поки JS ініціалізувався)"))
    story.append(sp(3))

    story.append(h3("onResume health-check — тихий перезапуск"))
    story.append(bullet("<b>_setupResumeHealthCheck()</b> реєструє єдиний onResume-хендлер "
                         "(попередній знімається — уникнення дублювання)"))
    story.append(bullet("При поверненні у додаток: getServiceStatus() → якщо running=false → "
                         "startStepService() з поточним stepCount → showToast('st-service-restored')"))
    story.append(bullet("Якщо running=true але steps > JS-лічильник → тихий sync (без toast)"))
    story.append(sp(3))

    story.append(h3("Одноразовий промпт батареї (_checkBatteryOptOnce)"))
    story.append(bullet("Викликається після успішного старту FG-сервісу, лише один раз за сесію"))
    story.append(bullet("getBatteryOptStatus() → якщо ignored=false → через 2.8 с toast 'st-battery-opt' "
                         "+ через 2.6 с requestBatteryOptExemption()"))
    story.append(sp(6))

    # 3.4 i18n
    story.append(KeepTogether([
        h2("3.4  i18n — нові ключі (uk + ru)"),
        sp(3),
    ]))
    i18n_data = [
        [Paragraph("Ключ", ST["TableHead"]), Paragraph("Текст (uk)", ST["TableHead"]),
         Paragraph("Текст (ru)", ST["TableHead"])],
        [Paragraph("st-service-restored", ST["TableCell"]),
         Paragraph("Крокомір відновлено після збою системи.", ST["TableCell"]),
         Paragraph("Шагомер восстановлен после сбоя системы.", ST["TableCell"])],
        [Paragraph("st-battery-opt", ST["TableCell"]),
         Paragraph("Увімкніть «Без обмежень» у налаштуваннях батареї, щоб крокомір не вимикався у фоні.", ST["TableCell"]),
         Paragraph("Включите «Без ограничений» в настройках батареи, чтобы шагомер не отключался в фоне.", ST["TableCell"])],
    ]
    i18n_t = Table(i18n_data, colWidths=[4*cm, 6.5*cm, 5*cm],
                   style=TableStyle([
                       ("BACKGROUND",    (0,0),(-1,0), C_HEADER_BG),
                       ("ROWBACKGROUNDS",(0,1),(-1,-1), [C_LIGHT_BLUE, C_LIGHT_GREY]),
                       ("GRID",          (0,0),(-1,-1), 0.4, colors.HexColor("#B0BEC5")),
                       ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
                       ("TOPPADDING",    (0,0),(-1,-1), 5),
                       ("BOTTOMPADDING", (0,0),(-1,-1), 5),
                       ("LEFTPADDING",   (0,0),(-1,-1), 6),
                   ]))
    story.append(i18n_t)
    story.append(sp(8))
    story.append(hr())

    # ════════════════════════════════════════════════════════════════════════
    # 4. ЗВЕДЕНА ТАБЛИЦЯ ЗМІНЕНИХ ФАЙЛІВ
    # ════════════════════════════════════════════════════════════════════════
    story.append(section_number_box("4", "Зведена таблиця змінених файлів"))
    story.append(sp(6))

    file_rows = [
        ("StepCounterService.java",    "ПЕРЕЗАПИС",
         "EXTRA_INITIAL_STEPS; currentSteps = delta + initialSteps; onTaskRemoved + AlarmManager; SharedPreferences"),
        ("ForegroundStepPlugin.java",  "ПЕРЕЗАПИС",
         "start(+initialSteps); getSteps() → {steps, running, sensorAvailable}; getBatteryOptStatus(); requestBatteryOpt()"),
        ("BootReceiver.java",          "НОВИЙ",
         "Відновлення сервісу після BOOT_COMPLETED / MY_PACKAGE_REPLACED зі збереженими initialSteps"),
        ("AndroidManifest.xml",        "ОНОВЛЕНО",
         "stopWithTask=false; <receiver .BootReceiver>; REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"),
        ("src/core/constants.js",      "ОНОВЛЕНО",
         "LINEAR_THRESHOLD 2.0→3.0; новий STEP_MIN_PEAK_SAMPLES=2"),
        ("src/core/platform.js",       "ОНОВЛЕНО",
         "startStepService(+initialSteps); getServiceStatus(); getBatteryOptStatus(); requestBatteryOptExemption()"),
        ("src/features/steps/index.js","ПЕРЕЗАПИС",
         "_peakSamples фільтр; initialSteps передається сервісу; onResume health-check; _checkBatteryOptOnce()"),
        ("src/i18n/ui.uk.js",          "ОНОВЛЕНО",
         "+2 ключі: st-service-restored, st-battery-opt"),
        ("src/i18n/ui.ru.js",          "ОНОВЛЕНО",
         "+2 ключі: st-service-restored, st-battery-opt"),
        ("tests/step-fixes.test.js",   "ПЕРЕЗАПИС",
         "Нові моки platform; fireRise() helper; оновлені тести під MIN_PEAK_SAMPLES=2; +1 новий тест"),
        ("tests/foreground-step.test.js","ОНОВЛЕНО",
         "Нові моки: getServiceStatus, getBatteryOptStatus, onResume; оновлені тести startStepService та restoreSteps"),
    ]
    story.append(file_table(file_rows))
    story.append(sp(8))
    story.append(hr())

    # ════════════════════════════════════════════════════════════════════════
    # 5. ТЕСТИ
    # ════════════════════════════════════════════════════════════════════════
    story.append(section_number_box("5", "Стан тестів"))
    story.append(sp(6))

    # Підсумок
    sum_data = [[
        Paragraph("До сесії", ST["TableHead"]),
        Paragraph("Нових", ST["TableHead"]),
        Paragraph("Разом", ST["TableHead"]),
        Paragraph("Файлів", ST["TableHead"]),
        Paragraph("Середовище", ST["TableHead"]),
        Paragraph("Час", ST["TableHead"]),
    ],[
        Paragraph("<b>472</b>", ParagraphStyle("X", fontName="Arial-Bold", fontSize=12,
                  textColor=C_NAVY, alignment=TA_CENTER)),
        Paragraph("<b>+3</b>",  ParagraphStyle("X", fontName="Arial-Bold", fontSize=12,
                  textColor=C_TEAL, alignment=TA_CENTER)),
        Paragraph("<b>475</b>", ParagraphStyle("X", fontName="Arial-Bold", fontSize=14,
                  textColor=C_GREEN, alignment=TA_CENTER)),
        Paragraph("<b>15</b>",  ParagraphStyle("X", fontName="Arial-Bold", fontSize=12,
                  textColor=C_NAVY, alignment=TA_CENTER)),
        Paragraph("vitest / node",  ST["TableCellC"]),
        Paragraph("~4 с",           ST["TableCellC"]),
    ]]
    sum_t = Table(sum_data, colWidths=[2.6*cm, 2*cm, 2.2*cm, 2*cm, 3.5*cm, 2*cm],
                  hAlign="LEFT",
                  style=TableStyle([
                      ("BACKGROUND",    (0,0),(-1,0), C_HEADER_BG),
                      ("BACKGROUND",    (0,1),(-1,1), C_STAT_BG),
                      ("GRID",          (0,0),(-1,-1), 0.4, colors.HexColor("#B0BEC5")),
                      ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
                      ("TOPPADDING",    (0,0),(-1,-1), 6),
                      ("BOTTOMPADDING", (0,0),(-1,-1), 6),
                  ]))
    story.append(sum_t)
    story.append(sp(8))

    story.append(h2("Нові та оновлені тест-файли у цій сесії"))
    test_rows = [
        ("tests/step-fixes.test.js",
         "13",
         "Fix1: _inPeak/_peakSamples reset; Fix2: gravity filter reset; Fix3: no-sensor toast; "
         "Fix4: MIN_PEAK_SAMPLES=2 (fireRise helper, interrupted-rise, debounce)"),
        ("tests/foreground-step.test.js",
         "34",
         "enableSteps/disableSteps/restoreSteps (оновлені моки getServiceStatus); "
         "startStepService з 4-м аргументом initialSteps; modal flow; updateStepUI"),
    ]
    story.append(test_table(test_rows))
    story.append(sp(6))
    story.append(note(
        "Усі 15 тест-файлів зелені. Тести запускаються в node-середовищі (без jsdom): "
        "DOM мокується через vi.spyOn(global, 'document', 'get'). "
        "vi.useFakeTimers({ now: new Date('2030-01-01') }) запобігає взаємному забрудненню "
        "debounce-стану між тестами."
    ))
    story.append(sp(8))
    story.append(hr())

    # ════════════════════════════════════════════════════════════════════════
    # 6. АРХІТЕКТУРА ПІСЛЯ ВИПРАВЛЕНЬ
    # ════════════════════════════════════════════════════════════════════════
    story.append(section_number_box("6", "Архітектура крокоміра після виправлень"))
    story.append(sp(6))

    story.append(h2("6.1  Потік синхронізації кроків (Баг #1 виправлено)"))
    sync_steps = [
        ("enableSteps('foreground')", "JS читає stepCount з БД (наприклад 450 кроків)"),
        ("startStepService(goal, ..., 450)", "initialSteps=450 передається у сервіс через Intent"),
        ("StepCounterService.onStartCommand()", "baselineSteps = перше значення TYPE_STEP_COUNTER"),
        ("Кожен крок сенсора", "currentSteps = (rawSteps − baseline) + 450 → трансляція"),
        ("BroadcastReceiver у JS", "stepCount = currentSteps (правильний денний підсумок)"),
        ("Сповіщення Android", "«HealthPro 🦶  кроки: 451/10 000» — збігається з UI"),
    ]
    sync_data = [[Paragraph("Крок", ST["TableHead"]), Paragraph("Що відбувається", ST["TableHead"])]]
    for i, (step, desc_) in enumerate(sync_steps):
        bg = C_LIGHT_BLUE if i % 2 == 0 else C_LIGHT_GREY
        sync_data.append([
            Paragraph(f"<b>{step}</b>", ST["TableCell"]),
            Paragraph(desc_, ST["TableCell"]),
        ])
    sync_t = Table(sync_data, colWidths=[5.5*cm, 10*cm],
                   style=TableStyle([
                       ("BACKGROUND",    (0,0),(-1,0), C_HEADER_BG),
                       ("ROWBACKGROUNDS",(0,1),(-1,-1), [C_LIGHT_BLUE, C_LIGHT_GREY]),
                       ("GRID",          (0,0),(-1,-1), 0.4, colors.HexColor("#B0BEC5")),
                       ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
                       ("TOPPADDING",    (0,0),(-1,-1), 5),
                       ("BOTTOMPADDING", (0,0),(-1,-1), 5),
                       ("LEFTPADDING",   (0,0),(-1,-1), 6),
                   ]))
    story.append(sync_t)
    story.append(sp(8))

    story.append(h2("6.2  Фільтр тапів (Баг #2 виправлено)"))
    story.append(body(
        "Новий алгоритм вимагає двох послідовних зразків вище порогу LINEAR_THRESHOLD=3.0 м/с² "
        "перед тим як оголосити пік (_inPeak=true). При ~50 Гц це мінімум ~40 мс. "
        "Реальні кроки дають пік тривалістю ≥80 мс, тапи по екрану — &lt;20 мс."
    ))
    filter_data = [
        [Paragraph("Параметр", ST["TableHead"]), Paragraph("Значення", ST["TableHead"]),
         Paragraph("Тапи", ST["TableHead"]), Paragraph("Кроки", ST["TableHead"])],
        [Paragraph("LINEAR_THRESHOLD",   ST["TableCell"]),
         Paragraph("3.0 м/с²",           ST["TableCellC"]),
         Paragraph("~2–4 м/с²",          ParagraphStyle("R", fontName="Arial", fontSize=8.5,
                   textColor=C_RED, alignment=TA_CENTER)),
         Paragraph("3–8 м/с²",           ParagraphStyle("G", fontName="Arial", fontSize=8.5,
                   textColor=C_GREEN, alignment=TA_CENTER))],
        [Paragraph("MIN_PEAK_SAMPLES",   ST["TableCell"]),
         Paragraph("2",                  ST["TableCellC"]),
         Paragraph("~1 зразок (&lt;20 мс)", ParagraphStyle("R", fontName="Arial", fontSize=8.5,
                   textColor=C_RED, alignment=TA_CENTER)),
         Paragraph("≥4 зразки (≥80 мс)", ParagraphStyle("G", fontName="Arial", fontSize=8.5,
                   textColor=C_GREEN, alignment=TA_CENTER))],
        [Paragraph("MIN_INTERVAL_MS",    ST["TableCell"]),
         Paragraph("250 мс",             ST["TableCellC"]),
         Paragraph("—",                  ST["TableCellC"]),
         Paragraph("max ~4 кроки/с",     ST["TableCellC"])],
    ]
    filter_t = Table(filter_data, colWidths=[4.5*cm, 2.5*cm, 4*cm, 4.5*cm],
                     style=TableStyle([
                         ("BACKGROUND",    (0,0),(-1,0), C_HEADER_BG),
                         ("ROWBACKGROUNDS",(0,1),(-1,-1), [C_LIGHT_BLUE, C_LIGHT_GREY]),
                         ("GRID",          (0,0),(-1,-1), 0.4, colors.HexColor("#B0BEC5")),
                         ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
                         ("TOPPADDING",    (0,0),(-1,-1), 5),
                         ("BOTTOMPADDING", (0,0),(-1,-1), 5),
                         ("LEFTPADDING",   (0,0),(-1,-1), 6),
                     ]))
    story.append(filter_t)
    story.append(sp(8))

    story.append(h2("6.3  Стійкість сервісу (Баг #3 виправлено)"))
    resilience_data = [
        [Paragraph("Сценарій", ST["TableHead"]), Paragraph("Захист", ST["TableHead"]),
         Paragraph("Результат", ST["TableHead"])],
        [Paragraph("Свайп з Recent Apps", ST["TableCell"]),
         Paragraph("stopWithTask=false + onTaskRemoved → AlarmManager 2 с", ST["TableCell"]),
         Paragraph("Перезапуск за 2 с", ParagraphStyle("G", fontName="Arial-Bold", fontSize=8.5,
                   textColor=C_GREEN))],
        [Paragraph("Android Doze / Samsung Deep Sleep", ST["TableCell"]),
         Paragraph("START_STICKY + onResume health-check у JS", ST["TableCell"]),
         Paragraph("Тихий перезапуск при поверненні", ParagraphStyle("G", fontName="Arial-Bold",
                   fontSize=8.5, textColor=C_GREEN))],
        [Paragraph("Перезавантаження пристрою", ST["TableCell"]),
         Paragraph("BootReceiver (BOOT_COMPLETED) + SharedPreferences initialSteps", ST["TableCell"]),
         Paragraph("Автоматичний старт без дії користувача", ParagraphStyle("G", fontName="Arial-Bold",
                   fontSize=8.5, textColor=C_GREEN))],
        [Paragraph("Оновлення додатку", ST["TableCell"]),
         Paragraph("BootReceiver (MY_PACKAGE_REPLACED)", ST["TableCell"]),
         Paragraph("Відновлення з тими ж кроками", ParagraphStyle("G", fontName="Arial-Bold",
                   fontSize=8.5, textColor=C_GREEN))],
        [Paragraph("Батарея обмежена (Samsung Max Power)", ST["TableCell"]),
         Paragraph("requestBatteryOptExemption() — одноразовий системний діалог", ST["TableCell"]),
         Paragraph("Користувач дозволяє Unrestricted", ParagraphStyle("G", fontName="Arial-Bold",
                   fontSize=8.5, textColor=C_GREEN))],
    ]
    res_t = Table(resilience_data, colWidths=[4*cm, 6.5*cm, 5*cm],
                  style=TableStyle([
                      ("BACKGROUND",    (0,0),(-1,0), C_HEADER_BG),
                      ("ROWBACKGROUNDS",(0,1),(-1,-1), [C_LIGHT_BLUE, C_LIGHT_GREY]),
                      ("GRID",          (0,0),(-1,-1), 0.4, colors.HexColor("#B0BEC5")),
                      ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
                      ("TOPPADDING",    (0,0),(-1,-1), 5),
                      ("BOTTOMPADDING", (0,0),(-1,-1), 5),
                      ("LEFTPADDING",   (0,0),(-1,-1), 6),
                  ]))
    story.append(res_t)
    story.append(sp(8))
    story.append(hr())

    # ════════════════════════════════════════════════════════════════════════
    # 7. НАСТУПНІ КРОКИ
    # ════════════════════════════════════════════════════════════════════════
    story.append(section_number_box("7", "Наступні кроки для Android-деплою"))
    story.append(sp(6))

    deploy_data = [
        [Paragraph("Крок", ST["TableHead"]), Paragraph("Команда / дія", ST["TableHead"]),
         Paragraph("Примітка", ST["TableHead"])],
        [Paragraph("1. Синхронізація", ST["TableCell"]),
         Paragraph("npx cap sync android", ST["Code"]),
         Paragraph("Синхронізує JS-активи і Java-плагіни", ST["TableCell"])],
        [Paragraph("2. Збірка APK", ST["TableCell"]),
         Paragraph("npx cap build android  або Android Studio", ST["Code"]),
         Paragraph("minSdkVersion ≥ 21 обов'язково", ST["TableCell"])],
        [Paragraph("3. Перевірка іконки", ST["TableCell"]),
         Paragraph("res/drawable/ic_stat_notification", ST["Code"]),
         Paragraph("Потрібна для сповіщення FG-сервісу", ST["TableCell"])],
        [Paragraph("4. Тест Doze", ST["TableCell"]),
         Paragraph("adb shell dumpsys deviceidle force-idle", ST["Code"]),
         Paragraph("Перевіряє виживання сервісу в режимі глибокого сну", ST["TableCell"])],
        [Paragraph("5. Тест Samsung", ST["TableCell"]),
         Paragraph("Налаштування → Батарея → HealthPro → Без обмежень", ST["Code"]),
         Paragraph("Вимкнути оптимізацію вручну якщо діалог не з'явився", ST["TableCell"])],
        [Paragraph("6. Тест перезавантаження", ST["TableCell"]),
         Paragraph("adb reboot  →  перевірити сповіщення після старту", ST["Code"]),
         Paragraph("BootReceiver має відновити сервіс автоматично", ST["TableCell"])],
    ]
    dep_t = Table(deploy_data, colWidths=[3.5*cm, 6*cm, 6*cm],
                  style=TableStyle([
                      ("BACKGROUND",    (0,0),(-1,0), C_HEADER_BG),
                      ("ROWBACKGROUNDS",(0,1),(-1,-1), [C_LIGHT_BLUE, C_LIGHT_GREY]),
                      ("GRID",          (0,0),(-1,-1), 0.4, colors.HexColor("#B0BEC5")),
                      ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
                      ("TOPPADDING",    (0,0),(-1,-1), 5),
                      ("BOTTOMPADDING", (0,0),(-1,-1), 5),
                      ("LEFTPADDING",   (0,0),(-1,-1), 6),
                  ]))
    story.append(dep_t)
    story.append(sp(10))
    story.append(hr())

    # ── Підвал ──
    story.append(sp(4))
    story.append(Paragraph(
        "HealthPro — Моє Здоров'я  ·  Звіт: Рефакторинг крокоміра (Баги #1 #2 #3)  ·  "
        f"Згенеровано автоматично Replit Agent  ·  {datetime.date.today().strftime('%d.%m.%Y')}",
        ST["Footer"]
    ))

    return story


# ── Колонтитул ────────────────────────────────────────────────────────────────

def on_page(canvas, doc):
    canvas.saveState()
    # Верхня лінія (крім першої сторінки де є header)
    if doc.page > 1:
        canvas.setFillColor(C_NAVY)
        canvas.setFont("Arial-Bold", 8)
        canvas.drawString(2*cm, H - 1.4*cm, "HealthPro — Моє Здоров'я")
        canvas.setFillColor(colors.HexColor("#9E9E9E"))
        canvas.setFont("Arial", 8)
        canvas.drawRightString(W - 2*cm, H - 1.4*cm, f"Рефакторинг крокоміра · стор. {doc.page}")
        canvas.setStrokeColor(C_DIVIDER)
        canvas.setLineWidth(0.5)
        canvas.line(2*cm, H - 1.6*cm, W - 2*cm, H - 1.6*cm)
    canvas.restoreState()


# ── Точка входу ──────────────────────────────────────────────────────────────

OUT = "HealthPro_Pedometer_BugFix_Report.pdf"

doc = SimpleDocTemplate(
    OUT,
    pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2*cm,  bottomMargin=2*cm,
    title="HealthPro — Рефакторинг крокоміра",
    author="Replit Agent",
    subject="Звіт сесії розробки",
)

doc.build(build_story(), onFirstPage=on_page, onLaterPages=on_page)
print(f"PDF готовий: {OUT}")
