"""
HealthPro · Моє Здоров'я — Звіт сесії v5.2
Генерується reportlab + DejaVu Sans (кирилиця).
Запуск: python3 generate_session_report_v5.2.py
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import datetime, os

# ── Шрифти ───────────────────────────────────────────────────────────────────
FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
pdfmetrics.registerFont(TTFont('DejaVu', FONT_PATH))
pdfmetrics.registerFont(TTFont('DejaVuBold', FONT_BOLD))

# ── Кольори ──────────────────────────────────────────────────────────────────
WHITE      = colors.HexColor('#FFFFFF')
BLACK      = colors.HexColor('#0F172A')
BLUE_DARK  = colors.HexColor('#1E40AF')
BLUE_MED   = colors.HexColor('#2563EB')
BLUE_LIGHT = colors.HexColor('#EFF6FF')
BLUE_HEAD  = colors.HexColor('#1D4ED8')
GRAY_BG    = colors.HexColor('#F8FAFC')
GRAY_ROW   = colors.HexColor('#F1F5F9')
GRAY_ROW2  = colors.HexColor('#E2E8F0')
GRAY_BORD  = colors.HexColor('#CBD5E1')
TEXT_BODY  = colors.HexColor('#1E293B')
TEXT_GRAY  = colors.HexColor('#475569')
GREEN      = colors.HexColor('#15803D')
GREEN_BG   = colors.HexColor('#DCFCE7')
AMBER      = colors.HexColor('#B45309')
AMBER_BG   = colors.HexColor('#FEF3C7')
RED        = colors.HexColor('#B91C1C')
RED_BG     = colors.HexColor('#FEE2E2')
ORANGE     = colors.HexColor('#C2410C')
ORANGE_BG  = colors.HexColor('#FFEDD5')

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

# ── Стилі ────────────────────────────────────────────────────────────────────
def sty(name, font='DejaVu', size=10, color=TEXT_BODY, leading=14,
        bold=False, space_before=0, space_after=4, align=0):
    return ParagraphStyle(
        name, fontName='DejaVuBold' if bold else font,
        fontSize=size, textColor=color,
        leading=leading, spaceAfter=space_after, spaceBefore=space_before,
        alignment=align,
    )

S_TITLE    = sty('title',    size=20, color=WHITE,     bold=True, leading=26, align=1)
S_SUBTITLE = sty('subtitle', size=11, color=colors.HexColor('#BFDBFE'), leading=15, align=1)
S_DATE     = sty('date',     size=9,  color=colors.HexColor('#93C5FD'), leading=12, align=1)
S_H1       = sty('h1',       size=13, color=BLUE_DARK, bold=True, leading=18, space_before=8)
S_H2       = sty('h2',       size=11, color=BLUE_MED,  bold=True, leading=15, space_before=6)
S_BODY     = sty('body',     size=9,  color=TEXT_BODY, leading=13)
S_MUTED    = sty('muted',    size=8,  color=TEXT_GRAY, leading=12)
S_OK       = sty('ok',       size=9,  color=GREEN,     bold=True, leading=13)
S_WARN     = sty('warn',     size=9,  color=AMBER,     bold=True, leading=13)
S_ERR      = sty('err',      size=9,  color=RED,       bold=True, leading=13)
S_CODE     = sty('code',     size=8,  color=colors.HexColor('#1E40AF'), leading=11,
                 font='DejaVu')
S_TH       = sty('th',       size=9,  color=WHITE,     bold=True, leading=12, align=1)
S_TD       = sty('td',       size=8,  color=TEXT_BODY, leading=11)
S_TD_C     = sty('tdc',      size=8,  color=TEXT_BODY, leading=11, align=1)
S_TD_OK    = sty('tdok',     size=8,  color=GREEN,     bold=True, leading=11, align=1)
S_TD_WARN  = sty('tdwn',     size=8,  color=AMBER,     bold=True, leading=11, align=1)
S_TD_ERR   = sty('tderr',    size=8,  color=RED,       bold=True, leading=11, align=1)
S_TD_ORNG  = sty('tdorg',    size=8,  color=ORANGE,    bold=True, leading=11, align=1)

def esc(t):
    return t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

def hr(): return HRFlowable(width='100%', thickness=0.5, color=GRAY_BORD, spaceAfter=6, spaceBefore=6)

def section_title(text):
    return [Spacer(1, 4*mm), Paragraph(text, S_H1), hr()]

def badge_table(items):
    """Горизонтальна таблиця-бейджи: [(label, value, style), ...]"""
    data = [[Paragraph(v, s) for _, v, s in items]]
    labels = [[Paragraph(l, S_MUTED) for l, _, _ in items]]
    col_w = (PAGE_W - 2*MARGIN) / len(items)
    t = Table([labels[0], data[0]], colWidths=[col_w]*len(items))
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GRAY_BG),
        ('GRID', (0,0), (-1,-1), 0.5, GRAY_BORD),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,1), [BLUE_LIGHT]),
    ]))
    return t

def changes_table(rows):
    """rows = [(секція, файл, зміна, статус), ...]"""
    col_w = PAGE_W - 2*MARGIN
    header = [Paragraph(h, S_TH) for h in ['Секція', 'Файл', 'Зміна', 'Статус']]
    widths = [col_w*0.12, col_w*0.28, col_w*0.42, col_w*0.18]
    data = [header]
    styles = [('BACKGROUND', (0,0), (-1,0), BLUE_HEAD),
              ('GRID', (0,0), (-1,-1), 0.4, GRAY_BORD),
              ('VALIGN', (0,0), (-1,-1), 'TOP'),
              ('TOPPADDING', (0,0), (-1,-1), 4),
              ('BOTTOMPADDING', (0,0), (-1,-1), 4),
              ('LEFTPADDING', (0,0), (-1,-1), 5),
              ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]
    for i, (sec, fil, chg, st) in enumerate(rows):
        bg = GRAY_ROW if i % 2 == 0 else WHITE
        if st == '✅': sc, stl = S_TD_OK,   GREEN_BG
        elif st == '🟡': sc, stl = S_TD_WARN, AMBER_BG
        elif st == '🟠': sc, stl = S_TD_ORNG, ORANGE_BG
        else:            sc, stl = S_TD_ERR,  RED_BG
        row = [Paragraph(esc(sec), S_TD_C), Paragraph(esc(fil), S_CODE),
               Paragraph(esc(chg), S_TD),   Paragraph(esc(st),  sc)]
        data.append(row)
        styles.append(('BACKGROUND', (0, i+1), (-1, i+1), bg))
        styles.append(('BACKGROUND', (3, i+1), (3,  i+1), stl))
    t = Table(data, colWidths=widths)
    t.setStyle(TableStyle(styles))
    return t

def build_pdf(path):
    doc = SimpleDocTemplate(path, pagesize=A4,
                            leftMargin=MARGIN, rightMargin=MARGIN,
                            topMargin=MARGIN, bottomMargin=MARGIN)
    story = []
    now = datetime.datetime.now().strftime('%d.%m.%Y %H:%M')

    # ── ОБКЛАДИНКА ────────────────────────────────────────────────────────────
    cover_data = [[
        Paragraph('HealthPro · Моє Здоров\'я', S_TITLE),
        Paragraph('Технічний звіт сесії розробки v5.2', S_SUBTITLE),
        Paragraph(f'Дата: {now}', S_DATE),
    ]]
    cover = Table([cover_data[0]], colWidths=[PAGE_W - 2*MARGIN])
    cover.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BLUE_DARK),
        ('TOPPADDING',    (0,0), (-1,-1), 10*mm),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10*mm),
        ('LEFTPADDING',   (0,0), (-1,-1), 8*mm),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8*mm),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROUNDEDCORNERS', [4]),
    ]))
    story += [cover, Spacer(1, 8*mm)]

    # ── ЗВЕДЕННЯ ─────────────────────────────────────────────────────────────
    story += section_title('1. Загальне зведення сесії')
    story += [badge_table([
        ('Версія',    'v5.2',       S_H2),
        ('Статус',    '✅ ЗАВЕРШЕНО', S_OK),
        ('Секцій',    '5 з 5',       S_BODY),
        ('Файлів',    '12',          S_BODY),
        ('Змін',      '~35',         S_BODY),
    ]), Spacer(1, 4*mm)]

    story.append(Paragraph(
        'Сесія v5.2 виправила критичні баги класифікації тиску (ESC 2024), усунула '
        'зовнішній мережевий запит (Google Fonts), реструктурувала модуль ліків та '
        'покращила журнал. Секція 6 (версія та Part 2) — відкладена на наступну сесію.',
        S_BODY))
    story.append(Spacer(1, 3*mm))

    # ── СЕКЦІЇ ────────────────────────────────────────────────────────────────
    story += section_title('2. Деталі виправлень по секціях')

    sections_meta = [
        ('§1', 'Класифікація тиску (ESC 2024 / AHA 2017)', '✅'),
        ('§2', 'Перемикач стандарту тиску у Налаштуваннях', '✅'),
        ('§3', 'Реструктуризація аналітики (зони → модалка)', '✅'),
        ('§4', 'Модуль ліків (аптеки, застереження, прийняті)', '✅'),
        ('§5', 'Журнал вимірів (кольори, emoji, кнопки)', '✅'),
        ('§7', 'Мережева активність (Google Fonts → системний)', '✅'),
        ('§6', 'Версія та BP Standard Part 2', '⏳ наступна сесія'),
    ]
    sm_header = [Paragraph(h, S_TH) for h in ['Секція', 'Опис', 'Статус']]
    sm_data = [sm_header]
    for sec, desc, st in sections_meta:
        if '✅' in st: sc = S_TD_OK
        elif '⏳' in st: sc = S_TD_WARN
        else: sc = S_TD_ERR
        sm_data.append([Paragraph(sec, S_TD_C), Paragraph(desc, S_TD), Paragraph(st, sc)])
    cw = PAGE_W - 2*MARGIN
    sm_t = Table(sm_data, colWidths=[cw*0.1, cw*0.7, cw*0.2])
    sm_t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BLUE_HEAD),
        ('GRID', (0,0), (-1,-1), 0.4, GRAY_BORD),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [GRAY_ROW, WHITE]),
    ]))
    story += [sm_t, Spacer(1, 4*mm)]

    # ── ТАБЛИЦЯ ЗМІН ─────────────────────────────────────────────────────────
    story += section_title('3. Зміни у файлах')

    changes = [
        # sec, file, description, status
        ('§1', 'src/core/constants.js',
         'Додано BP_STANDARDS з порогами ESC 2024 та AHA 2017. '
         'Константа DEFAULT_BP_STANDARD = "ESC2024".',
         '✅'),
        ('§1', 'src/features/pressure/norm.js',
         'getBPDotClass(): sys 140-159 → "d-grade1" (окремий клас, '
         'раніше помилково повертав "d-warn" як і 130-139).',
         '✅'),
        ('§1', 'styles/features.css',
         'Додано .d-grade1 (помаранчевий #f97316) та .hi-grade1 '
         '(border-left 3px #f97316). Клас journal border-cls оновлено.',
         '✅'),
        ('§1', 'src/features/journal/index.js',
         'borderCls: додано "hi-grade1" для d-grade1. '
         'Emoji у нотатках фільтруються через regex.',
         '✅'),
        ('§2', 'index.html',
         'Нова картка "Стандарт тиску" у Налаштуваннях: '
         'кнопки ESC 2024 / AHA 2017 з data-action="setBPStandard".',
         '✅'),
        ('§2', 'src/app.js',
         'Додано обробник setBPStandard: зберігає state.settings.bpStandard, '
         'підсвічує активну кнопку, показує toast.',
         '✅'),
        ('§2', 'src/core/state.js',
         'saveData() доступна через іменований експорт для app.js.',
         '✅'),
        ('§3', 'index.html',
         'Bento "% норм. вимірів" → "Зони тиску" з data-action="openBPZonesModal". '
         'Прибрано окрему картку з bpZonesChart.',
         '✅'),
        ('§3', 'index.html',
         'Додано модальне вікно #bpZonesModal з контейнером bpZonesChartModal.',
         '✅'),
        ('§3', 'src/app.js',
         'openBPZonesModal/closeBPZonesModal: рендерять у bpZonesChartModal.',
         '✅'),
        ('§4', 'index.html',
         'Секція аптек: залишено лише Tabletki.ua. '
         'Inline disclaimer замінено кнопкою "? Застереження" (openDrugWarnModal).',
         '✅'),
        ('§4', 'index.html',
         'Додано модальне вікно #drugWarnModal з динамічним контентом.',
         '✅'),
        ('§4', 'src/features/meds/index.js',
         'openDrugWarnModal(): показує загальний disclaimer якщо _drugWarnInfo=null. '
         'renderPills(): прийняті ліки сховано. '
         'Прибрано inline drug warn у кожному pill-item.',
         '✅'),
        ('§5', 'styles/features.css',
         'Додано .d-grade1 та .hi-grade1 для правильного кольору '
         'journal записів з sys 140-159.',
         '✅'),
        ('§5', 'src/i18n/ui.uk.js',
         'Додано ключі: j-delete, m-warn-disclaimer, m-discl-title/text, '
         't-bp-std-* (ESC/AHA switcher).',
         '✅'),
        ('§5', 'src/i18n/ui.ru.js',
         'Аналогічні ключі додані для Russian locale.',
         '✅'),
        ('§7', 'index.html',
         'Google Fonts <link> видалено. Замінено inline <style> '
         'з системним стеком шрифтів (Inter, system-ui, sans-serif). '
         'Нульовий зовнішній трафік.',
         '✅'),
        ('§7', 'vite.config.js',
         'publicDir: "." — assets/tips/*.json доступні за /assets/tips/... '
         'в dev-режимі (tips fetch виправлено).',
         '✅'),
    ]
    story += [changes_table(changes), Spacer(1, 4*mm)]

    # ── БАГИ ─────────────────────────────────────────────────────────────────
    story += section_title('4. Критичні баги — до/після')

    bugs = [
        ('БАГ 1',
         'Класифікація тиску',
         'sys 140-159 → d-warn (жовтий, як 130-139)',
         'd-grade1 (помаранчевий) — окремий клас ESC Grade 1'),
        ('БАГ 2',
         'Зовнішній запит',
         'Google Fonts при кожному завантаженні → порушення офлайн-PWA',
         'Системний шрифт Inter/-apple-system/sans-serif — 0 зовнішніх запитів'),
        ('БАГ 3',
         'Аптеки',
         '4 кнопки: Apteka.ua, Liki.ua, Tabletki.ua, 911.ua',
         'Тільки Tabletki.ua (верифікований партнер)'),
        ('БАГ 4',
         'Ліки — застереження',
         'Inline текст у кожному pill-item (шум у списку)',
         'Кнопка "?" відкриває модалку з повним текстом'),
        ('БАГ 5',
         'Ліки — прийняті',
         'Прийняті ліки залишаються у списку (замутнені)',
         'Прийняті зникають зі списку, відображаються лише неприйняті'),
        ('БАГ 6',
         'BP Zones bento',
         '"% норм. вимірів" — застаріла метрика без деталей',
         '"Зони тиску" → відкриває модалку з ECharts BarChart'),
        ('БАГ 7',
         'Журнал кольори',
         'hi-grade1 клас відсутній, всі sys 140-159 без кольорової мітки',
         'hi-grade1 (помаранчева риска) + d-grade1 (помаранчева крапка)'),
    ]
    bh = [Paragraph(h, S_TH) for h in ['Ідентифікатор', 'Компонент', 'До', 'Після']]
    bd = [bh]
    bw = PAGE_W - 2*MARGIN
    for i, (bid, comp, before, after) in enumerate(bugs):
        bg = GRAY_ROW if i % 2 == 0 else WHITE
        bd.append([
            Paragraph(esc(bid),    S_TD_C),
            Paragraph(esc(comp),   S_TD),
            Paragraph(esc(before), S_TD_ERR),
            Paragraph(esc(after),  S_TD_OK),
        ])
    bt = Table(bd, colWidths=[bw*0.1, bw*0.15, bw*0.37, bw*0.38])
    bt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BLUE_HEAD),
        ('GRID', (0,0), (-1,-1), 0.4, GRAY_BORD),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [GRAY_ROW, WHITE]),
        ('BACKGROUND', (2,1), (2,-1), RED_BG),
        ('BACKGROUND', (3,1), (3,-1), GREEN_BG),
    ]))
    story += [bt, Spacer(1, 4*mm)]

    # ── АРХІТЕКТУРНІ РІШЕННЯ ─────────────────────────────────────────────────
    story += section_title('5. Архітектурні рішення v5.2')

    decisions = [
        ('BP_STANDARDS у constants.js',
         'Єдине джерело порогів ESC/AHA. Легко розширити новими стандартами.'),
        ('d-grade1 як окремий CSS-клас',
         'Відповідає ESC 2024: Grade 1 HTN (140-159) ≠ High Normal (130-139). '
         'Помаранчевий (#f97316) між жовтим (warn) та червоним (bad).'),
        ('Inline disclaimer → Modal',
         'Зменшує візуальний шум у списку ліків. Застереження відкривається '
         'лише за потреби. openDrugWarnModal() обробляє обидва режими.'),
        ('publicDir: "."',
         'Дає Vite dev-серверу доступ до assets/tips/*.json за шляхом /assets/tips/. '
         'Не впливає на production build (outDir: ../dist).'),
        ('Системний стек шрифтів',
         'Inter → system-ui: 0 зовнішніх запитів, PWA offline-first принцип збережено. '
         'Inter доступний на більшості Android 9+ пристроїв.'),
        ('setBPStandard у диспетчері',
         'state.settings.bpStandard зберігається у localStorage через saveData(). '
         'Перемикач підсвічує активну кнопку через classList.toggle("active").'),
    ]
    for title, body in decisions:
        story.append(Paragraph(esc(f'▸ {title}'), S_H2))
        story.append(Paragraph(esc(body), S_BODY))
        story.append(Spacer(1, 2*mm))

    # ── ЗАЛИШКОВІ ЗАВДАННЯ ────────────────────────────────────────────────────
    story += section_title('6. Відкладено на сесію v5.3 (Part 2)')
    remaining = [
        'Секція 6: Оновлення версії до v5.2 у package.json → npm run version',
        'Секція 6: BP Standard Part 2 — інтеграція вибраного стандарту у countByBPCategory',
        'Секція 6: AHA 2017 відмінності у getBPStatus() та getBPDotClass()',
        'IZ-тренд → модальне вікно (аналогічно BP Zones Modal)',
        'Scatter Chart → модальне вікно (scatterModal вже в app.js але немає в HTML)',
        'Unit-тести для getBPDotClass() з новим d-grade1',
    ]
    for item in remaining:
        story.append(Paragraph(f'□ {item}', S_BODY))
    story.append(Spacer(1, 3*mm))

    # ── ПІДПИС ───────────────────────────────────────────────────────────────
    story += [hr()]
    story.append(Paragraph(
        f'HealthPro v5.2 · Replit Agent · {now} · Офлайн-перший PWA для контролю тиску',
        S_MUTED))

    doc.build(story)
    print(f'PDF збережено: {path}')

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), 'session_report_v5.2.pdf')
    build_pdf(out)
