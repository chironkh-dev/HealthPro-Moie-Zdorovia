#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HealthPro — Моє Здоров'я
Звіт сесії: Android Splash Screen, Крокомір UI, Версія (Травень 2026)
Документація українською мовою. Шрифти: DejaVu (Arial/Arial-Bold).
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import datetime, os

# ── Шрифти DejaVu Sans (повна кирилична підтримка) ──────────────────────────
DEJAVU = "/usr/share/fonts/truetype/dejavu"
pdfmetrics.registerFont(TTFont("Arial",        f"{DEJAVU}/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold",   f"{DEJAVU}/DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", f"{DEJAVU}/DejaVuSans.ttf"))  # Oblique недоступний — використовуємо регулярний
pdfmetrics.registerFont(TTFont("Arial-Mono",   f"{DEJAVU}/DejaVuSansMono.ttf"))

# ── Кольори ──────────────────────────────────────────────────────────────────
C_NAVY     = colors.HexColor("#0D1630")
C_ACCENT   = colors.HexColor("#1A3A6E")
C_BLUE     = colors.HexColor("#1E40AF")
C_CYAN     = colors.HexColor("#0E7490")
C_TEAL     = colors.HexColor("#065F46")
C_GREEN    = colors.HexColor("#14532D")
C_ORANGE   = colors.HexColor("#9A3412")
C_ROW_A    = colors.HexColor("#EFF6FF")
C_ROW_B    = colors.HexColor("#F8FAFC")
C_BORDER   = colors.HexColor("#CBD5E1")
C_LIGHT    = colors.HexColor("#E0F2FE")
C_HEADER   = colors.HexColor("#1E3A6E")

W, H = A4

# ── Стилі ────────────────────────────────────────────────────────────────────
def S(name, **kw):
    return ParagraphStyle(name, **kw)

ST = {
  "Title":    S("Title",    fontName="Arial-Bold",   fontSize=24, textColor=colors.white,
                            alignment=TA_CENTER, leading=30, spaceAfter=2),
  "Sub":      S("Sub",      fontName="Arial",         fontSize=12, textColor=colors.HexColor("#BAD0F5"),
                            alignment=TA_CENTER, leading=16, spaceAfter=2),
  "Date":     S("Date",     fontName="Arial-Italic",  fontSize=9,  textColor=colors.HexColor("#94A3B8"),
                            alignment=TA_CENTER, leading=12),
  "H1":       S("H1",       fontName="Arial-Bold",   fontSize=13, textColor=C_ACCENT,
                            spaceBefore=12, spaceAfter=5, leading=17),
  "H2":       S("H2",       fontName="Arial-Bold",   fontSize=11, textColor=C_CYAN,
                            spaceBefore=9, spaceAfter=4, leading=14),
  "H3":       S("H3",       fontName="Arial-Bold",   fontSize=10, textColor=C_ORANGE,
                            spaceBefore=6, spaceAfter=3, leading=13),
  "Body":     S("Body",     fontName="Arial",         fontSize=9.5, textColor=colors.HexColor("#1E293B"),
                            leading=14, spaceAfter=4, alignment=TA_JUSTIFY),
  "Bullet":   S("Bullet",   fontName="Arial",         fontSize=9.5, textColor=colors.HexColor("#1E293B"),
                            leading=14, leftIndent=14, firstLineIndent=-10, spaceAfter=2),
  "Sub2":     S("Sub2",     fontName="Arial",         fontSize=9,  textColor=colors.HexColor("#475569"),
                            leading=13, leftIndent=28, firstLineIndent=-10, spaceAfter=2),
  "Code":     S("Code",     fontName="Arial-Mono",    fontSize=8,  textColor=colors.HexColor("#1E293B"),
                            backColor=colors.HexColor("#F1F5F9"), leading=12,
                            leftIndent=12, spaceAfter=2, borderPad=4),
  "Note":     S("Note",     fontName="Arial-Italic",  fontSize=8.5, textColor=colors.HexColor("#64748B"),
                            leading=12, leftIndent=10, spaceAfter=3),
  "TH":       S("TH",       fontName="Arial-Bold",   fontSize=9,  textColor=colors.white,
                            alignment=TA_CENTER, leading=12),
  "TC":       S("TC",       fontName="Arial",         fontSize=8.5, textColor=colors.HexColor("#1E293B"),
                            leading=12),
  "TCC":      S("TCC",      fontName="Arial",         fontSize=8.5, textColor=colors.HexColor("#1E293B"),
                            alignment=TA_CENTER, leading=12),
  "StatV":    S("StatV",    fontName="Arial-Bold",   fontSize=22, textColor=C_BLUE,
                            alignment=TA_CENTER, leading=26),
  "StatL":    S("StatL",    fontName="Arial",         fontSize=8,  textColor=C_ACCENT,
                            alignment=TA_CENTER, leading=11),
  "StatS":    S("StatS",    fontName="Arial-Italic",  fontSize=7.5, textColor=C_CYAN,
                            alignment=TA_CENTER, leading=10),
  "Footer":   S("Footer",   fontName="Arial-Italic",  fontSize=7.5, textColor=colors.HexColor("#94A3B8"),
                            alignment=TA_CENTER),
}

