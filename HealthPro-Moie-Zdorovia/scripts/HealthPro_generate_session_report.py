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
VERSION     = "5.3.0"                   # версія застосунку
DESCRIPTION = "Backup_HPB_Biometric_Fix" # коротке уточнення теми сесії (без пробілів)
PART        = 4                          # номер частини, якщо сесія розбита (1, 2, …) або None
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

    # Статистичні плитки — v5.3 Part 4
    s += [stats_row([
        stat_cell("2",  "Завдання сесії",        "Бекап HPB + Biometric Fix"),
        stat_cell("9",  "Файлів оновлено/нових", "JS·HTML·i18n"),
        stat_cell("1",  "Новий модуль",          "backup.js (AES-256-GCM)"),
        stat_cell("0",  "Помилок компіляції",    "Vite build ✓ 1029 модулів"),
    ]), sp(14), hr()]

    # ═══ 1. Резервне копіювання (.hpb, AES-256-GCM) ═══════════════════════════
    s.append(section_box("1", "Бекап .hpb — AES-256-GCM (SubtleCrypto, без бібліотек)"))
    s.append(sp(6))
    s.append(body(
        "Повністю новий модуль src/features/export/backup.js. Формат файлу: "
        "healthpro-backup-YYYY-MM-DD.hpb — зашифрований JSON з AES-256-GCM. "
        "Ключ деривується через PBKDF2 (SHA-256, 100 000 ітерацій, 16-байт salt). "
        "Після шифрування — SHA-256 checksum усього payload для перевірки цілісності при відновленні. "
        "Підтримка старого формату v4.0 (plain JSON без пароля) — автоматична трансформація даних."
    ))
    s.append(sp(4))
    s.append(body(
        "Структура бекапу: measurements (всі записи тиску), medications, med_taken, steps_log, "
        "settings (bpStandard, pillReminder, measureReminder, morningTime, eveningTime, name, "
        "height, weight, dob, doctor), theme, lang. "
        "biometricLock навмисно виключено з бекапу — безпека на новому пристрої."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/features/export/backup.js", "НОВИЙ",
         "exportBackup(pwd): collectData+encrypt+download .hpb; "
         "openBackupFile(file): file-picker → preview stats; "
         "restoreBackup(pwd): decrypt+clearAll+insert+reload; "
         "getBackupStats(): {measurements,medications,steps}; "
         "AES-256-GCM+PBKDF2+SHA-256 via SubtleCrypto"),
        ("src/core/sqlite.js",             "ОНОВЛЕНО",
         "clearAll(): DELETE measurements/medications/med_taken/steps_log — "
         "викликається перед відновленням бекапу"),
        ("src/features/export/index.js",   "ОНОВЛЕНО",
         "re-export exportBackup, openBackupFile, restoreBackup, getBackupStats"),
        ("src/app.js",                      "ОНОВЛЕНО",
         "import backup-функцій; _backupFileContent/_backupOpened state; "
         "showBackupConfirmModal() helper; 7 нових ACTIONS: "
         "openBackupExportModal, closeBackupExportModal, exportBackupAction, "
         "openBackupImportModal, closeBackupImportModal, openBackupImportFile, "
         "closeBackupConfirmModal, restoreBackupAction"),
        ("index.html",                       "ОНОВЛЕНО",
         "Секція Налаштувань: кнопки Зберегти .hpb (синя), CSV, Відновити (.hpb/.json). "
         "3 модалки: #backupExportModal (пароль+підтвердження), "
         "#backupImportModal (інфо файлу+пароль), #backupConfirmModal (підтвердження)"),
        ("src/i18n/ui.uk.js",               "ОНОВЛЕНО",
         "33 нові ключі bk-*: заголовки, підказки, помилки, статистика, кнопки"),
        ("src/i18n/ui.ru.js",               "ОНОВЛЕНО",
         "33 нові ключі bk-* (російський переклад)"),
    ]))
    s += [sp(8), hr()]

    # ═══ 2. Biometric Toggle Fix ═══════════════════════════════════════════════
    s.append(section_box("2", "Виправлення тоглера біометрики (PIN-only пристрої)"))
    s.append(sp(6))
    s.append(body(
        "Проблема: на пристроях без відбитку пальця (тільки PIN/Pattern/Password) "
        "checkBiometric() повертала false навіть якщо пристрій захищено. "
        "Причина: перевірялось тільки isAvailable (пальцевий сканер), але ігнорувалось "
        "deviceIsSecure (екран блокування). Виправлено: тепер умова "
        "info?.isAvailable || info?.deviceIsSecure — тоглер активується на обох типах."
    ))
    s.append(sp(4))
    s.append(body(
        "Також: хардкод 'Біометрія недоступна' в app.js замінено на t('bio-err-unavailable'). "
        "defaultSettings у storage.js тепер явно містить biometricLock: false та "
        "bpStandard: 'ESC2024' — усуває потенційні undefined при першому запуску."
    ))
    s.append(sp(4))
    s.append(file_table([
        ("src/core/biometric.js",   "ОНОВЛЕНО",
         "checkBiometric(): info?.isAvailable || info?.deviceIsSecure (замість тільки isAvailable)"),
        ("src/core/storage.js",     "ОНОВЛЕНО",
         "defaultSettings: biometricLock: false, bpStandard: 'ESC2024' — явні дефолти"),
        ("src/app.js",              "ОНОВЛЕНО",
         "toggleBiometric: toast змінено з 'Біометрія недоступна' на t('bio-err-unavailable')"),
        ("src/i18n/ui.uk.js",       "ОНОВЛЕНО",
         "bio-err-unavailable: 'Блокування недоступне на цьому пристрої'"),
        ("src/i18n/ui.ru.js",       "ОНОВЛЕНО",
         "bio-err-unavailable: 'Блокировка недоступна на этом устройстве'"),
    ]))
    s += [sp(8), hr()]

    # ═══ 3. Архітектурні рішення ══════════════════════════════════════════════
    s.append(section_box("3", "Архітектурні рішення сесії"))
    s.append(sp(6))
    s.append(arch_table([
        ("SubtleCrypto — без зовнішніх залежностей",
         "AES-256-GCM + PBKDF2 реалізовано виключно через Web Crypto API (window.crypto.subtle). "
         "Нульова залежність від npm crypto-бібліотек. Офлайн-ready, немає мережевих запитів."),
        ("biometricLock виключено з бекапу",
         "Навмисне рішення безпеки: при відновленні на новому пристрої "
         "biometricLock=false за замовчуванням. Користувач явно вмикає блокування після відновлення."),
        ("SHA-256 checksum у .hpb",
         "checksum обчислюється від plaintext JSON перед шифруванням і зберігається у зашифрованому blob. "
         "При відновленні: розшифрували → порівняли checksum → перевірили цілісність."),
        ("Legacy v4.0 без пароля",
         "Детекція: pkg.version==='4.0' || (!pkg.format && (pkg.measurements||pkg.pills)). "
         "Пропускаємо пароль-модалку → одразу #backupConfirmModal. Зворотна сумісність."),
        ("clearAll() перед відновленням",
         "sqlite.clearAll() видаляє всі рядки з 4 таблиць. Потім INSERT нових даних пачками. "
         "Ніколи не залишає mix старих/нових даних — атомарна операція відновлення."),
        ("deviceIsSecure для PIN-only",
         "Capacitor BiometricAuth info.deviceIsSecure=true якщо є будь-який екран блокування. "
         "Дозволяє HealthPro Lock Screen на пристроях без сканера відбитку пальця."),
    ]))
    s += [sp(8), hr()]

    # ═══ 4. Роадмап ═══════════════════════════════════════════════════════════
    s.append(section_box("4", "Наступні кроки / Роадмап"))
    s.append(sp(6))
    s.append(proposal_table([
        ("Бекап",   "Google Drive / iCloud автобекап (Capacitor Filesystem)",      "Середній"),
        ("Бекап",   "Автоматичний бекап кожні 7 днів з нотифікацією",              "Середній"),
        ("Безпека", "AppState listener: блокувати при згортанні в фон",             "Середній"),
        ("Профіль", "Вкладки 'Вага' та 'Сон'",                                     "Середній"),
        ("Аналіз",  "Adherence weekly/monthly trend drill-down",                    "Низький"),
        ("PDF",     "ECharts SVG → svg2pdf.js → jsPDF (векторна якість)",           "Низький"),
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
