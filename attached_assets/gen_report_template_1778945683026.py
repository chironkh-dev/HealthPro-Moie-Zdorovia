#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""HealthPro — Шаблон звіту для лікаря (пропозиція для узгодження)"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rcanvas
from reportlab.lib.colors import HexColor

pdfmetrics.registerFont(TTFont('DJ',  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DJB', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))

OUT = '/mnt/user-data/outputs/HealthPro_ReportTemplate_Proposal.pdf'
W, H = A4

# ── Palette (light, medical) ──────────────────────────────────────────────────
BLUE   = HexColor('#1E40AF')
LBLUE  = HexColor('#DBEAFE')
GREEN  = HexColor('#166534')
LGRN   = HexColor('#DCFCE7')
RED    = HexColor('#991B1B')
LRED   = HexColor('#FEE2E2')
AMBER  = HexColor('#92400E')
LAMB   = HexColor('#FEF3C7')
PURPLE = HexColor('#6B21A8')
LPURP  = HexColor('#F3E8FF')
GRAY   = HexColor('#64748B')
LGRAY  = HexColor('#F1F5F9')
BORD   = HexColor('#E2E8F0')
TEXT   = HexColor('#1E293B')
T2     = HexColor('#475569')
T3     = HexColor('#94A3B8')
WHITE  = HexColor('#FFFFFF')

def hline(cv, y, x0=15*mm, x1=None, c=BORD, lw=0.5):
    if x1 is None: x1 = W-15*mm
    cv.setStrokeColor(c); cv.setLineWidth(lw)
    cv.line(x0, y, x1, y)

def box(cv, x, y, w, h, fill=WHITE, stroke=BORD, lw=0.5, r=2*mm):
    cv.setFillColor(fill); cv.setStrokeColor(stroke); cv.setLineWidth(lw)
    cv.roundRect(x, y, w, h, r, fill=1, stroke=1)

def label(cv, x, y, text, size=7, color=T3, bold=False):
    cv.setFont('DJB' if bold else 'DJ', size)
    cv.setFillColor(color)
    cv.drawString(x, y, text)

def accent_bar(cv, x, y, h, color=BLUE):
    cv.setFillColor(color)
    cv.rect(x, y, 3*mm, h, fill=1, stroke=0)

# ═══════════════════════════════════════════════════════════════════════════════
cv = rcanvas.Canvas(OUT, pagesize=A4)
cv.setTitle('HealthPro — Шаблон звіту (пропозиція)')

# ══════════════════ PAGE 1 — COVER / BRIEF EXPLANATION ════════════════════════
cv.setFillColor(LGRAY); cv.rect(0, 0, W, H, fill=1, stroke=0)

# Header
cv.setFillColor(BLUE); cv.rect(0, H-45*mm, W, 45*mm, fill=1, stroke=0)
cv.setFont('DJB', 20); cv.setFillColor(WHITE)
cv.drawString(15*mm, H-20*mm, 'HealthPro — Шаблон звіту для лікаря')
cv.setFont('DJ', 10); cv.setFillColor(HexColor('#BFDBFE'))
cv.drawString(15*mm, H-30*mm, 'ПРОПОЗИЦІЯ ДЛЯ УЗГОДЖЕННЯ · 16 травня 2026')
cv.setFont('DJ', 9)
cv.drawString(15*mm, H-39*mm, 'Сторінка 1 — опис структури / Сторінка 2 — повний зразок звіту')

y = H - 58*mm

# Problem statement
box(cv, 15*mm, y-28*mm, W-30*mm, 28*mm, LRED, RED, 0.5)
accent_bar(cv, 15*mm, y-28*mm, 28*mm, RED)
cv.setFont('DJB', 10); cv.setFillColor(RED)
cv.drawString(22*mm, y-7*mm, 'Проблема: звіт кожен раз інший')
cv.setFont('DJ', 8.5); cv.setFillColor(TEXT)
cv.drawString(22*mm, y-13*mm, '• Старий (pdf.js): 7-денний тиск, без графіку, кодування зламане у футері')
cv.drawString(22*mm, y-19*mm, '• Новий (pdf-report.js): 30-денний тиск, є графік — але немає блоку підпису лікаря')
cv.drawString(22*mm, y-25*mm, '• Одиниці дози відсутні ("50" замість "50 мг"), формат генерується хаотично')
y -= 34*mm

# Solution
box(cv, 15*mm, y-28*mm, W-30*mm, 28*mm, LGRN, GREEN, 0.5)
accent_bar(cv, 15*mm, y-28*mm, 28*mm, GREEN)
cv.setFont('DJB', 10); cv.setFillColor(GREEN)
cv.drawString(22*mm, y-7*mm, 'Рішення: один фіксований шаблон + модальне вікно вибору')
cv.setFont('DJ', 8.5); cv.setFillColor(TEXT)
cv.drawString(22*mm, y-13*mm, '• Єдиний модуль генерації: тільки pdf-report.js, pdf.js — прибрати або залишити для "Друку"')
cv.drawString(22*mm, y-19*mm, '• Модальне вікно перед генерацією: вибір ПЕРІОДУ + ФОРМАТУ + СЕКЦІЙ')
cv.drawString(22*mm, y-25*mm, '• Фіксована структура: 8 блоків в незмінному порядку (дивись нижче)')
y -= 34*mm

# 8 sections description
cv.setFont('DJB', 11); cv.setFillColor(BLUE)
cv.drawString(15*mm, y, 'Структура звіту — 8 фіксованих блоків:')
y -= 8*mm

sections = [
    ('1', 'ШАПКА', 'Лого + "Звіт для лікаря" + дата генерації + обраний стандарт (ESC/AHA)',        BLUE,   LBLUE),
    ('2', 'ПАЦІЄНТ', 'Ім\'я, вік, стать, зріст, вага, ІМТ + контакти + екстрений контакт',          BLUE,   LBLUE),
    ('3', 'СТАТИСТИКА', 'Середній тиск (обраний період) | Пульс | ІЗ | Кількість вимірів',           BLUE,   LBLUE),
    ('4', 'ГРАФІК', 'Динаміка тиску за обраний період (inline SVG — без html2canvas)',                GREEN,  LGRN),
    ('5', 'ЖУРНАЛ', 'Таблиця вимірів: Дата, Час, Тиск, Пульс, Категорія ESC/AHA, Нотатка',          GREEN,  LGRN),
    ('6', 'ЛІКИ', 'Активні призначення: Препарат, Доза (з одиницею), Час, Розклад UA-мовою',        PURPLE, LPURP),
    ('7', 'ADHERENCE', 'Графік прийому ліків за період (тільки якщо є ліки)',                        PURPLE, LPURP),
    ('8', 'ЛІКАР', 'Блок нотаток лікаря (порожній), Дата огляду, Підпис/Печатка — ЗАВЖДИ',           RED,    LRED),
]

for num, title, desc, fg, bg in sections:
    box(cv, 15*mm, y-11*mm, W-30*mm, 11*mm, bg, BORD, 0.3, 1.5*mm)
    cv.setFillColor(fg)
    cv.roundRect(15*mm, y-11*mm, 12*mm, 11*mm, 1.5*mm, fill=1, stroke=0)
    cv.setFont('DJB', 9); cv.setFillColor(WHITE)
    cv.drawCentredString(21*mm, y-6.5*mm, num)
    cv.setFont('DJB', 8.5); cv.setFillColor(fg)
    cv.drawString(30*mm, y-5*mm, title)
    cv.setFont('DJ', 8); cv.setFillColor(T2)
    cv.drawString(60*mm, y-5*mm, desc[:72])
    y -= 13*mm

y -= 4*mm

# Modal description
box(cv, 15*mm, y-52*mm, W-30*mm, 52*mm, LGRAY, BORD, 0.5)
accent_bar(cv, 15*mm, y-52*mm, 52*mm, BLUE)
cv.setFont('DJB', 10); cv.setFillColor(BLUE)
cv.drawString(22*mm, y-7*mm, 'Модальне вікно "Звіт для лікаря" — замість поточного тексту "Друк/PDF/CSV"')

# Period selector mockup
cv.setFont('DJB', 8); cv.setFillColor(T2)
cv.drawString(22*mm, y-14*mm, 'ПЕРІОД:')
periods = [('7 днів', False), ('14 днів', False), ('30 днів', True), ('90 днів', False), ('Свій', False)]
px = 55*mm
for p, active in periods:
    pw = len(p)*5.5 + 10
    cv.setFillColor(BLUE if active else WHITE)
    cv.setStrokeColor(BLUE); cv.setLineWidth(0.5)
    cv.roundRect(px, y-17*mm, pw, 6*mm, 1.5*mm, fill=1, stroke=1)
    cv.setFont('DJ', 8); cv.setFillColor(WHITE if active else BLUE)
    cv.drawString(px+4, y-13.5*mm, p)
    px += pw + 3*mm

cv.setFont('DJB', 8); cv.setFillColor(T2)
cv.drawString(22*mm, y-23*mm, 'ФОРМАТ:')
formats = [('PDF для лікаря', True), ('CSV для Excel', False), ('JSON бекап', False)]
px = 55*mm
for f, active in formats:
    fw = len(f)*5.2 + 10
    cv.setFillColor(BLUE if active else WHITE)
    cv.setStrokeColor(BLUE); cv.setLineWidth(0.5)
    cv.roundRect(px, y-26*mm, fw, 6*mm, 1.5*mm, fill=1, stroke=1)
    cv.setFont('DJ', 8); cv.setFillColor(WHITE if active else BLUE)
    cv.drawString(px+4, y-22.5*mm, f)
    px += fw + 3*mm

cv.setFont('DJB', 8); cv.setFillColor(T2)
cv.drawString(22*mm, y-32*mm, 'СЕКЦІЇ:')
checkboxes = [
    ('Графік тиску', True), ('Журнал вимірів', True),
    ('Ліки', True), ('Adherence', True), ('Блок лікаря', True),
]
cx = 55*mm; cy = y-32*mm
for i, (ch, checked) in enumerate(checkboxes):
    if i == 3: cx = 55*mm; cy = y-38*mm
    cv.setFillColor(BLUE if checked else WHITE)
    cv.setStrokeColor(BLUE); cv.setLineWidth(0.5)
    cv.rect(cx, cy-3.5*mm, 5*mm, 5*mm, fill=1, stroke=1)
    if checked:
        cv.setFillColor(WHITE); cv.setFont('DJB', 8)
        cv.drawString(cx+1*mm, cy-0.5*mm, '✓')
    cv.setFont('DJ', 8); cv.setFillColor(TEXT)
    cv.drawString(cx+7*mm, cy, ch)
    cx += len(ch)*5.5 + 18*mm

# Generate button
cv.setFillColor(BLUE); cv.roundRect(W-65*mm, y-50*mm, 45*mm, 9*mm, 2*mm, fill=1, stroke=0)
cv.setFont('DJB', 9); cv.setFillColor(WHITE)
cv.drawCentredString(W-42.5*mm, y-46*mm, '▶ Згенерувати звіт')

# Footer p1
cv.setFont('DJ', 7.5); cv.setFillColor(T3)
cv.drawString(15*mm, 9*mm, 'HealthPro · Шаблон звіту для лікаря · Пропозиція для узгодження · 16.05.2026')
cv.drawRightString(W-15*mm, 9*mm, 'стор. 1 з 2')

# ══════════════════ PAGE 2 — FULL REPORT SAMPLE ════════════════════════════════
cv.showPage()
cv.setFillColor(WHITE); cv.rect(0, 0, W, H, fill=1, stroke=0)

# ── BLOCK 1: HEADER ──────────────────────────────────────────────────────────
cv.setFillColor(BLUE); cv.rect(0, H-28*mm, W, 28*mm, fill=1, stroke=0)
cv.setFont('DJB', 18); cv.setFillColor(WHITE)
cv.drawString(15*mm, H-13*mm, 'Health')
cv.setFillColor(HexColor('#93C5FD'))
cv.drawString(15*mm + 32*mm, H-13*mm, 'Pro')
cv.setFont('DJ', 8); cv.setFillColor(HexColor('#BFDBFE'))
cv.drawString(15*mm, H-21*mm, 'Звіт для лікаря · Персональний моніторинг здоров\'я')

cv.setFont('DJB', 10); cv.setFillColor(WHITE)
cv.drawRightString(W-15*mm, H-12*mm, 'МЕДИЧНИЙ ЗВІТ')
cv.setFont('DJ', 8); cv.setFillColor(HexColor('#BFDBFE'))
cv.drawRightString(W-15*mm, H-18*mm, 'Дата: 16 травня 2026 р.')
cv.drawRightString(W-15*mm, H-23*mm, 'Стандарт: ESC 2024 (Євростандарт)')

y = H - 32*mm

# ── BLOCK 2: PATIENT ─────────────────────────────────────────────────────────
box(cv, 15*mm, y-28*mm, W-30*mm, 28*mm, LGRAY, BORD, 0.5, 2*mm)
# Left: patient
cv.setFont('DJB', 7); cv.setFillColor(T3)
cv.drawString(18*mm, y-5*mm, 'ПАЦІЄНТ')
cv.setFont('DJB', 13); cv.setFillColor(TEXT)
cv.drawString(18*mm, y-11*mm, 'Петро С.')
cv.setFont('DJ', 8); cv.setFillColor(T2)
cv.drawString(18*mm, y-17*mm, 'Вік: 56 р.  |  Стать: Чоловіча')
cv.drawString(18*mm, y-22*mm, 'Зріст: 174 см  |  Вага: 60 кг  |  ІМТ: 19.8')
cv.drawString(18*mm, y-27*mm, 'Особиста норма: 125/80 мм рт.ст.  |  Пульс: 75 уд/хв')
# Middle: contacts
cv.setFont('DJB', 7); cv.setFillColor(T3)
cv.drawString(W/2-10*mm, y-5*mm, 'КОНТАКТИ')
cv.setFont('DJ', 8); cv.setFillColor(T2)
cv.drawString(W/2-10*mm, y-11*mm, 'Тел: +3807654321')
cv.drawString(W/2-10*mm, y-17*mm, 'Email: test@gmail.com')
# Right: emergency
cv.setFont('DJB', 7); cv.setFillColor(RED)
cv.drawString(W-65*mm, y-5*mm, 'ЕКСТРЕНИЙ КОНТАКТ')
cv.setFont('DJB', 8); cv.setFillColor(RED)
cv.drawString(W-65*mm, y-11*mm, 'Лікар Гаврилюк')
cv.drawString(W-65*mm, y-17*mm, '+3801234567')
y -= 32*mm

# ── BLOCK 3: STATS ───────────────────────────────────────────────────────────
stat_boxes = [
    ('СЕРЕДНІЙ ТИСК (30 Д.)', '131/80', 'мм рт.ст.', BLUE, LBLUE),
    ('СЕРЕДНІЙ ПУЛЬС',        '81',     'уд/хв',     GREEN, LGRN),
    ('ІНДЕКС ЗДОРОВ\'Я',      '85',     '/100 балів', AMBER, LAMB),
    ('ВСЬОГО ВИМІРІВ',        '10',     'за 30 днів', GRAY, LGRAY),
]
sw = (W - 30*mm) / 4
sx = 15*mm
for title, val, unit, fg, bg in stat_boxes:
    box(cv, sx, y-20*mm, sw-2*mm, 20*mm, bg, BORD, 0.3, 2*mm)
    cv.setFont('DJB', 6.5); cv.setFillColor(fg)
    cv.drawCentredString(sx + (sw-2*mm)/2, y-5.5*mm, title)
    cv.setFont('DJB', 16); cv.setFillColor(fg)
    cv.drawCentredString(sx + (sw-2*mm)/2, y-13*mm, val)
    cv.setFont('DJ', 7); cv.setFillColor(T3)
    cv.drawCentredString(sx + (sw-2*mm)/2, y-18*mm, unit)
    sx += sw
y -= 24*mm

# ── BLOCK 4: BP CHART (simplified SVG-like) ──────────────────────────────────
accent_bar(cv, 15*mm, y-22*mm, 8*mm, BLUE)
cv.setFont('DJB', 10); cv.setFillColor(TEXT)
cv.drawString(20*mm, y-4*mm, 'Динаміка тиску — 30 днів')

box(cv, 15*mm, y-36*mm, W-30*mm, 14*mm, LGRAY, BORD, 0.3, 2*mm)
# simplified chart
data_sys = [125, 138, 145, 128, 125, 135, 130, 125, 140, 130, 136]
data_dia = [80, 90, 90, 80, 80, 75, 80, 80, 90, 80, 85]
ch_x0 = 20*mm; ch_x1 = W-20*mm; ch_y0 = y-35*mm; ch_y1 = y-23*mm
ch_w = ch_x1-ch_x0; ch_h = ch_y1-ch_y0
mn, mx = 60, 160
def px_x(i): return ch_x0 + (i/(len(data_sys)-1))*ch_w
def px_y(v): return ch_y0 + ((v-mn)/(mx-mn))*ch_h

# grid line at 140
gy = px_y(140)
cv.setStrokeColor(HexColor('#FCA5A5')); cv.setLineWidth(0.4)
cv.setDash(3, 3); cv.line(ch_x0, gy, ch_x1, gy); cv.setDash()
cv.setFont('DJ', 6); cv.setFillColor(RED); cv.drawString(ch_x0-3*mm, gy-1*mm, '140')

# sys line
cv.setStrokeColor(BLUE); cv.setLineWidth(1.5)
for i in range(len(data_sys)-1):
    cv.line(px_x(i), px_y(data_sys[i]), px_x(i+1), px_y(data_sys[i+1]))
# dia line
cv.setStrokeColor(RED); cv.setLineWidth(1)
for i in range(len(data_dia)-1):
    cv.line(px_x(i), px_y(data_dia[i]), px_x(i+1), px_y(data_dia[i+1]))

# legend
cv.setStrokeColor(BLUE); cv.setLineWidth(1.5)
cv.line(W-55*mm, ch_y1-2*mm, W-50*mm, ch_y1-2*mm)
cv.setFont('DJ', 6.5); cv.setFillColor(BLUE); cv.drawString(W-49*mm, ch_y1-3*mm, 'Сист.')
cv.setStrokeColor(RED); cv.setLineWidth(1)
cv.line(W-43*mm, ch_y1-2*mm, W-38*mm, ch_y1-2*mm)
cv.setFillColor(RED); cv.drawString(W-37*mm, ch_y1-3*mm, 'Діаст.')

# date labels
dates = ['08.05','09.05','10.05','11.05','11.05','11.05','12.05','12.05','12.05','12.05','16.05']
for i in range(0, len(dates), 3):
    cv.setFont('DJ', 5.5); cv.setFillColor(T3)
    cv.drawCentredString(px_x(i), ch_y0-2*mm, dates[i])
y -= 40*mm

# ── BLOCK 5: JOURNAL ─────────────────────────────────────────────────────────
accent_bar(cv, 15*mm, y-8*mm, 8*mm, BLUE)
cv.setFont('DJB', 10); cv.setFillColor(TEXT)
cv.drawString(20*mm, y-4*mm, 'Журнал вимірів (останні 12 з 10 за 30 днів)')
y -= 10*mm

cols = [('Дата', 22*mm), ('Час', 15*mm), ('Тиск', 18*mm), ('Пульс', 14*mm),
        ('Категорія ESC 2024', 40*mm), ('Нотатка', 0)]
# header
hx = 15*mm
cv.setFillColor(BLUE); cv.rect(15*mm, y-6.5*mm, W-30*mm, 6.5*mm, fill=1, stroke=0)
for col, cw in cols:
    cv.setFont('DJB', 7.5); cv.setFillColor(WHITE)
    cv.drawString(hx+1.5*mm, y-4.5*mm, col)
    hx += cw
y -= 7*mm

rows = [
    ('16.05.2026','13:33','125/65','70','Оптимальний','', False),
    ('16.05.2026','12:51','140/90','90','Гіпертензія І ст.','', True),
    ('16.05.2026','11:31','130/80','85','Нормальний','', False),
    ('12.05.2026','19:31','123/74','80','Нормальний','Вечір', False),
    ('12.05.2026','18:10','145/90','95','Гіпертензія І ст.','', True),
    ('12.05.2026','18:06','138/90','120','Гіпертензія І ст.','Стрес', True),
    ('12.05.2026','18:04','125/80','100','Нормальний','Після кави', False),
    ('12.05.2026','08:44','128/80','75','Нормальний','Ранок', False),
]
for i, (date, time, bp, pulse, cat, note, is_warn) in enumerate(rows):
    if y < 15*mm: break
    bg = HexColor('#FFF7ED') if is_warn else (WHITE if i%2==0 else LGRAY)
    cv.setFillColor(bg); cv.rect(15*mm, y-5.5*mm, W-30*mm, 5.5*mm, fill=1, stroke=0)
    hline(cv, y-5.5*mm, c=BORD, lw=0.2)
    hx = 15*mm
    vals = [date, time, bp, pulse, cat, note]
    for j, (val, (_, cw)) in enumerate(zip(vals, cols)):
        col_c = (RED if is_warn and j==4 else (BLUE if j==2 else TEXT))
        cv.setFont('DJB' if j==2 else 'DJ', 7.5); cv.setFillColor(col_c)
        cv.drawString(hx+1.5*mm, y-3.5*mm, str(val)[:22])
        hx += cw
    y -= 5.5*mm

y -= 4*mm

# ── BLOCK 6: MEDICATIONS ─────────────────────────────────────────────────────
if y > 50*mm:
    accent_bar(cv, 15*mm, y-8*mm, 8*mm, PURPLE)
    cv.setFont('DJB', 10); cv.setFillColor(TEXT)
    cv.drawString(20*mm, y-4*mm, 'Ліки — активні призначення')
    y -= 10*mm

    cv.setFillColor(PURPLE); cv.rect(15*mm, y-6.5*mm, W-30*mm, 6.5*mm, fill=1, stroke=0)
    for col, xoff in [('Препарат',15*mm),('Дозування',65*mm),('Час',105*mm),('Розклад',120*mm)]:
        cv.setFont('DJB', 7.5); cv.setFillColor(WHITE)
        cv.drawString(xoff+1.5*mm, y-4.5*mm, col)
    y -= 7*mm

    meds = [
        ('Аспірин', '50 мг', '08:00', 'Вт, Чт, Сб, Нд'),
        ('Ібупрофен', '1200 мг', '09:00', 'Пн–Пт'),
    ]
    for i, (name, dose, time, sched) in enumerate(meds):
        bg = WHITE if i%2==0 else LGRAY
        cv.setFillColor(bg); cv.rect(15*mm, y-5.5*mm, W-30*mm, 5.5*mm, fill=1, stroke=0)
        hline(cv, y-5.5*mm, c=BORD, lw=0.2)
        cv.setFont('DJB', 8); cv.setFillColor(TEXT); cv.drawString(16.5*mm, y-3.5*mm, name)
        cv.setFont('DJ', 8); cv.setFillColor(T2)
        cv.drawString(66.5*mm, y-3.5*mm, dose)
        cv.drawString(106.5*mm, y-3.5*mm, time)
        cv.drawString(121.5*mm, y-3.5*mm, sched)
        y -= 5.5*mm
    y -= 4*mm

# ── BLOCK 7: ADHERENCE (compact) ─────────────────────────────────────────────
if y > 35*mm:
    accent_bar(cv, 15*mm, y-8*mm, 8*mm, PURPLE)
    cv.setFont('DJB', 10); cv.setFillColor(TEXT)
    cv.drawString(20*mm, y-4*mm, 'Прийом ліків — 30 днів')
    cv.setFillColor(GREEN); cv.setFont('DJB', 11)
    cv.drawString(90*mm, y-4.5*mm, '100%')
    y -= 10*mm

    # simple bar chart
    adh_dates = ['08.05','09.05','10.05','11.05','12.05','16.05']
    adh_vals  = [100, 100, 100, 100, 100, 100]
    bw2 = (W-30*mm)/len(adh_dates) - 2*mm
    for i, (d, v) in enumerate(zip(adh_dates, adh_vals)):
        bh = 8*mm * v/100
        bx = 15*mm + i*(bw2+2*mm)
        cv.setFillColor(GREEN); cv.rect(bx, y-9*mm, bw2, bh, fill=1, stroke=0)
        cv.setFont('DJ', 5.5); cv.setFillColor(T3)
        cv.drawCentredString(bx+bw2/2, y-10.5*mm, d)
    # 80% line
    cv.setStrokeColor(T3); cv.setLineWidth(0.4); cv.setDash(3,3)
    cv.line(15*mm, y-1.5*mm, W-15*mm, y-1.5*mm); cv.setDash()
    cv.setFont('DJ', 6); cv.setFillColor(T3); cv.drawString(15*mm, y-0.5*mm, '80%')
    y -= 14*mm

# ── BLOCK 8: DOCTOR NOTES ────────────────────────────────────────────────────
if y > 18*mm:
    box(cv, 15*mm, 16*mm, W-30*mm, y-20*mm, LGRAY, BORD, 0.5, 2*mm)
    cv.setFont('DJB', 8); cv.setFillColor(T3)
    cv.drawString(18*mm, y-5*mm, 'НОТАТКИ ТА РЕКОМЕНДАЦІЇ ЛІКАРЯ:')
    # signature line
    sig_y = 22*mm
    hline(cv, sig_y, 18*mm, W/2-5*mm, T3, 0.5)
    hline(cv, sig_y, W/2+5*mm, W-18*mm, T3, 0.5)
    cv.setFont('DJ', 7); cv.setFillColor(T3)
    cv.drawString(18*mm, sig_y-4*mm, 'Дата огляду: _______________')
    cv.drawString(W/2+5*mm, sig_y-4*mm, 'Підпис / Печатка лікаря: _______________')

# ── DISCLAIMER ───────────────────────────────────────────────────────────────
# Already inside block 8 area at bottom

# Footer p2
cv.setFont('DJ', 7.5); cv.setFillColor(T3)
cv.drawString(15*mm, 9*mm, 'HealthPro · Звіт для лікаря · Автоматично сформовано · Не є медичним висновком')
cv.drawRightString(W-15*mm, 9*mm, 'стор. 2 з 2')

cv.save()
print(f'PDF: {OUT}')