def sp(h=6):  return Spacer(1, h)
def hr():
    return HRFlowable(width="100%", thickness=0.5, color=C_BORDER,
                      spaceAfter=6, spaceBefore=4)
def body(t):   return Paragraph(t, ST["Body"])
def h1(t):     return Paragraph(f"<b>{t}</b>", ST["H1"])
def h2(t):     return Paragraph(f"<b>{t}</b>", ST["H2"])
def h3(t):     return Paragraph(f"<b>{t}</b>", ST["H3"])
def bullet(t, sub=False):
    return Paragraph(f"• {t}", ST["Sub2" if sub else "Bullet"])
def code(t):   return Paragraph(t, ST["Code"])
def note(t):   return Paragraph(f"<i>{t}</i>", ST["Note"])


# ── Обкладинка ───────────────────────────────────────────────────────────────
def cover():
    today = datetime.date.today()
    months_uk = {1:"січня",2:"лютого",3:"березня",4:"квітня",5:"травня",
                 6:"червня",7:"липня",8:"серпня",9:"вересня",
                 10:"жовтня",11:"листопада",12:"грудня"}
    date_str = f"{today.day} {months_uk[today.month]} {today.year} р."

    rows = [
        [Paragraph("HealthPro · Моє Здоров'я", ST["Title"])],
        [Paragraph("Звіт сесії: Android Splash Screen · Крокомір UI · Генерація версії", ST["Sub"])],
        [Paragraph(date_str, ST["Date"])],
    ]
    t = Table(rows, colWidths=[W - 4*cm],
              style=TableStyle([
                  ("BACKGROUND",    (0,0),(-1,-1), C_NAVY),
                  ("TOPPADDING",    (0,0),(0,0), 20),
                  ("BOTTOMPADDING", (0,0),(0,0), 4),
                  ("TOPPADDING",    (0,1),(0,1), 0),
                  ("BOTTOMPADDING", (0,1),(0,1), 4),
                  ("TOPPADDING",    (0,2),(0,2), 0),
                  ("BOTTOMPADDING", (0,2),(0,2), 18),
              ]))
    return t

def stat_cell(val, label, sub=""):
    inner = [
        [Paragraph(val,   ST["StatV"])],
        [Paragraph(label, ST["StatL"])],
    ]
    if sub: inner.append([Paragraph(sub, ST["StatS"])])
    return Table(inner, colWidths=[3.6*cm],
                 style=TableStyle([
                     ("BACKGROUND",    (0,0),(-1,-1), C_ROW_A),
                     ("TOPPADDING",    (0,0),(-1,-1), 8),
                     ("BOTTOMPADDING", (0,0),(-1,-1), 8),
                     ("BOX",           (0,0),(-1,-1), 1, C_BLUE),
                     ("ROUNDEDCORNERS", [4]),
                 ]))

def stats_row():
    cells = [
        stat_cell("4", "Завдання виконано", "splash·крок·версія·пропозиції"),
        stat_cell("15", "Файлів змінено", "HTML·CSS·JS·Java·XML"),
        stat_cell("v5.0.0", "Нова версія", "автогенерація"),
        stat_cell("0", "Помилок у консолі", "всі перевірено"),
    ]
    return Table([cells], colWidths=[3.7*cm]*4, hAlign="CENTER",
                 style=TableStyle([
                     ("LEFTPADDING",  (0,0),(-1,-1), 4),
                     ("RIGHTPADDING", (0,0),(-1,-1), 4),
                 ]))

