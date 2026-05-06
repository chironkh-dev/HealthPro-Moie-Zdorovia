// Analytics page: dashboard cards (score, BP, pulse, trend, BMI) and detail modals.

import { state, today } from '../../core/state.js';
import { getBPNorm, getBPStatus, getWHOCategory } from '../pressure/index.js';
import { isPillDueToday } from '../meds/index.js';
import { t, tt } from '../../i18n/index.js';
import { calcHealthScore, getDetailedScores, toggleHealthTooltip } from './health-score.js';
import { renderBMI } from './bmi.js';
import { renderRecommendations } from './recommendations.js';
import { renderIZChart } from './iz-chart.js';

const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

export function renderAnalytics() {
  const all = state.measurements;
  const pills = state.pills;
  const pillsTaken = state.pillsTaken;
  const last7 = all.filter((m) => new Date(m.time) > new Date(Date.now() - 7 * 864e5));

  // Score (with breakdown)
  const scoreResult = all.length ? calcHealthScore() : null;
  const score  = scoreResult?.score  ?? null;
  const status = scoreResult?.status ?? null;
  const detail = getDetailedScores();
  const circ = 226;
  const fill = document.getElementById('scoreRingFill');
  // Force red when a VETO is active, regardless of numeric score.
  const sc = score === null
    ? '#475569'
    : (detail?.isVetoApplied ? '#ef4444' : score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444');
  if (fill) {
    fill.setAttribute('stroke-dashoffset', score === null ? circ : circ - (circ * (score / 100)));
    fill.setAttribute('stroke', sc);
  }
  const scoreNum = document.getElementById('scoreNum');
  if (scoreNum) scoreNum.innerHTML = `<span style="color:${sc}">${score === null ? '—' : score}</span><small id="t-score-bal">бал</small>`;
  const scoreTitle = document.getElementById('scoreTitle');
  if (scoreTitle) scoreTitle.textContent = score === null
    ? t('a-score-no-data')
    : status === 'crisis'         ? t('hs-veto-crisis')
    : status === 'hypertension-2' ? t('hs-veto-ht2')
    : status === 'hypotension'    ? t('hs-veto-hypo')
    : score >= 80 ? t('a-score-excellent')
    : score >= 65 ? t('a-score-good')
    : score >= 50 ? t('a-score-fair')
    : t('a-score-poor');
  const scoreDesc = document.getElementById('scoreDesc');
  if (scoreDesc) scoreDesc.textContent = score === null
    ? t('a-score-add-3')
    : score >= 80 ? t('a-score-desc-good')
    : score >= 65 ? t('a-score-desc-fair')
    : score >= 50 ? t('a-score-desc-poor')
    : t('a-score-desc-bad');
  const stBP = document.getElementById('scoreTargetBP');
  if (stBP && all.length) {
    const n = getBPNorm();
    const aS = last7.length ? avg(last7.map((m) => m.sys)) : all[0].sys;
    stBP.textContent = tt('a-target-bp', { val: n.sysWarn });
    stBP.style.color = aS < n.sysWarn ? 'var(--green)' : 'var(--amber)';
  }

  // Breakdown bars
  if (score !== null && detail) {
    const breakEl = document.getElementById('scoreBreakdown');
    if (breakEl) breakEl.innerHTML = `
      <div class="score-bar-row"><div class="score-bar-label">${t('a-bd-bp')}</div><div class="score-bar-track"><div class="score-bar-fill" style="width:${(detail.bp / 40) * 100}%;background:${detail.bp >= 30 ? 'var(--green)' : detail.bp >= 15 ? 'var(--amber)' : 'var(--red)'}"></div></div><span style="font-size:10px;color:var(--text3);width:28px;text-align:right">${detail.bp}/40</span></div>
      <div class="score-bar-row"><div class="score-bar-label">${t('a-bd-pulse')}</div><div class="score-bar-track"><div class="score-bar-fill" style="width:${(detail.pulse / 20) * 100}%;background:${detail.pulse >= 15 ? 'var(--green)' : detail.pulse >= 10 ? 'var(--amber)' : 'var(--red)'}"></div></div><span style="font-size:10px;color:var(--text3);width:28px;text-align:right">${detail.pulse}/20</span></div>
      <div class="score-bar-row"><div class="score-bar-label">${t('a-bd-pills')}</div><div class="score-bar-track"><div class="score-bar-fill" style="width:${(detail.pills / 20) * 100}%;background:${detail.pills >= 15 ? 'var(--green)' : detail.pills >= 10 ? 'var(--amber)' : 'var(--red)'}"></div></div><span style="font-size:10px;color:var(--text3);width:28px;text-align:right">${detail.pills}/20</span></div>
      <div class="score-bar-row"><div class="score-bar-label">${t('a-bd-bmi')}</div><div class="score-bar-track"><div class="score-bar-fill" style="width:${(detail.bmi / 10) * 100}%;background:${detail.bmi >= 8 ? 'var(--green)' : detail.bmi >= 4 ? 'var(--amber)' : 'var(--red)'}"></div></div><span style="font-size:10px;color:var(--text3);width:28px;text-align:right">${detail.bmi}/10</span></div>
      <div class="score-bar-row"><div class="score-bar-label">${t('a-bd-activity')}</div><div class="score-bar-track"><div class="score-bar-fill" style="width:${(detail.activity / 10) * 100}%;background:${detail.activity >= 8 ? 'var(--green)' : detail.activity >= 5 ? 'var(--amber)' : 'var(--red)'}"></div></div><span style="font-size:10px;color:var(--text3);width:28px;text-align:right">${detail.activity}/10</span></div>`;
  }

  // Avg BP — last 7 measurements
  const last7m = all.slice(0, 7);
  const bpValEl = document.getElementById('avgBP7');
  const bpSubEl = document.getElementById('avgBP7sub');
  if (bpValEl && bpSubEl) {
    if (last7m.length) {
      const aS = avg(last7m.map((m) => m.sys));
      const aD = avg(last7m.map((m) => m.dia));
      bpValEl.textContent = aS + '/' + aD;
      const st = getBPStatus(aS, aD);
      bpSubEl.textContent = st.label.replace(/[🚨▲⚠✓⬇️]/g, '').trim();
      const bpColor = st.cls === 'badge-ok' ? 'var(--green)' : st.cls === 'badge-warn' ? 'var(--amber)' : st.cls === 'badge-crit' ? 'var(--red)' : '';
      bpValEl.style.color = bpColor;
      bpSubEl.style.color = bpColor;
    } else {
      bpValEl.textContent = '—';
      bpSubEl.textContent = t('a-no-data');
      bpValEl.style.color = '';
      bpSubEl.style.color = '';
    }
  }

  // Trend
  const trendVal = document.getElementById('trendVal');
  const trendSub = document.getElementById('trendSub');
  if (trendVal && trendSub) {
    if (all.length >= 5) {
      const r = avg(all.slice(0, 5).map((m) => m.sys));
      const o = avg(all.slice(Math.max(0, all.length - 5)).map((m) => m.sys));
      const diff = r - o;
      trendVal.textContent = Math.abs(diff) < 3 ? t('a-trend-stable') : diff < -3 ? t('a-trend-down') : t('a-trend-up');
      trendSub.textContent = Math.abs(diff) < 3
        ? t('a-trend-stable-sub')
        : diff < -3 ? tt('a-trend-down-sub', { n: Math.abs(Math.round(diff)) })
                    : tt('a-trend-up-sub',   { n: Math.round(diff) });
    } else {
      trendVal.textContent = '—';
      trendSub.textContent = t('a-trend-need-5');
    }
  }

  // WHO
  const whoEl = document.getElementById('whoCategory');
  const whoSubEl = document.getElementById('whoCategorySub');
  if (whoEl && whoSubEl && all.length) {
    const who = getWHOCategory(all[0].sys, all[0].dia);
    whoEl.textContent = who.label;
    whoEl.style.color = who.c;
    whoSubEl.textContent = who.sub + t('a-who-tap');
  }

  // Total
  const totalEl = document.getElementById('totalMeasurements');
  const totalSubEl = document.getElementById('totalMeasurementsSub');
  if (totalEl) totalEl.textContent = all.length;
  if (totalSubEl) totalSubEl.textContent = tt('a-week-prefix', { n: last7.length });

  // Adherence
  const adhEl = document.getElementById('pillAdherence');
  if (adhEl) {
    const dp = pills.filter(isPillDueToday);
    if (dp.length) {
      const tc = Object.values(pillsTaken[today()] || {}).filter(Boolean).length;
      adhEl.textContent = Math.round((tc / dp.length) * 100) + '%';
    } else adhEl.textContent = '—';
  }

  // Max/Min
  const maxEl = document.getElementById('maxSys');
  const minEl = document.getElementById('minSysLabel');
  if (maxEl && minEl && all.length) {
    const sa = all.map((m) => m.sys);
    const maxV = Math.max(...sa);
    const minV = Math.min(...sa);
    const n = getBPNorm();
    maxEl.textContent = maxV;
    minEl.textContent = t('a-min-prefix') + '\u00a0' + minV;
    const maxColor = maxV >= 180 ? 'var(--red)' : maxV >= n.sysWarn ? 'var(--amber)' : maxV > n.sysOk ? 'var(--amber)' : 'var(--green)';
    const minColor = minV < 90 ? 'var(--red)' : minV < 100 ? 'var(--amber)' : 'var(--green)';
    maxEl.style.color = maxColor;
    minEl.style.color = minColor;
  }

  // Pulse — last 7 measurements
  const pulseEl = document.getElementById('avgPulse7');
  if (pulseEl) {
    const pp = last7m.filter((m) => m.pulse);
    const avgPulse7Val = pp.length ? Math.round(pp.reduce((acc, m) => acc + (m.pulse || 0), 0) / pp.length) : null;
    pulseEl.textContent = avgPulse7Val || '—';
    if (avgPulse7Val) {
      const pulseColor = avgPulse7Val >= 120 || avgPulse7Val <= 50 ? 'var(--red)' : avgPulse7Val > 100 || avgPulse7Val < 60 ? 'var(--amber)' : 'var(--green)';
      pulseEl.style.color = pulseColor;
    } else pulseEl.style.color = '';
  }

  // Normal %
  const pctEl = document.getElementById('pctNormal');
  if (pctEl && all.length) {
    const n = getBPNorm();
    pctEl.textContent = Math.round((all.filter((m) => m.sys < n.sysWarn && m.dia < n.diaWarn).length / all.length) * 100) + '%';
  }

  renderBMI();
  renderRecommendations();
  renderIZChart();
}

export { calcHealthScore, getDetailedScores, toggleHealthTooltip } from './health-score.js';
export { calcBMI, getBMICategory, renderBMI } from './bmi.js';
export { RECO_SVG, generateAdvice, renderRecommendations, toggleReco } from './recommendations.js';
export { openTrendModal, closeTrendModal } from './trend-modal.js';
export { renderIZChart, disposeIZChart } from './iz-chart.js';
