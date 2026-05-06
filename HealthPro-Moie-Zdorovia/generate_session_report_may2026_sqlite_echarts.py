#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HealthPro — Моє Здоров'я
Звіт сесії: SQLite схема v2 · ECharts · ІЗ-тренд (Травень 2026)
Документація українською. Шрифти: DejaVu Sans (кирилиця).
"""

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
import datetime, os

# ── Шрифти DejaVu Sans ───────────────────────────────────────────────────────
DEJAVU = "/usr/share/fonts/truetype/dejavu"
pdfmetrics.registerFont(TTFont("Arial",        f"{DEJAVU}/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold",   f"{DEJAVU}/DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", f"{DEJAVU}/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Mono",   f"{DEJAVU}/DejaVuSansMono.ttf"))

# ── Кольори ───────────────────────────────────────────────────────────────────
C_NAVY   = colors.HexColor("#0D1630")
C_ACCENT = colors.HexColor("#1A3A6E")
C_BLUE   = colors.HexColor("#1E40AF")
C_CYAN   = colors.HexColor("#0E7490")
C_TEAL   = colors.HexColor("#065F46")
C_ORANGE = colors.HexColor("#9A3412")
C_ROW_A  = colors.HexColor("#EFF6FF")
C_ROW_B  = colors.HexColor("#F8FAFC")
C_BORDER = colors.HexColor("#CBD5E1")
C_LIGHT  = colors.HexColor("#E0F2FE")
C_HEADER = colors.HexColor("#1E3A6E")

W, H = A4

# ── Стилі ─────────────────────────────────────────────────────────────────────
def S(name, **kw): return ParagraphStyle(name, **kw)

ST = {
  "Title":  S("Title",  fontName="Arial-Bold",  fontSize=24, textColor=colors.white,
                        alignment=TA_CENTER, leading=30, spaceAfter=2),
  "Sub":    S("Sub",    fontName="Arial",        fontSize=12, textColor=colors.HexColor("#BAD0F5"),
                        alignment=TA_CENTER, leading=16, spaceAfter=2),
  "Date":   S("Date",   fontName="Arial-Italic", fontSize=9,  textColor=colors.HexColor("#94A3B8"),
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

def sp(h=6):  return Spacer(1, h)
def hr():     return HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=6, spaceBefore=4)
def body(t):  return Paragraph(t, ST["Body"])
def h1(t):    return Paragraph(f"<b>{t}</b>", ST["H1"])
def h2(t):    return Paragraph(f"<b>{t}</b>", ST["H2"])
def h3(t):    return Paragraph(f"<b>{t}</b>", ST["H3"])
def bullet(t, sub=False): return Paragraph(f"• {t}", ST["Sub2" if sub else "Bullet"])
def code(t):  return Paragraph(t, ST["Code"])
def note(t):  return Paragraph(f"<i>{t}</i>", ST["Note"])

# ── Обкладинка ────────────────────────────────────────────────────────────────
def cover():
    today = datetime.date.today()
    m = {1:"січня",2:"лютого",3:"березня",4:"квітня",5:"травня",
         6:"червня",7:"липня",8:"серпня",9:"вересня",
         10:"жовтня",11:"листопада",12:"грудня"}
    ds = f"{today.day} {m[today.month]} {today.year} р."
    rows = [
        [Paragraph("HealthPro · Моє Здоров'я", ST["Title"])],
        [Paragraph("Звіт сесії: SQLite Схема v2 · ECharts Tree-Shaking · ІЗ-Тренд", ST["Sub"])],
        [Paragraph(ds, ST["Date"])],
    ]
    return Table(rows, colWidths=[W - 4*cm],
        style=TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), C_NAVY),
            ("TOPPADDING",    (0,0),(0,0), 20),
            ("BOTTOMPADDING", (0,0),(0,0), 4),
            ("TOPPADDING",    (0,1),(0,1), 0),
            ("BOTTOMPADDING", (0,1),(0,1), 4),
            ("TOPPADDING",    (0,2),(0,2), 0),
            ("BOTTOMPADDING", (0,2),(0,2), 18),
        ]))

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

def stats_row():
    cells = [
        stat_cell("3",      "Модулі реалізовано",  "SQLite·db.js·ECharts"),
        stat_cell("12",     "Файлів оновлено",      "JS·HTML·config·i18n"),
        stat_cell("v2",     "Схема БД SQLite",      "5 реляційних таблиць"),
        stat_cell("0",      "Помилок у консолі",    "build ✓ · dev ✓"),
    ]
    return Table([cells], colWidths=[3.7*cm]*4, hAlign="CENTER",
        style=TableStyle([("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4)]))

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

def file_table(rows):
    SC = {"НОВИЙ": colors.HexColor("#065F46"),
          "ОНОВЛЕНО": colors.HexColor("#1D4ED8"),
          "ПЕРЕЗАПИС": colors.HexColor("#92400E")}
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

def proposal_table(rows):
    head = [Paragraph("Вкладка / Функція", ST["TH"]),
            Paragraph("Пропозиція", ST["TH"]),
            Paragraph("Пріоритет", ST["TH"])]
    data = [head]
    PC = {"Високий": colors.HexColor("#B91C1C"),
          "Середній": colors.HexColor("#B45309"),
          "Низький": colors.HexColor("#065F46")}
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

# ── Основний зміст ────────────────────────────────────────────────────────────
def build_story():
    s = []

    s += [cover(), sp(12), stats_row(), sp(14), hr()]

    # ═══ 1. SQLite схема v2 ═══════════════════════════════════════════════════
    s.append(section_box("1", "Реляційна SQLite-схема v2 — перехід від JSON-blob"))
    s.append(sp(6))
    s.append(body(
        "Ключова архітектурна зміна сесії: відмова від зберігання даних здоров'я у вигляді "
        "JSON-масивів в одній KV-таблиці на користь нормалізованої реляційної схеми. "
        "Це відкриває повноцінні SQL-запити, тренди по датах, кореляційний аналіз та "
        "ефективну аналітику без завантаження всього масиву в пам'ять."
    ))
    s.append(sp(4))

    s.append(h2("1.1  Схема таблиць SQLite v2"))
    s.append(arch_table([
        ("measurements",   "id, sys, dia, pulse, note, ts (мс), created_at — кожен вимір тиску/пульсу окремим рядком"),
        ("medications",    "id, name, dose, time, days, date, created_at — картки призначень ліків"),
        ("med_taken",      "med_id, date (YYYY-MM-DD), taken (0/1) — журнал прийому ліків"),
        ("steps_log",      "date (PK), steps, goal, updated_at — денні підсумки кроків"),
        ("kv_state",       "k, v, updated_at — settings, theme, lang та інші KV-пари"),
    ]))
    s.append(sp(8))

    s.append(h2("1.2  Міграція v1 → v2 (автоматична)"))
    s.append(body(
        "При першому запуску нової версії виконується одноразова міграція: "
        "JSON-масиви з kv_state (ключі 'measurements', 'pills', 'pillsTaken', 'steps') "
        "розкладаються по реляційних таблицях. Міграція ідемпотентна — безпечно "
        "перезапускати. Реалізована у <b>sqlite.js → migrateV1toV2()</b>, "
        "викликається з <b>storage.js → bootstrapStorage()</b>."
    ))
    s.append(sp(4))

    s.append(h2("1.3  Write-through у feature-модулях"))
    s.append(KeepTogether([
        bullet("<b>pressure/index.js</b> → після кожного збереження виміру: "
               "<code>db.insertMeasurement(m)</code> → таблиця measurements"),
        bullet("<b>meds/index.js</b> → <code>db.saveMedication(p)</code>, "
               "<code>db.removeMedication(id)</code>, <code>db.saveMedTaken(id,date,taken)</code>"),
        bullet("<b>steps/index.js</b> → хелпер <code>_persistSteps(count)</code>: "
               "DB.set (localStorage mirror) + <code>dbSaveStep()</code> → steps_log"),
        note("Читання при старті — з localStorage (швидко). SQLite — для аналітики та звітів."),
    ]))
    s.append(sp(8))

    s.append(h2("1.4  Уніфікований API db.js (без циклічних залежностей)"))
    s.append(body(
        "Новий модуль <b>src/core/db.js</b> — єдина точка входу для всіх запитів. "
        "На Android/Native: повноцінний SQLite. На Web/PWA: in-memory fallback через state. "
        "Модуль <b>не імпортує state.js напряму</b> — посилання передається через "
        "<code>_setStateRef(state)</code> з app.js після ініціалізації."
    ))
    s.append(sp(4))
    s.append(arch_table([
        ("queryMeasurements()",        "Виміри за діапазон дат (days/from/to), ліміт, порядок"),
        ("calcHealthIndexTrend()",     "Добовий avg sys/dia/pulse згрупований по датах → для графіку ІЗ"),
        ("countByBPCategory()",        "Розподіл по 6 категоріях ВООЗ (optimal→grade3)"),
        ("queryStepLog()",             "Денні підсумки кроків за діапазон"),
        ("queryStepPressureCorrelation()", "JOIN steps_log × measurements по даті → scatter дані"),
        ("calcAdherence()",            "Відсоток прийому ліків за 30 днів"),
        ("insertMeasurement(m)",       "Write-through: один вимір → measurements"),
        ("saveMedication(p)",          "Upsert картки ліків → medications"),
        ("saveMedTaken(id,date,taken)","Статус прийому → med_taken"),
        ("saveStepLog({date,steps})",  "Денний підсумок → steps_log + localStorage"),
    ]))
    s.append(sp(6))

    s.append(h2("Змінені файли"))
    s.append(file_table([
        ("src/core/sqlite.js",           "ПЕРЕЗАПИС",
         "Нова схема v2: DDL всіх 5 таблиць, CRUD-методи, migrateV1toV2() — "
         "розкладає JSON-масиви з kv_state по реляційних таблицях"),
        ("src/core/db.js",               "НОВИЙ",
         "Уніфікований query/write API: SQLite на нативі, in-memory fallback на вебі. "
         "Без циклічних залежностей — state через _setStateRef()"),
        ("src/core/storage.js",          "ОНОВЛЕНО",
         "bootstrapStorage() викликає sql.migrateV1toV2() — одноразова міграція при старті"),
        ("src/app.js",                   "ОНОВЛЕНО",
         "Після init(): _setStateRef(state) → db.js отримує посилання на стан"),
        ("src/features/pressure/index.js","ОНОВЛЕНО",
         "Write-through: db.insertMeasurement(m) після кожного saveMeasurement()"),
        ("src/features/meds/index.js",   "ОНОВЛЕНО",
         "Write-through: db.saveMedication, removeMedication, saveMedTaken"),
        ("src/features/steps/index.js",  "ОНОВЛЕНО",
         "Хелпер _persistSteps(count): DB.set (LS mirror) + dbSaveStep(). "
         "Всі 12 викликів DB.set('stepCount-…') замінено на _persistSteps()"),
    ]))
    s += [sp(8), hr()]

    # ═══ 2. ECharts + ІЗ-тренд ════════════════════════════════════════════════
    s.append(section_box("2", "ECharts Tree-Shaking · ІЗ-тренд · Модальний графік тиску"))
    s.append(sp(6))
    s.append(body(
        "Інтеграція бібліотеки ECharts з обов'язковим tree-shaking — підключаються "
        "лише необхідні компоненти. SVGRenderer обраний для лінійних графіків: "
        "чіткість на будь-якому DPI, відсутність растеризації, підтримка HiDPI-дисплеїв. "
        "Vite manualChunks виносить ECharts в окремий chunk для паралельного завантаження "
        "та незалежного кешування браузером."
    ))
    s.append(sp(4))

    s.append(h2("2.1  ECharts factory (src/core/charts.js)"))
    s.append(code(
        "import { init, use } from 'echarts/core';<br/>"
        "import { LineChart, BarChart, ScatterChart } from 'echarts/charts';<br/>"
        "import { GridComponent, TooltipComponent, LegendComponent,<br/>"
        "  MarkLineComponent, MarkAreaComponent, DataZoomComponent } from 'echarts/components';<br/>"
        "import { SVGRenderer, CanvasRenderer } from 'echarts/renderers';<br/>"
        "use([LineChart, BarChart, ScatterChart, GridComponent, ...]);<br/>"
        "<br/>"
        "const _instances = new WeakMap(); // не витікає при переходах між сторінками<br/>"
        "export function createChart(el, renderer='svg') { ... }<br/>"
        "export function disposeChart(el) { ... } // звільнення при закритті"
    ))
    s.append(sp(6))

    s.append(h2("2.2  Графік ІЗ-тренду (iz-chart.js) — вкладка Аналіз"))
    s.append(body(
        "Новий блок на сторінці «Аналіз» — лінійний графік Індексу Здоров'я за 30 днів. "
        "Дані: <code>db.calcHealthIndexTrend(30)</code> → добові avg sys/dia/pulse. "
        "Для кожного дня обчислюється спрощений добовий ІЗ-скор (0–100) на основі "
        "BP-компонента (0–40 балів) та Pulse-компонента (0–20 балів)."
    ))
    s.append(sp(4))
    s.append(KeepTogether([
        bullet("<b>SVGRenderer</b> — чіткість на HiDPI, кешується браузером"),
        bullet("<b>Кольорові точки</b>: зелений ≥ 80, жовтий ≥ 60, червоний < 60"),
        bullet("<b>MarkLine</b> на позначках 60 та 80 — візуальне зонування якості"),
        bullet("<b>Area fill</b>: синій градієнт під лінією 22% → 2% opacity"),
        bullet("<b>Tooltip</b>: дата, ІЗ-бал з кольором, sys/dia, пульс"),
        bullet("<b>Empty state</b>: повідомлення «Додайте 3+ виміри» замість порожнього блоку"),
        bullet("<b>disposeIZChart()</b>: правильне звільнення при переходах"),
    ]))
    s.append(sp(6))

    s.append(h2("2.3  Оновлений модальний графік тиску (trend-modal.js)"))
    s.append(body(
        "Старий raw Canvas2D у модальному вікні «Тенденція тиску» "
        "повністю замінено на ECharts LineChart. Переваги: "
        "інтерактивний tooltip з назвою категорії ВООЗ, smooth-криві, "
        "кращий вигляд на мобільних. Екземпляр знищується при закритті модалу "
        "через <code>disposeChart(el)</code>."
    ))
    s.append(sp(4))
    s.append(KeepTogether([
        bullet("<b>Дві лінії</b>: sys (червона) + dia (синя), smooth: 0.2"),
        bullet("<b>Tooltip</b>: дата · Сис/Діас · категорія ВООЗ з кольором"),
        bullet("<b>disposeChart()</b> при closeTrendModal() — не тримає пам'ять"),
        bullet("<b>el.style.height = '180px'</b> — явна висота перед init() (обов'язково для ECharts)"),
    ]))
    s.append(sp(6))

    s.append(h2("2.4  Vite manualChunks — розділення бандлу"))
    s.append(body(
        "ECharts та zrender винесені в окремий chunk через <code>build.rollupOptions.output.manualChunks</code>. "
        "Результат збірки:"
    ))
    s.append(arch_table([
        ("echarts-….js",  "613 кБ (205 кБ gzip) — окремий chunk, кешується незалежно"),
        ("index-….js",   "1 049 кБ (461 кБ gzip) — основний бандл (раніше: 1 663 кБ єдиним файлом)"),
        ("index.es-….js","150 кБ (51 кБ gzip) — Capacitor SQLite"),
    ]))
    s.append(note("Паралельне завантаження двох chunk-файлів + незалежний кеш ECharts = швидший повторний старт."))
    s.append(sp(6))

    s.append(h2("Змінені файли"))
    s.append(file_table([
        ("src/core/charts.js",                  "НОВИЙ",
         "ECharts factory: tree-shaking use([...]), WeakMap інстансів, "
         "createChart(el, renderer), disposeChart(el), COLORS-константи"),
        ("src/features/analytics/iz-chart.js",  "НОВИЙ",
         "ІЗ-тренд: calcHealthIndexTrend(30) → добовий скор → ECharts LineChart + SVGRenderer. "
         "scoreBPDay(), scorePulseDay(), markLine на 60/80, кольорові точки"),
        ("src/features/analytics/trend-modal.js","ПЕРЕЗАПИС",
         "Модальний графік тиску: raw Canvas2D → ECharts (sys+dia лінії, "
         "ВООЗ-tooltip, disposeChart при закритті)"),
        ("src/features/analytics/index.js",     "ОНОВЛЕНО",
         "Імпорт renderIZChart, виклик наприкінці renderAnalytics(). "
         "Новий реекспорт renderIZChart, disposeIZChart"),
        ("index.html",                           "ОНОВЛЕНО",
         "Нова card-секція з <div id='izTrendChart'> після score-breakdown. "
         "<canvas id='trendChart'> → <div> (ECharts потребує div, не canvas)"),
        ("src/i18n/ui.uk.js",                   "ОНОВЛЕНО",
         "Новий ключ 't-iz-trend-title': 'Тренд Індексу Здоров'я (30 днів)'"),
        ("src/i18n/ui.ru.js",                   "ОНОВЛЕНО",
         "Новий ключ 't-iz-trend-title': 'Тренд Индекса Здоровья (30 дней)'"),
        ("vite.config.js",                       "ОНОВЛЕНО",
         "build.rollupOptions.output.manualChunks: echarts+zrender → 'echarts' chunk"),
        ("package.json",                         "ОНОВЛЕНО",
         "Нова залежність: echarts (tree-shaking сумісна версія)"),
    ]))
    s += [sp(8), hr()]

    # ═══ 3. Архітектурний підсумок ════════════════════════════════════════════
    s.append(section_box("3", "Архітектурний підсумок та принципи"))
    s.append(sp(6))
    s.append(h2("3.1  Ключові архітектурні рішення"))
    s.append(arch_table([
        ("No circular deps",     "db.js НЕ імпортує state.js. Посилання через _setStateRef() з app.js — "
                                 "ідіома «lazy injection» для уникнення циклу state → storage → db → state"),
        ("Write-through pattern","Feature-модулі пишуть у реляційні таблиці одразу після запису в state. "
                                 "SQLite = джерело правди для аналітики. LS = кеш для швидкого старту"),
        ("In-memory fallback",   "db.js на вебі/PWA читає state in-memory. На Android — SQLite. "
                                 "Один API для обох платформ"),
        ("WeakMap chart registry","ECharts інстанси зберігаються у WeakMap(DOM→chart). "
                                  "При видаленні DOM браузер автоматично прибирає запис — без витоків"),
        ("SVG > Canvas для ІЗ",  "SVGRenderer для графіків зі малим датасетом (<100 точок): "
                                  "чіткість на HiDPI, кращий accessibility, менше JS-навантаження"),
        ("manualChunks",         "ECharts (~600 кБ) в окремому chunk — браузер кешує між сесіями "
                                  "незалежно від змін у логіці додатку"),
    ]))
    s.append(sp(6))

    s.append(h2("3.2  Стан бази даних після сесії"))
    s.append(arch_table([
        ("measurements",  "Write-through активний. Нові виміри відразу у SQLite."),
        ("medications",   "Write-through активний. CRUD повністю через db.js."),
        ("med_taken",     "Write-through активний. setMedTaken per day."),
        ("steps_log",     "_persistSteps() — LS mirror + SQLite upsert. 12/12 викликів замінено."),
        ("kv_state",      "settings, theme, lang, normalSys/Dia/Pulse залишаються тут."),
        ("Міграція v1→v2","Автоматична при старті, ідемпотентна. JSON-масиви → таблиці."),
    ]))
    s += [sp(8), hr()]

    # ═══ 4. Наступні кроки ════════════════════════════════════════════════════
    s.append(section_box("4", "Пропозиції для наступної сесії"))
    s.append(sp(6))
    s.append(proposal_table([
        ("Аналіз",     "ScatterChart «Кроки ↔ Тиск» — кореляційний графік по днях. "
                       "Дані готові: db.queryStepPressureCorrelation(). "
                       "Регресійна лінія тренду поверх точок",          "Високий"),
        ("Аналіз",     "BarChart «Розподіл по зонах ВООЗ» — 6 категорій (optimal → grade3). "
                       "db.countByBPCategory() вже реалізовано",         "Високий"),
        ("Аналіз",     "Adherence-трекер: лінійний графік прийому ліків за 30 днів "
                       "(db.calcAdherence() готово)",                    "Середній"),
        ("Журнал",     "Фільтр журналу за датою/діапазоном. "
                       "queryMeasurements({from, to}) підтримується",    "Високий"),
        ("Виміри",     "Нотатки до вимірювань — поле note у таблиці measurements є, "
                       "потрібно UI для введення та відображення",        "Середній"),
        ("Ліки",       "Повторення розкладу: weekly/daily/custom days. "
                       "Поле days у medications є, потрібна логіка UI",   "Середній"),
        ("Безпека",    "Блокування PIN/біометрія при відкритті додатку",  "Низький"),
        ("Профіль",    "Вкладки «Вага» та «Сон» — нові таблиці + трекери", "Низький"),
        ("Звіти",      "PDF-звіт для лікаря з ECharts-графіками "
                       "(SVG → PDF через reportlab SVG import)",          "Середній"),
    ]))
    s += [sp(8), hr()]

    # Підпис
    s.append(Paragraph(
        f"Звіт згенеровано автоматично · HealthPro v5.0.0 · "
        f"{datetime.datetime.now().strftime('%d.%m.%Y %H:%M')}",
        ST["Footer"]
    ))
    return s

# ── Генерація PDF ──────────────────────────────────────────────────────────────
OUT = os.path.join(os.path.dirname(__file__),
                   "HealthPro_Session_May2026_SQLite_ECharts.pdf")

doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=1.8*cm, bottomMargin=1.8*cm,
    title="HealthPro · Звіт сесії — SQLite v2 · ECharts",
    author="HealthPro Agent",
)
doc.build(build_story())
print(f"✓ PDF збережено: {OUT}")
