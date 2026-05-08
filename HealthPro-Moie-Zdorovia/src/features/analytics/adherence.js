// Adherence chart — 30-day medication adherence trend.
// Computes daily adherence from state.pillsTaken (always available, no async needed).
// Renders as ECharts line chart with WHO 80% mark-line.

import { createChart, disposeChart } from '../../core/charts.js';
import { state } from '../../core/state.js';
import { t } from '../../i18n/index.js';

function computeDailyAdherence(days = 30) {
  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayMap = state.pillsTaken?.[dateStr] || {};
    const vals = Object.values(dayMap);
    if (vals.length === 0) continue;
    const pct = Math.round(vals.filter((v) => v).length / vals.length * 100);
    const lbl = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({ date: lbl, pct });
  }
  return result;
}

export function renderAdherenceChart(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const data = computeDailyAdherence(30);

  if (!data || data.length < 3) {
    el.style.height = '';
    disposeChart(el);
    el.innerHTML = `<div class="empty-state" style="padding:14px 0"><p>${t('t-adherence-empty')}</p></div>`;
    return;
  }

  el.style.height = '200px';
  disposeChart(el);

  const chart = createChart(el, 'svg');
  const avgPct = data.reduce((s, d) => s + d.pct, 0) / data.length;
  const lineColor = avgPct >= 80 ? '#22c55e' : '#ef4444';

  chart.setOption({
    grid: { top: 14, right: 18, bottom: 30, left: 44 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.date),
      axisLabel: { fontSize: 10, color: '#94a3b8', interval: Math.floor(data.length / 5) },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value', min: 0, max: 100,
      axisLabel: { formatter: '{value}%', fontSize: 10, color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
    },
    series: [{
      type: 'line', smooth: true,
      data: data.map((d) => d.pct),
      lineStyle: { color: lineColor, width: 2 },
      itemStyle: { color: lineColor },
      areaStyle: { color: lineColor, opacity: 0.08 },
      symbol: 'circle', symbolSize: 4,
      markLine: {
        silent: true,
        data: [{
          yAxis: 80,
          lineStyle: { color: '#64748b', type: 'dashed', width: 1 },
          label: { formatter: 'ВООЗ 80%', position: 'end', fontSize: 10, color: '#64748b' },
        }],
      },
    }],
  });
}

export function disposeAdherenceChart(containerId) {
  const el = document.getElementById(containerId);
  if (el) disposeChart(el);
}
