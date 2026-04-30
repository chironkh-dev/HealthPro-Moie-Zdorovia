import { state } from '../../core/state.js';
import { formatTime, formatDate } from '../../core/utils.js';
import { t } from '../../i18n/index.js';
import {
  CHART_COLORS,
  CHART_PADDING,
  computeScale,
  makeProjectors,
  drawGrid,
  drawSeries,
  drawXLabels,
} from './helpers.js';

// ─── Chart-local state ───
let chartPeriod = 7;
let showPulse = true;
let chartDataCache = [];
let chartPointsCache = [];

export function getChartPeriod() { return chartPeriod; }
export function isPulseVisible() { return showPulse; }

export function setChartPeriod(days, btn) {
  chartPeriod = days;
  document.querySelectorAll('.cp-btn').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderChart();
}

export function togglePulseChart() {
  showPulse = !showPulse;
  const dot     = document.getElementById('pulseToggleDot');
  const legend  = document.getElementById('pulseLegend');
  const ttRow   = document.getElementById('cttPulseRow');
  if (dot)    dot.classList.toggle('off', !showPulse);
  if (legend) legend.style.opacity = showPulse ? '1' : '.35';
  if (ttRow)  ttRow.style.display = showPulse ? 'flex' : 'none';
  renderChart();
}

export function renderChart() {
  const canvas = document.getElementById('bpChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 300;
  const H = 155;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  let data = state.measurements.slice();
  if (chartPeriod > 0) {
    const cutoff = new Date(Date.now() - chartPeriod * 864e5);
    data = data.filter((m) => new Date(m.time) > cutoff);
  }
  data = data.reverse();
  chartDataCache = data;

  if (data.length < 2) {
    ctx.fillStyle = '#64748b';
    ctx.font = '600 12px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('c-no-data'), W / 2, H / 2);
    chartPointsCache = [];
    return;
  }

  const scale = computeScale(data, showPulse);
  const { xP, yP } = makeProjectors({
    width: W,
    height: H,
    padding: CHART_PADDING,
    count: data.length,
    scale,
  });

  drawGrid(ctx, { width: W, height: H, padding: CHART_PADDING, scale });

  drawSeries(ctx, { data, getValue: (d) => d.sys, color: CHART_COLORS.sys, glow: CHART_COLORS.sysGlow, xP, yP, isDark: state.isDark });
  drawSeries(ctx, { data, getValue: (d) => d.dia, color: CHART_COLORS.dia, glow: CHART_COLORS.diaGlow, xP, yP, isDark: state.isDark });
  if (showPulse) {
    drawSeries(ctx, { data, getValue: (d) => d.pulse, color: CHART_COLORS.pulse, glow: CHART_COLORS.pulseGlow, xP, yP, isDark: state.isDark });
  }

  chartPointsCache = data.map((d, i) => ({
    d,
    x: xP(i),
    sys: d.sys,
    dia: d.dia,
    pulse: d.pulse,
    time: d.time,
  }));

  drawXLabels(ctx, { data, height: H, xP, formatDate });
}

export function setupChartTooltip() {
  const canvas  = document.getElementById('bpChart');
  const tooltip = document.getElementById('chartTooltip');
  if (!canvas || !tooltip) return;

  function handleInteraction(e) {
    if (!chartPointsCache.length) {
      tooltip.classList.remove('show');
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

    let nearest = null;
    let minDist = Infinity;
    chartPointsCache.forEach((p) => {
      const d = Math.abs(p.x - cx);
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    });
    if (!nearest || minDist > 30) {
      tooltip.classList.remove('show');
      return;
    }

    document.getElementById('cttDate').textContent  = formatDate(nearest.time) + ' ' + formatTime(nearest.time);
    document.getElementById('cttSys').textContent   = t('c-tt-sys')  + nearest.sys + ' мм';
    document.getElementById('cttDia').textContent   = t('c-tt-dia')  + nearest.dia + ' мм';
    document.getElementById('cttPulse').textContent = t('c-tt-pulse') + (nearest.pulse || '—');

    const canvasW = rect.width;
    const left = nearest.x < canvasW / 2 ? nearest.x + 10 : nearest.x - 125;
    tooltip.style.left = Math.max(0, Math.min(left, canvasW - 120)) + 'px';
    tooltip.style.top = '5px';
    tooltip.classList.add('show');
    e.preventDefault();
  }
  function hideTooltip() { tooltip.classList.remove('show'); }

  canvas.addEventListener('mousemove',  handleInteraction);
  canvas.addEventListener('mouseleave', hideTooltip);
  canvas.addEventListener('touchstart', handleInteraction, { passive: false });
  canvas.addEventListener('touchmove',  handleInteraction, { passive: false });
  canvas.addEventListener('touchend',   () => setTimeout(hideTooltip, 1200));
}
