// 14-денний модальний графік тиску — ECharts SVGRenderer.
// sys (червона лінія) + dia (синя лінія), tooltip, markLine норми.

import { state } from '../../core/state.js';
import { getBPStatus } from '../pressure/index.js';
import { formatDate } from '../../core/utils.js';
import { t } from '../../i18n/index.js';
import { createChart, disposeChart, COLORS } from '../../core/charts.js';

const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

let _modalChartEl = null;

export function openTrendModal() {
  const modal = document.getElementById('trendModal');
  if (!modal) return;
  modal.classList.add('show');

  const all    = state.measurements;
  const statsEl = document.getElementById('trendModalStats');

  if (!all.length) {
    if (statsEl) statsEl.innerHTML = `<p style="color:var(--text2);font-size:13px">${t('a-score-no-data')}</p>`;
    return;
  }

  const last14 = all.slice(0, 14).reverse();
  const aS = avg(last14.map((m) => m.sys));
  const aD = avg(last14.map((m) => m.dia));

  if (statsEl) {
    statsEl.innerHTML = `
      <div class="bento" style="margin-bottom:0">
        <div class="bento-card bc-blue">
          <div class="b-lbl">${t('a-trend-avg-14')}</div>
          <div class="b-val">${aS || '—'}/${aD || '—'}</div>
        </div>
        <div class="bento-card bc-${aS && aS < 140 ? 'green' : 'red'}">
          <div class="b-lbl">${t('a-trend-status')}</div>
          <div class="b-val sm">${aS && aD ? getBPStatus(aS, aD).label.replace(/[🚨▲⚠✓⬇️]/g, '').trim() : '—'}</div>
        </div>
      </div>`;
  }

  // Невелика затримка, щоб модал встиг з'явитись і отримати розміри
  setTimeout(() => {
    const el = document.getElementById('trendChart');
    if (!el || !all.length) return;
    _modalChartEl = el;

    const data = all.slice(0, 20).reverse();
    if (data.length < 2) return;

    const dates  = data.map((d) => formatDate(d.time));
    const sysSer = data.map((d) => d.sys);
    const diaSer = data.map((d) => d.dia);

    // ECharts потребує явної висоти
    el.style.height = '180px';

    const chart = createChart(el, 'svg');
    chart.setOption({
      animation: true,
      animationDuration: 400,
      grid: { left: 36, right: 12, top: 12, bottom: 28, containLabel: false },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: {
          fontSize: 9, color: COLORS.text3,
          interval: Math.max(0, Math.floor(dates.length / 5) - 1),
          rotate: dates.length > 10 ? 30 : 0,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { fontSize: 10, color: COLORS.text3 },
        splitLine: { lineStyle: { color: COLORS.grid, width: 1 } },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter(params) {
          const d   = data[params[0].dataIndex];
          const st  = getBPStatus(d.sys, d.dia);
          const col = st.cls === 'badge-ok' ? COLORS.green
                    : st.cls === 'badge-warn' ? COLORS.amber : COLORS.red;
          return `<b>${params[0].axisValue}</b><br/>
            <span style="color:${COLORS.red}">Сис: ${d.sys}</span> &nbsp;
            <span style="color:${COLORS.blue}">Діас: ${d.dia}</span><br/>
            <span style="color:${col}">${st.label.replace(/[🚨▲⚠✓⬇️]/g, '').trim()}</span>`;
        },
      },
      series: [
        {
          name: 'Сис', type: 'line', data: sysSer, smooth: 0.2,
          symbol: 'circle', symbolSize: 4,
          lineStyle: { color: COLORS.red, width: 2.5 },
          itemStyle: { color: COLORS.red },
        },
        {
          name: 'Діас', type: 'line', data: diaSer, smooth: 0.2,
          symbol: 'circle', symbolSize: 4,
          lineStyle: { color: COLORS.blue, width: 2 },
          itemStyle: { color: COLORS.blue },
        },
      ],
    });
  }, 120);
}

export function closeTrendModal(e) {
  const modal = document.getElementById('trendModal');
  if (!modal) return;
  if (e && e.target !== modal) return;
  modal.classList.remove('show');
  // Знищуємо екземпляр щоб не витрачати пам'ять коли модал закритий
  if (_modalChartEl) {
    disposeChart(_modalChartEl);
    _modalChartEl = null;
  }
}
