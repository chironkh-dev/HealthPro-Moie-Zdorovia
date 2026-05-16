// ІЗ-тренд: лінійний графік Індексу Здоров'я за 30 днів.
// Дані: db.calcHealthIndexTrend() → {date, sys, dia, pulse, n}
// Скор на день: BP-компонент (0-40) + Pulse-компонент (0-20) → шкала 0-100.

import { createChart, disposeChart, COLORS } from '../../core/charts.js';
import { calcHealthIndexTrend } from '../../core/db.js';
import { calcScoreForDay } from './health-score.js';
import { t } from '../../i18n/index.js';

// ── Форматування дати ─────────────────────────────────────────────────────────

function fmtDate(iso) {
  const [, m, d] = iso.split('-');
  return d + '.' + m;
}

// ── Рендер ────────────────────────────────────────────────────────────────────

let _chartEl = null;

export async function renderIZChart() {
  const el = document.getElementById('izTrendChart');
  if (!el) return;

  // Завжди dispose перед повторним render — без цього WeakMap повертає
  // мертвий інстанс після el.innerHTML='' і графік не малюється.
  disposeChart(el);
  _chartEl = el;

  const trend = await calcHealthIndexTrend(30);
  if (!trend.length) {
    el.innerHTML = `<div class="empty-state" style="padding:20px 14px">
      <p style="font-size:13px;color:var(--text2);text-align:center">${t('a-score-add-3')}</p>
    </div>`;
    return;
  }

  const dates  = trend.map(r => fmtDate(r.date));
  const scores = trend.map(r => calcScoreForDay(r.sys, r.dia, r.pulse));

  // Колір точки залежить від значення
  const pointColors = scores.map(s =>
    s >= 80 ? COLORS.green : s >= 60 ? COLORS.amber : COLORS.red,
  );

  // Очищаємо placeholder-текст перед ініціалізацією
  el.innerHTML = '';
  el.style.height = '180px';

  const chart = createChart(el, 'svg');

  chart.setOption({
    animation: true,
    animationDuration: 600,
    grid: {
      left: 36, right: 12, top: 16, bottom: 28,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine:  { show: false },
      axisTick:  { show: false },
      axisLabel: {
        fontSize: 10,
        color: COLORS.text3,
        interval: Math.max(0, Math.floor(dates.length / 6) - 1),
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0, max: 100,
      interval: 20,
      axisLine:  { show: false },
      axisTick:  { show: false },
      axisLabel: { fontSize: 10, color: COLORS.text3 },
      splitLine: {
        lineStyle: { color: COLORS.grid, width: 1 },
      },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter(params) {
        const p  = params[0];
        const i  = p.dataIndex;
        const sc = scores[i];
        const r  = trend[i];
        const col = sc >= 80 ? COLORS.green : sc >= 60 ? COLORS.amber : COLORS.red;
        return `<b style="color:${col}">${p.axisValue}</b><br/>ІЗ: <b style="color:${col}">${sc}</b> бал<br/>Тиск: ${r.sys}/${r.dia}` +
          (r.pulse ? `<br/>Пульс: ${r.pulse} уд/хв` : '');
      },
    },
    series: [{
      type: 'line',
      data: scores,
      smooth: 0.3,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { width: 2, color: COLORS.blue },
      itemStyle: {
        color(params) { return pointColors[params.dataIndex]; },
        borderWidth: 0,
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0,   color: 'rgba(59,130,246,0.22)' },
            { offset: 1,   color: 'rgba(59,130,246,0.02)' },
          ],
        },
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed', width: 1 },
        label: { fontSize: 9, color: COLORS.text3 },
        data: [
          { yAxis: 80, lineStyle: { color: COLORS.green },  label: { formatter: '80' } },
          { yAxis: 60, lineStyle: { color: COLORS.amber }, label: { formatter: '60' } },
        ],
      },
    }],
  });
}

export function disposeIZChart() {
  if (_chartEl) {
    disposeChart(_chartEl);
    _chartEl = null;
  }
}
