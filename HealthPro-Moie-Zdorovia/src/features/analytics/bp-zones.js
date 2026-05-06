// analytics/bp-zones.js — BarChart «Розподіл по зонах ВООЗ» (ECharts)
// Використовує db.countByBPCategory() — 6 категорій ВООЗ.

import { createChart, disposeChart } from '../../core/charts.js';
import * as db from '../../core/db.js';
import { t } from '../../i18n/index.js';

const WHO_ORDER = [
  'pressure_optimal',
  'pressure_normal',
  'pressure_high_1',
  'pressure_grade1',
  'pressure_grade2',
  'pressure_grade3',
];

const WHO_COLORS = {
  pressure_optimal: '#1D9E75',
  pressure_normal:  '#4CAF50',
  pressure_high_1:  '#EF9F27',
  pressure_grade1:  '#FF9800',
  pressure_grade2:  '#E24B4A',
  pressure_grade3:  '#A32D2D',
};

const WHO_LABELS = {
  pressure_optimal: 'Оптимальний',
  pressure_normal:  'Нормальний',
  pressure_high_1:  'Підвищений',
  pressure_grade1:  'Ступінь 1',
  pressure_grade2:  'Ступінь 2',
  pressure_grade3:  'Ступінь 3',
};

export async function renderBPZonesChart(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const data = await db.countByBPCategory();
  const total = WHO_ORDER.reduce((s, k) => s + (data[k] || 0), 0);

  if (!total) {
    el.style.height = '';
    el.innerHTML = `<div class="chart-empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><path d="M3 3v18h18"/><path d="m7 16 4-4 4 4 4-4"/></svg><p>${t('c-no-data')}</p></div>`;
    return;
  }

  el.innerHTML = '';
  el.style.height = '260px';
  const chart = createChart(el, 'svg');
  if (!chart) return;

  const values = WHO_ORDER.map(k => data[k] || 0);
  const labels = WHO_ORDER.map(k => WHO_LABELS[k]);
  const colors = WHO_ORDER.map(k => WHO_COLORS[k]);

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 88, right: 30, top: 10, bottom: 28 },
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { lineStyle: { color: '#475569' } },
      splitLine: { lineStyle: { color: 'rgba(99,140,255,0.07)' } },
      axisLabel: { color: '#64748b', fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8', fontSize: 10.5 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(99,140,255,0.18)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params) => {
        const p = params[0];
        const pct = total ? Math.round((p.value / total) * 100) : 0;
        return `${p.name}: <b>${p.value}</b> (${pct}%)`;
      },
    },
    series: [{
      type: 'bar',
      data: values.map((v, i) => ({
        value: v,
        itemStyle: { color: colors[i], borderRadius: [0, 5, 5, 0] },
      })),
      label: {
        show: true,
        position: 'right',
        color: '#94a3b8',
        fontSize: 11,
        formatter: (p) => p.value > 0 ? p.value : '',
      },
      barMaxWidth: 22,
    }],
  });
}

export function disposeBPZonesChart(containerId) {
  const el = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;
  disposeChart(el);
}
