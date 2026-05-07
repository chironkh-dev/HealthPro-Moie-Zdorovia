// analytics/bp-zones.js — BarChart «Розподіл по зонах» (ECharts)
// Підтримує ESC 2024 та AHA 2017 через state.settings.bpStandard.

import { createChart, disposeChart } from '../../core/charts.js';
import * as db from '../../core/db.js';
import { state } from '../../core/state.js';
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

// ESC 2024 (6 категорій)
const WHO_LABELS_ESC = {
  pressure_optimal: 'Оптимальний',
  pressure_normal:  'Нормальний',
  pressure_high_1:  'Підвищений',
  pressure_grade1:  'Ступінь 1',
  pressure_grade2:  'Ступінь 2',
  pressure_grade3:  'Ступінь 3',
};

// AHA 2017 (5 категорій — pressure_grade3 порожній)
const WHO_LABELS_AHA = {
  pressure_optimal: 'Норма',
  pressure_normal:  'Підвищений',
  pressure_high_1:  'HTN Ст. 1',
  pressure_grade1:  'HTN Ст. 2',
  pressure_grade2:  'Криз',
  pressure_grade3:  '',
};

export async function renderBPZonesChart(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  disposeChart(el);

  const std = state.settings?.bpStandard || 'ESC2024';
  const WHO_LABELS = std === 'AHA2017' ? WHO_LABELS_AHA : WHO_LABELS_ESC;

  const data = await db.countByBPCategory();

  // Для AHA виключаємо порожній grade3 зі списку
  const order = std === 'AHA2017'
    ? WHO_ORDER.filter(k => k !== 'pressure_grade3')
    : WHO_ORDER;

  const total = order.reduce((s, k) => s + (data[k] || 0), 0);

  if (!total) {
    el.style.height = '';
    el.innerHTML = `<div class="chart-empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><path d="M3 3v18h18"/><path d="m7 16 4-4 4 4 4-4"/></svg><p>${t('c-no-data')}</p></div>`;
    return;
  }

  el.innerHTML = '';
  el.style.height = order.length < 6 ? '220px' : '260px';
  const chart = createChart(el, 'svg');
  if (!chart) return;

  const values = order.map(k => data[k] || 0);
  const labels = order.map(k => WHO_LABELS[k]);
  const colors = order.map(k => WHO_COLORS[k]);

  // Заголовок стандарту
  const stdLabel = std === 'AHA2017' ? 'AHA 2017' : 'ESC 2024';

  chart.setOption({
    backgroundColor: 'transparent',
    title: {
      text: stdLabel,
      right: 8,
      top: 2,
      textStyle: { color: '#64748b', fontSize: 10, fontWeight: 'normal' },
    },
    grid: { left: 88, right: 46, top: 24, bottom: 28 },
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
