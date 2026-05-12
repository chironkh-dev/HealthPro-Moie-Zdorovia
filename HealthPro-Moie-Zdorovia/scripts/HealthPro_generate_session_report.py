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
VERSION     = "5.3.16"               # версія застосунку
DESCRIPTION = "CI_Fix_Tests_APK"    # коротке уточнення теми сесії (без пробілів)
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
        stat_cell("7",  "Файлів змінено",         "CI · Vite · Vitest · package.json"),
        stat_cell("1",  "Новий файл",              "tests/mocks/charts.js (stub)"),
        stat_cell("2",  "CI-пайплайни виправлено", "ci.yml (тести) + android-apk.yml (APK)"),
        stat_cell("513","Тестів проходить",         "16/16 файлів ✓ локально"),
    ]), sp(14), hr()]

    # ═══ 1. Проблема: navigator is not defined ═══════════════════════════════
    s.append(section_box("1", "Причина падіння 8/16 тестів на CI"))
    s.append(sp(6))
    s.append(body(
        "GitHub CI використовував Node 20.20.2 (LTS). У Node до версії 22 глобальна "
        "змінна navigator (Web API) відсутня. При запуску тестів Vitest імпортує "
        "src/core/charts.js, який статично імпортує echarts/core, який транзитивно "
        "завантажує zrender/lib/core/env.js. Рядок 43 цього файлу: "
        "navigator.userAgent — ReferenceError: navigator is not defined."
    ))
    s.append(sp(4))
    s.append(h2("Транзитивний ланцюжок імпортів (для аналітичних тестів)"))
    s.append(code(
        "health-score.test.js  →  analytics/health-score.js"
        "  →  features/steps/index.js  →  src/core/charts.js"
        "  →  echarts/core  →  zrender/lib/core/env.js:43  →  navigator  →  CRASH"
    ))
    s.append(sp(4))
    s.append(body(
        "8 тестових файлів падали з цією помилкою на CI, при цьому локально "
        "513/513 — тому що Node 24 (Replit/локально) має navigator як глобальний. "
        "Жоден із цих 8 тестів не тестує графіки — вони тестують чисту логіку "
        "(health score, BMI, pills, BP thresholds, step counters). "
        "Проблема — архітектурна: логічні модулі тягнуть browser-залежний charts.js "
        "через ланцюжок steps/index.js."
    ))
    s.append(sp(4))
    s.append(h2("Список файлів що падали"))
    for f in [
        "health-score.test.js", "bmi-score.test.js", "veto-boundary.test.js",
        "pills-score.test.js", "health-score-i18n.test.js", "bp-pulse-thresholds.test.js",
        "foreground-step.test.js", "step-fixes.test.js",
    ]:
        s.append(bullet(f))
    s += [sp(8), hr()]

    # ═══ 2. Виправлення: тести ══════════════════════════════════════════════
    s.append(section_box("2", "Три рівні захисту — виправлення тестів"))
    s.append(sp(6))

    s.append(h2("Рівень 1: Node 20 → 22 (ci.yml)"))
    s.append(body(
        "node-version: '20' змінено на '22'. Node 22 є LTS з жовтня 2024, "
        "GitHub вже надсилав deprecation warnings для Node 20. "
        "Node 22 містить navigator як глобальний (Web API compatibility). "
        "Це найшвидший фікс, але не архітектурно достатній — "
        "наступна мажорна версія Node може знову прибрати цей глобал."
    ))
    s.append(sp(4))

    s.append(h2("Рівень 2: Глобальний alias charts.js у vitest.config.js"))
    s.append(body(
        "У vitest.config.js додано resolve.alias з regex find: "
        "/\\/src\\/core\\/charts\\.js$/ → replacement: tests/mocks/charts.js. "
        "Vite при regex-алiасі матчить проти абсолютного resolved-шляху модуля. "
        "Це перехоплює будь-який імпорт charts.js незалежно від глибини відносного шляху. "
        "Ефект: ЖОДЕН тестовий файл не потребує змін — alias діє глобально."
    ))
    s.append(code(
        "resolve: { alias: [ {"
        "  find: /\\/src\\/core\\/charts\\.js$/,"
        "  replacement: resolve(__dirname, 'tests/mocks/charts.js')"
        "} ] }"
    ))
    s.append(sp(4))

    s.append(h2("Рівень 3: navigator stub у tests/setup.js"))
    s.append(body(
        "До наявного setup.js (localStorage/window/document stubs) додано: "
        "if (typeof globalThis.navigator === 'undefined') "
        "{ globalThis.navigator = { userAgent: 'node' }; }. "
        "Страховка: якщо alias не перехопить інший browser-залежний модуль, "
        "navigator буде доступний. Незалежний від версії Node."
    ))
    s.append(sp(4))

    s.append(h2("Новий файл: tests/mocks/charts.js"))
    s.append(body(
        "Повний стаб charts.js. Повторює весь публічний API: "
        "createChart() → null, disposeChart() → void, resizeAllCharts() → void, "
        "COLORS (об'єкт з усіма кольорами). Без жодного рядка ECharts/zrender. "
        "Виконується миттєво, без browser-globals."
    ))
    s.append(sp(4))

    s.append(file_table([
        (".github/workflows/ci.yml",         "ОНОВЛЕНО",
         "node-version: '20' → '22'. Усуває deprecation warning і navigator відсутність."),
        ("tests/mocks/charts.js",             "НОВИЙ",
         "Стаб charts.js: createChart/disposeChart/resizeAllCharts/COLORS без browser globals."),
        ("vitest.config.js",                  "ПЕРЕЗАПИС",
         "Додано resolve.alias з regex /\\/src\\/core\\/charts\\.js$/ → mock. "
         "Глобально замінює charts.js для всіх тестів."),
        ("tests/setup.js",                    "ОНОВЛЕНО",
         "+navigator stub: if (typeof globalThis.navigator === 'undefined') { ... }"),
    ]))
    s += [sp(8), hr()]

    # ═══ 3. Виправлення: APK збірка ════════════════════════════════════════
    s.append(section_box("3", "Виправлення збірки Android APK"))
    s.append(sp(6))
    s.append(body(
        "android-apk.yml встановлював platforms;android-35, але android/variables.gradle "
        "оголошує compileSdkVersion = 36 та targetSdkVersion = 36 (Android 16, API 36). "
        "AGP 8.13.0 вимагає наявності SDK платформи що відповідає compileSdkVersion. "
        "При відсутності SDK 36 Gradle завершується помилкою: "
        "Failed to find target with hash string 'android-36'."
    ))
    s.append(sp(4))
    s.append(h2("Виправлення"))
    s.append(bullet("platforms;android-35 → platforms;android-36 (відповідає variables.gradle)"))
    s.append(bullet("build-tools;35.0.0 залишається — сумісний з SDK 36, гарантовано доступний"))
    s.append(bullet("Node вже був оновлений до 22 у попередній версії android-apk.yml"))
    s.append(sp(4))
    s.append(file_table([
        (".github/workflows/android-apk.yml", "ОНОВЛЕНО",
         "packages: '...platforms;android-35...' → '...platforms;android-36...'"),
    ]))
    s += [sp(8), hr()]

    # ═══ 4. Додаткові виправлення ═══════════════════════════════════════════
    s.append(section_box("4", "Додаткові виправлення якості коду"))
    s.append(sp(6))

    s.append(h2("vite.config.js — видалено конфліктуючу секцію test"))
    s.append(body(
        "vite.config.js містив: test: { environment: 'jsdom' }. "
        "Авторитетна конфігурація тестів — vitest.config.js (environment: 'node'). "
        "Дублюючий test-блок у vite.config.js створював потенційний конфлікт "
        "при визначенні середовища тестів. Видалено повністю — "
        "vite.config.js тепер чисто конфігурація Vite (dev/build/preview)."
    ))
    s.append(sp(6))

    s.append(h2("Root package.json — синхронізація та очищення"))
    s.append(body(
        "Capacitor-root ~/workspace/package.json відставав від фактичного стану:"
    ))
    s.append(bullet("version: 5.2.0 → 5.3.16 (відповідає inner package.json)"))
    s.append(bullet("Видалено jspdf: ^4.2.1 — не потрібен для cap sync android, "
                    "конфліктував з inner (jspdf 2.5.2)"))
    s.append(bullet("Видалено @capacitor/motion — відсутній у inner package.json"))
    s.append(bullet("Видалено jsdom, vitest — тести запускаються лише з inner"))
    s.append(bullet("npm install у ~/workspace/ — оновлено root package-lock.json"))
    s.append(sp(4))

    s.append(file_table([
        ("HealthPro-Moie-Zdorovia/vite.config.js", "ОНОВЛЕНО",
         "Видалено test: { environment: 'jsdom' } — конфліктував з vitest.config.js."),
        ("package.json (root)",                    "ПЕРЕЗАПИС",
         "version 5.2.0→5.3.16; видалено jspdf ^4.2.1, @capacitor/motion, jsdom, vitest."),
    ]))
    s += [sp(8), hr()]

    # ═══ 5. Архітектурні рішення ════════════════════════════════════════════
    s.append(section_box("5", "Архітектурні рішення сесії"))
    s.append(sp(6))
    s.append(arch_table([
        ("Alias замість vi.mock",
         "vi.mock() можна викликати лише у тестових файлах (hoisting). "
         "resolve.alias у vitest.config.js діє на рівні module resolution — "
         "перехоплює транзитивні імпорти без зміни жодного тестового файлу. "
         "Єдиний рядок конфігурації замінює charts.js для всього test suite."),
        ("Regex vs string alias",
         "String alias в Vite — це prefix-заміна (як шлях). "
         "Regex alias матчить проти повного resolved absolute path. "
         "Regex /\\/src\\/core\\/charts\\.js$/ гарантовано спрацьовує для "
         "/home/runner/work/.../HealthPro-Moie-Zdorovia/src/core/charts.js "
         "незалежно від глибини відносного шляху у джерелі."),
        ("Два незалежні рівні захисту",
         "alias (рівень 2) + navigator stub (рівень 3) — якщо alias не спрацює "
         "через оновлення Vitest/Vite що змінює alias behavior, "
         "navigator stub захистить від ReferenceError для будь-якого "
         "іншого browser-залежного модуля. Belt and suspenders."),
        ("build-tools;35.0.0 з SDK 36",
         "AGP 8.x більше не вимагає точного збігу build-tools з compileSdkVersion. "
         "build-tools;36.0.0 може бути недоступний у android-actions/setup-android. "
         "build-tools;35.0.0 гарантовано є і сумісний з compileSdkVersion=36."),
        ("Root vs Inner package.json",
         "Root (~/workspace/package.json) — лише для cap sync android: "
         "@capacitor/cli, @capacitor/core, @capacitor/android, плагіни. "
         "Жодних web-залежностей (jspdf, echarts, vitest). "
         "Inner (HealthPro-Moie-Zdorovia/package.json) — Vite + всі web deps. "
         "Обидва package-lock.json залишаються синхронізованими."),
    ]))
    s += [sp(8), hr()]

    # ═══ 6. Роадмап ═════════════════════════════════════════════════════════
    s.append(section_box("6", "Наступні кроки / Роадмап"))
    s.append(sp(6))
    s.append(proposal_table([
        ("CI / Якість",  "Додати GitHub Actions badge у README; перевірити APK artifact після мержу",     "Високий"),
        ("Архітектура",  "Відокремити getStepCount() від steps/index.js у steps/api.js — "
                         "щоб health-score.js не тягнув chart залежності транзитивно",                    "Середній"),
        ("Безпека",      "AppState listener — блокувати при згортанні в фон (5 хв таймер)",               "Високий"),
        ("Кроки",        "Середній тижневий/місячний крок — статистика на картці активності",             "Середній"),
        ("Бекап",        "Автоматичний бекап кожні 7 днів з нотифікацією",                               "Середній"),
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