def section_box(num, title):
    n = Paragraph(f"<b>{num}</b>", ParagraphStyle("N", fontName="Arial-Bold",
                  fontSize=16, textColor=colors.white, alignment=TA_CENTER))
    t = Paragraph(f"<b>{title}</b>", ParagraphStyle("T", fontName="Arial-Bold",
                  fontSize=12, textColor=C_NAVY, leading=15))
    tbl = Table([[n, t]], colWidths=[1*cm, 14.5*cm],
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
    return tbl

def file_table(rows):
    STATUS_COLORS = {
        "НОВИЙ":     colors.HexColor("#065F46"),
        "ОНОВЛЕНО":  colors.HexColor("#1D4ED8"),
        "ПЕРЕЗАПИС": colors.HexColor("#92400E"),
    }
    head = [Paragraph("Файл", ST["TH"]),
            Paragraph("Статус", ST["TH"]),
            Paragraph("Опис змін", ST["TH"])]
    data = [head]
    for fname, status, desc in rows:
        clr = STATUS_COLORS.get(status, C_BLUE)
        sp = Paragraph(status, ParagraphStyle("S", fontName="Arial-Bold", fontSize=7.5,
                       textColor=colors.white, alignment=TA_CENTER))
        sb = Table([[sp]], colWidths=[2.1*cm],
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
    P_COLORS = {"Високий": colors.HexColor("#B91C1C"),
                "Середній": colors.HexColor("#B45309"),
                "Низький":  colors.HexColor("#065F46")}
    for tab, prop, pri in rows:
        clr = P_COLORS.get(pri, C_BLUE)
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


# ── Основний зміст ────────────────────────────────────────────────────────────
def build_story():
    story = []

    # Обкладинка
    story.append(cover())
    story.append(sp(12))
    story.append(stats_row())
    story.append(sp(14))
    story.append(hr())

    # ════ 1. SPLASH SCREEN ═══════════════════════════════════════════════════
    story.append(section_box("1", "Android Material 3 Splash Screen"))
    story.append(sp(6))
    story.append(body(
        "Стартовий екран (Splash Screen) повністю перероблений з веб-стилю на справжній "
        "Android Material 3 / Material You дизайн. <b>Не використовується плагін Capacitor</b> — "
        "лише HTML/CSS анімація, що запускається при завантаженні сторінки."
    ))
    story.append(sp(4))

    story.append(h2("Ключові зміни дизайну"))
    story.append(bullet("<b>Фон:</b> суцільний #0D1630 замість градієнту — точно як у нативному Android"))
    story.append(bullet("<b>Іконка додатку:</b> закруглений квадрат (border-radius: 32px) з темно-синім "
                        "градієнтом та внутрішнім світінням — імітація Android Adaptive Icon"))
    story.append(bullet("<b>Анімація входу:</b> cubic-bezier(.34,1.56,.64,1) — пружинний ефект як у Material 3"))
    story.append(bullet("<b>Назва та підзаголовок:</b> з'являються з затримкою 280ms через translateY(10px) → 0"))
    story.append(bullet("<b>Три анімовані крапки:</b> індикатор завантаження у стилі Android (splashDotPulse)"))
    story.append(bullet("<b>Зникнення:</b> плавний fade-out 380ms з CSS transition, потім DOM-видалення через 420ms"))
    story.append(sp(6))

    story.append(h2("Змінені файли"))
    story.append(file_table([
        ("styles/welcome.css", "ОНОВЛЕНО",
         "Повний перепис блоку #splashScreen. Нові класи: .splash-icon-wrap, .splash-brand, "
         ".splash-dots, .splash-dot. Нові keyframes: splashIconIn, splashBrandIn, splashDotPulse."),
        ("index.html", "ОНОВЛЕНО",
         "HTML сплеш-блоку: замінено .splash-logo на .splash-icon-wrap, додано .splash-brand "
         "та .splash-dots з трьома .splash-dot"),
        ("src/app.js", "ОНОВЛЕНО",
         "Таймінг сплешу: 1800ms → 1600ms. Після splash.classList.add('hidden') "
         "через 420ms встановлюється display:none для звільнення DOM"),
    ]))
    story.append(sp(8))
    story.append(hr())

    # ════ 2. КРОКОМІР СПОВІЩЕННЯ ═════════════════════════════════════════════
    story.append(section_box("2", "Нове сповіщення крокоміра у верхній шторці"))
    story.append(sp(6))
    story.append(body(
        "Сповіщення Android Foreground Service крокоміра повністю переоформлено: "
        "видалено емодзі ногу, застосовано нову іконку бігуна, прибрано "
        "горизонтальну полоску прогресу, покращено форматування тексту. "
        "В додатку реалізовано кругову шкалу прогресу замість лінійного бару."
    ))
    story.append(sp(4))

    story.append(h2("2.1  Android Foreground Service — сповіщення"))
    story.append(KeepTogether([
        bullet("Видалено виклик <b>.setProgress(100, pct, false)</b> — горизонтальна полоска прибрана"),
        bullet("Іконка змінена з <b>ic_stat_steps</b> на <b>ic_stat_running</b> (нова іконка бігуна)"),
        bullet("Текст сповіщення: <b>\"4 235 / 10 000 кроків (42%)\"</b> з форматуванням тисяч через\u00a0пробіл"),
        bullet("Додано <b>BigTextStyle</b> для розгорнутого перегляду в шторці"),
        bullet("Новий файл <b>ic_stat_running.xml</b> — монохромна (біла) векторна іконка бігуна"),
    ]))
    story.append(sp(6))

    story.append(h2("2.2  UI в додатку — кругова шкала замість бару"))
    story.append(KeepTogether([
        bullet("Bento-картка крокоміра (#stepCard) повністю перероблена"),
        bullet("Додано SVG-кільце прогресу: r=42, обхват ≈ 263.9px, анімація stroke-dashoffset"),
        bullet("Всередині кільця — іконка бігуна <b>/assets/ic_running.png</b> з glow-ефектом"),
        bullet("Праворуч: велике число кроків (24px, bold), бейдж відсотка, рядок цілі"),
        bullet("Функція <b>updateStepUI()</b> оновлює stroke-dashoffset кільця замість width бару"),
        bullet("Лінійний бар (#stepBar) повністю видалено з HTML"),
    ]))
    story.append(sp(6))

    story.append(h2("2.3  Локалізація — прибрано емодзі ноги"))
    story.append(KeepTogether([
        bullet("uk.js та ru.js: <b>st-notif-title</b>: 'HealthPro 🦶' → 'HealthPro · Кроки / Шаги'"),
        bullet("uk.js та ru.js: <b>st-mode-fg, st-mode-active, st-service-restored</b>: прибрано 🦶"),
        bullet("uk.js та ru.js: <b>st-fg-body</b>: оновлено опис (без посилання на конкретний формат сповіщення)"),
    ]))
    story.append(sp(6))

    story.append(h2("Змінені файли"))
    story.append(file_table([
        ("android/.../StepCounterService.java", "ОНОВЛЕНО",
         "buildNotification(): видалено setProgress(), додано BigTextStyle, змінено іконку на "
         "ic_stat_running, форматування числа кроків з пробілом-роздільником тисяч"),
        ("android/.../ic_stat_running.xml", "НОВИЙ",
         "Монохромний векторний drawable (24×24dp) — силует бігуна для Android-сповіщення"),
        ("assets/ic_running.png", "НОВИЙ",
         "Кольорова PNG-іконка бігуна для відображення всередині кругової шкали в додатку"),
        ("index.html", "ОНОВЛЕНО",
         "Блок #stepCard: нова розмітка step-ring-layout з SVG-кільцем та img-іконкою"),
        ("styles/features.css", "ОНОВЛЕНО",
         "Нові класи: .step-bento, .step-ring-layout, .step-ring-wrap, .step-ring-svg, "
         ".step-ring-bg, .step-ring-prog, .step-ring-center, .step-run-img, .step-ring-info, "
         ".step-big-count, .step-count-sub, .step-pct-badge, .step-goal-row"),
        ("src/features/steps/index.js", "ОНОВЛЕНО",
         "updateStepUI(): замість stepBarEl.style.width оновлює stepCircleProg.style.strokeDashoffset"),
        ("src/i18n/ui.uk.js", "ОНОВЛЕНО",
         "Прибрано 🦶 з st-mode-fg, st-mode-active, st-service-restored, st-notif-title; "
         "оновлено st-notif-title та st-fg-body"),
        ("src/i18n/ui.ru.js", "ОНОВЛЕНО",
         "Аналогічні зміни для російської локалізації"),
    ]))
    story.append(sp(8))
    story.append(hr())

    # ════ 3. ВЕРСІЯ ДОДАТКУ ══════════════════════════════════════════════════
    story.append(section_box("3", "Скрипт генерації версії додатку"))
    story.append(sp(6))
    story.append(body(
        "Реалізовано автоматичну генерацію версії з єдиного джерела правди. "
        "Скрипт зчитує package.json, запитує git-хеш, формує мітки з датою та "
        "часом збірки, записує автогенерований файл <i>src/core/version.gen.js</i>."
    ))
    story.append(sp(4))

    story.append(h2("Принцип роботи"))
    story.append(bullet("Єдине джерело версії — поле <b>\"version\"</b> у <i>package.json</i>"))
    story.append(bullet("Запуск: <b>npm run version</b> або автоматично перед <b>npm run build</b> (prebuild)"))
    story.append(bullet("Git-хеш (короткий, 7 символів) вбудовується у мітку якщо доступний"))
    story.append(bullet("Генерується файл <b>src/core/version.gen.js</b> — не редагувати вручну"))
    story.append(bullet("constants.js ре-експортує APP_BUILD_LABEL, APP_BUILD_FULL, APP_SEMVER, APP_BUILD_DATE"))
    story.append(bullet("У налаштуваннях відображається повна мітка: <b>v5.0.0 · 2026-05-06 00:25 · d4f0d8d</b>"))
    story.append(sp(6))

    story.append(h2("Приклад згенерованого файлу"))
    story.append(code(
        "// АВТОГЕНЕРОВАНИЙ ФАЙЛ — не редагувати вручну<br/>"
        "export const APP_SEMVER      = '5.0.0';<br/>"
        "export const APP_GIT_HASH    = 'd4f0d8d';<br/>"
        "export const APP_BUILD_DATE  = '2026-05-06';<br/>"
        "export const APP_BUILD_LABEL = 'HealthPro v5.0.0 (d4f0d8d)';<br/>"
        "export const APP_BUILD_FULL  = 'v5.0.0 · 2026-05-06 00:25 · d4f0d8d';"
    ))
    story.append(sp(6))

    story.append(h2("Змінені файли"))
    story.append(file_table([
        ("scripts/gen-version.js", "НОВИЙ",
         "ES-модуль Node.js: читає package.json, git rev-parse --short HEAD, "
         "формує 6 констант, записує src/core/version.gen.js"),
        ("src/core/version.gen.js", "НОВИЙ",
         "Автогенерований файл з 6 константами версії (APP_SEMVER, APP_GIT_HASH, "
         "APP_BUILD_DATE, APP_BUILD_TIME, APP_BUILD_LABEL, APP_BUILD_FULL)"),
        ("src/core/constants.js", "ОНОВЛЕНО",
         "Ре-експортує APP_BUILD_LABEL, APP_SEMVER, APP_BUILD_FULL, APP_BUILD_DATE "
         "з version.gen.js замість хардкоду"),
        ("src/app.js", "ОНОВЛЕНО",
         "Імпортовано APP_BUILD_FULL; у секції 'Про додаток' відображається повна мітка"),
        ("package.json", "ОНОВЛЕНО",
         "Додано scripts: \"version\": \"node scripts/gen-version.js\", "
         "\"prebuild\": \"node scripts/gen-version.js\". Версія оновлена до 5.0.0"),
    ]))
    story.append(sp(8))
    story.append(hr())

    # ════ 4. ПРОПОЗИЦІЇ РОЗВИТКУ ═════════════════════════════════════════════
    story.append(section_box("4", "Пропозиції розвитку додатку"))
    story.append(sp(6))
    story.append(body(
        "Нижче наведено структуровані пропозиції з розвитку кожної вкладки та "
        "загальних функцій застосунку HealthPro. Пріоритет визначено з урахуванням "
        "потреб користувачів та технічної складності реалізації."
    ))
    story.append(sp(6))

    proposals = [
        # Тиск
        ("Тиск", "Графік тренду за 7 / 30 / 90 днів з маркуванням зон ВООЗ кольором", "Високий"),
        ("Тиск", "Порівняння «ранок / вечір» — автоматичне визначення за часом запису", "Середній"),
        ("Тиск", "Автоматичне виявлення гіпертонічного кризу (сист. > 180 або діаст. > 120) з екстреним попередженням", "Високий"),
        ("Тиск", "Введення голосом (Web Speech API) — надиктувати значення без торкання екрана", "Низький"),
        # Аналіз
        ("Аналіз", "Часовий ряд Індексу Здоров'я (ІЗ) — лінійний графік динаміки за місяць", "Високий"),
        ("Аналіз", "Кореляція кроків та тиску (scatter plot) — чи допомагає ходьба?", "Середній"),
        ("Аналіз", "Інсайти штучного інтелекту — локальний алгоритм коментарів на основі трендів", "Середній"),
        # Ліки
        ("Ліки", "Повторення розкладу: щодня / через день / у конкретні дні тижня", "Високий"),
        ("Ліки", "Запас таблеток: лічильник залишку та нагадування про покупку за 5 днів", "Середній"),
        ("Ліки", "Фото упаковки — збереження через Capacitor Filesystem + перегляд у картці", "Низький"),
        ("Ліки", "Взаємодія ліків — офлайн-база з 500+ найпоширеніших пар препаратів", "Середній"),
        # Журнал
        ("Журнал", "Фільтр за категорією: тиск / ліки / кроки / вага — окремі вкладки у журналі", "Середній"),
        ("Журнал", "Нотатки до вимірювання: короткий текст + тег (після їжі, стрес, фізнавантаження)", "Високий"),
        ("Журнал", "Пошук за датою та значенням — швидкий picker + поле введення", "Середній"),
        # Профіль
        ("Профіль", "Фото профілю: вибір з галереї через Capacitor Camera", "Низький"),
        ("Профіль", "Щоденна ціль кроків, вага, зріст — персоналізовані норми ВООЗ", "Середній"),
        ("Профіль", "Медична картка: алергії, хронічні хвороби, лікар — для екстреного доступу", "Середній"),
        # Налаштування
        ("Налаштування", "Автоматичне резервне копіювання: щоденний JSON-snapshot у Capacitor Filesystem", "Середній"),
        ("Налаштування", "Хмарний бекап через Google Drive / iCloud (Capacitor Filesystem + auth)", "Низький"),
        ("Налаштування", "Блокування додатку PIN-кодом або біометрією (Capacitor BiometricAuth)", "Середній"),
        ("Налаштування", "Повний темний / повний світлий / системна тема + кольорові акценти (5 варіантів)", "Низький"),
    ]
    story.append(proposal_table(proposals))
    story.append(sp(6))

    story.append(h2("Пропозиції нових вкладок / функцій"))
    story.append(KeepTogether([
        bullet("<b>Вкладка «Вага»</b> — графік ваги з ІМТ-зонами, ціль схуднення / набору, "
               "калькулятор денної норми калорій"),
        bullet("<b>Вкладка «Сон»</b> — час відходу / підйому, якість за 10-балльною шкалою, "
               "кореляція сну з тиском наступного ранку"),
        bullet("<b>Звіт для лікаря</b> — автоформат PDF з найважливішими показниками за місяць "
               "в таблично-графічному вигляді (вже є PDF, але потребує лікарського шаблону)"),
        bullet("<b>Телеграм-бот нагадування</b> — для тих хто рідко відкриває додаток; "
               "щоденне нагадування виміряти тиск через Bot API"),
    ]))
    story.append(sp(8))
    story.append(hr())

    # ════ ВИСНОВОК ═══════════════════════════════════════════════════════════
    story.append(h1("Висновок"))
    story.append(sp(4))
    story.append(body(
        "У даній сесії виконано <b>4 основних завдання</b>: реалізовано Android Material 3 "
        "Splash Screen у HTML/CSS, повністю перероблено UI крокоміра (кругова шкала, "
        "іконка бігуна, Android сповіщення без полоски і емодзі), створено робочий скрипт "
        "генерації версії з git-хешем та датою збірки, а також складено детальний план "
        "розвитку додатку по всіх вкладках."
    ))
    story.append(sp(4))
    story.append(body(
        "Застосунок запущено, усі зміни перевірено у браузері. Версія <b>v5.0.0</b> "
        "зафіксована у package.json та автогенерованому файлі. Документацію оновлено "
        "у replit.md для наступного агента."
    ))
    story.append(sp(10))

    footer_data = [[Paragraph(
        "HealthPro · Моє Здоров'я · Звіт сесії травень 2026 · "
        "Шрифти: DejaVu Sans (Arial) — повна кирилична підтримка",
        ST["Footer"]
    )]]
    story.append(Table(footer_data, colWidths=[W - 4*cm],
                       style=TableStyle([
                           ("TOPPADDING",  (0,0),(-1,-1), 8),
                           ("LINEABOVE",   (0,0),(-1,-1), 0.5, C_BORDER),
                       ])))
    return story


# ── Генерація PDF ─────────────────────────────────────────────────────────────
OUT = os.path.join(os.path.dirname(__file__), "HealthPro_Session_June2026_SplashStepsVersion.pdf")

doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2*cm,  bottomMargin=2*cm,
    title="HealthPro — Звіт сесії: Splash Screen · Крокомір · Версія",
    author="HealthPro Dev Session",
)

doc.build(build_story())
print(f"✅ PDF збережено: {OUT}")
