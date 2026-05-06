// analytics/scatter.js — ScatterChart «Кроки ↔ Тиск» (ECharts)
// Використовує db.queryStepPressureCorrelation() — JOIN steps_log × measurements.
// Якщо <10 парних записів — показати empty state, НЕ порожній графік.

import { createChart, disposeChart } from '../../core/charts.js';
import * as db from '../../core/db.js';
import { t } from '../../i18n/index.js';

export async function renderScatterChart(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  // Dispose перед повторним render — WeakMap інакше повертає мертвий інстанс
  disposeChart(el);

  const data = await db.queryStepPressureCorrelation();

  if (data.length < 10) {
    el.style.height = '';
    el.innerHTML = `<div class="chart-empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>${t('t-scatter-empty')}</p></div>`;
    return;
  }

  el.innerHTML = '';
  el.style.height = '260px';

  const renderer = data.length > 500 ? 'canvas' : 'svg';
  const chart = createChart(el, renderer);
  if (!chart) return;

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 52, right: 16, top: 14, bottom: 38 },
    xAxis: {
      name: t('t-scatter-x'),
      type: 'value',
      nameLocation: 'middle',
      nameGap: 26,
      axisLine: { lineStyle: { color: '#475569' } },
      splitLine: { lineStyle: { color: 'rgba(99,140,255,0.07)' } },
      axisLabel: { color: '#64748b', fontSize: 10 },
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
    },
    yAxis: {
      name: t('t-scatter-y'),
      type: 'value',
      nameLocation: 'middle',
      nameGap: 38,
      axisLine: { lineStyle: { color: '#475569' } },
      splitLine: { lineStyle: { color: 'rgba(99,140,255,0.07)' } },
      axisLabel: { color: '#64748b', fontSize: 10 },
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(99,140,255,0.18)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (p) =>
        `${t('t-scatter-x')}: <b>${p.data[0]}</b><br>${t('t-scatter-y')}: <b>${p.data[1]} мм рт.ст.</b>`,
    },
    series: [{
      type: 'scatter',
      data: data.map(r => [r.steps, r.sys]),
      symbolSize: 7,
      itemStyle: { color: '#3b82f6', opacity: 0.72 },
    }],
  });
}

export function disposeScatterChart(containerId) {
  const el = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;
  disposeChart(el);
}
