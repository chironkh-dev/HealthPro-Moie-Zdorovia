// Personalised recommendations: BP / pulse / BMI / pills / trend / lifestyle.

import { state, today } from '../../core/state.js';
import { getBPNorm } from '../pressure/index.js';
import { isPillDueToday } from '../meds/index.js';
import { calcBMI } from './bmi.js';
import { RECO_T } from '../../i18n/recommendations.i18n.js';

const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
const fmt = (s, vars = {}) => {
  let out = s;
  Object.keys(vars).forEach((k) => { out = out.split('{' + k + '}').join(String(vars[k])); });
  return out;
};

export const RECO_SVG = {
  crisis:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  high_bp:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  warn_bp:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  ok_bp:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
  low_bp:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
  age:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>',
  tachy:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  brady:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  ok_pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><polyline points="20 6 9 17 4 12" style="transform:translate(0,2px)"/></svg>',
  bmi:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="2" y1="20" x2="22" y2="20"/><path d="M4 20V10l8-8 8 8v10"/></svg>',
  pill:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>',
  ok_pill:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/><polyline points="7 13 10 16 14 11"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  trend_up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  food:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a10 10 0 0 1 10 10H2A10 10 0 0 1 12 2z"/><line x1="12" y1="12" x2="12" y2="22"/><path d="M2 12h20"/></svg>',
  sleep:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
};

export function generateAdvice(s, d, p) {
  const L = RECO_T[state.lang] || RECO_T.uk;
  const tips = [];
  if (s >= 140 || d >= 90) tips.push(L.advTipsHigh);
  if (s < 100 || d < 60)   tips.push(L.advTipsLow);
  if (p) {
    if (p > 100) tips.push(L.advTipsTachy);
    else if (p < 50) tips.push(L.advTipsBrady);
  }
  if (tips.length === 0) tips.push(L.advTipsOk);
  return tips.join(' ');
}

export function renderRecommendations() {
  const L = RECO_T[state.lang] || RECO_T.uk;
  const all = state.measurements;
  const pills = state.pills;
  const pillsTaken = state.pillsTaken;
  const settings = state.settings;
  const listEl = document.getElementById('recoList');
  if (!listEl) return;
  if (!all.length) {
    listEl.innerHTML = `<div class="empty-state" style="padding:12px"><div class="em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg></div><p>${L.emptyAddMeas}</p></div>`;
    return;
  }
  const last = all[0];
  const last7 = all.filter((m) => new Date(m.time) > new Date(Date.now() - 7 * 864e5));
  const aS = last7.length ? avg(last7.map((m) => m.sys)) : last.sys;
  const aD = last7.length ? avg(last7.map((m) => m.dia)) : last.dia;
  const n = getBPNorm();
  const age = parseInt(settings.age, 10) || 50;
  const bmi = calcBMI();
  const recos = [];

  if (last.sys >= 180 || last.dia >= 120) recos.push({ t: 'danger', i: 'crisis',
    h: L.crisisH, s: L.crisisS, detail: L.crisisD,
    links: [{ l: L.linkAmb, u: 'tel:103' }, { l: L.linkWHO, u: L.linkWHOurl }, { l: L.helsi, u: 'https://helsi.me' }] });
  else if (aS >= 160 || aD >= 100) recos.push({ t: 'danger', i: 'high_bp',
    h: L.highH, s: fmt(L.highS, { sys: aS, dia: aD }), detail: L.highD,
    links: [{ l: L.linkWHO, u: L.linkWHOurl }, { l: L.helsi, u: 'https://helsi.me' }] });
  else if (aS >= n.sysWarn || aD >= n.diaWarn) recos.push({ t: 'warn', i: 'warn_bp',
    h: L.warnH, s: fmt(L.warnS, { age, note: n.note }), detail: fmt(L.warnD, { sysWarn: n.sysWarn, diaWarn: n.diaWarn }),
    links: [{ l: L.linkMozMeasure, u: L.linkMozMeasureUrl }, { l: L.helsi, u: 'https://helsi.me' }] });
  // REC-1: тиск вищий за sysOk (персональну/вікову норму) але нижчий за sysWarn → м'яке попередження
  else if (aS > n.sysOk || aD > n.diaOk) recos.push({ t: 'warn', i: 'warn_bp',
    h: L.warnH, s: fmt(L.warnS, { age, note: n.note }), detail: fmt(L.warnD, { sysWarn: n.sysOk, diaWarn: n.diaOk }),
    links: [{ l: L.linkMozMeasure, u: L.linkMozMeasureUrl }, { l: L.helsi, u: 'https://helsi.me' }] });
  else if (aS < 85 || aD < 55) recos.push({ t: 'warn', i: 'low_bp',
    h: L.lowH, s: L.lowS, detail: L.lowD,
    links: [{ l: L.helsi, u: 'https://helsi.me' }] });
  else recos.push({ t: 'ok', i: 'ok_bp',
    h: L.okH, s: fmt(L.okS, { sys: aS, dia: aD, note: n.note }), detail: L.okD,
    links: [{ l: L.okLink, u: L.okLinkUrl }] });

  if (age >= 60) recos.push({ t: 'info', i: 'age',
    h: fmt(L.ageH, { age }), s: n.note, detail: fmt(L.ageD, { sysWarn: n.sysWarn, diaWarn: n.diaWarn }),
    links: [{ l: L.helsi, u: 'https://helsi.me' }] });

  const pp = last7.filter((m) => m.pulse).map((m) => m.pulse);
  if (pp.length) {
    const aP = avg(pp);
    if (aP > 100) recos.push({ t: 'warn', i: 'tachy',
      h: fmt(L.tachyH, { p: aP }), s: L.tachyS, detail: L.tachyD,
      links: [{ l: L.helsi, u: 'https://helsi.me' }] });
    else if (aP < 55) recos.push({ t: 'warn', i: 'brady',
      h: fmt(L.bradyH, { p: aP }), s: L.bradyS, detail: L.bradyD,
      links: [{ l: L.helsi, u: 'https://helsi.me' }] });
    else recos.push({ t: 'ok', i: 'ok_pulse',
      h: fmt(L.okPulseH, { p: aP }), s: L.okPulseS, detail: L.okPulseD,
      links: [] });
  }

  if (bmi && bmi > 27) recos.push({ t: 'warn', i: 'bmi',
    h: L.bmiH, s: fmt(L.bmiS, { bmi }), detail: L.bmiD,
    links: [{ l: L.helsi, u: 'https://helsi.me' }] });

  const dp = pills.filter(isPillDueToday);
  if (dp.length) {
    const miss = dp.filter((p) => !pillsTaken[today()]?.[p.id]);
    if (miss.length) recos.push({ t: 'warn', i: 'pill',
      h: fmt(L.pillH, { names: miss.map((p) => p.name).join(', ') }), s: L.pillS, detail: L.pillD,
      links: [{ l: L.pillLink, u: 'https://tabletki.ua' }] });
    else recos.push({ t: 'ok', i: 'ok_pill',
      h: L.okPillH, s: L.okPillS, detail: L.okPillD,
      links: [] });
  }

  if (last7.length < 5 && all.length > 0) recos.push({ t: 'info', i: 'calendar',
    h: L.calH, s: fmt(L.calS, { n: last7.length }), detail: L.calD,
    links: [{ l: L.helsi, u: 'https://helsi.me' }] });

  if (all.length >= 5) {
    const r = avg(all.slice(0, 3).map((m) => m.sys));
    const o = avg(all.slice(-3).map((m) => m.sys));
    if (r - o > 15) recos.push({ t: 'danger', i: 'trend_up',
      h: L.trH, s: fmt(L.trS, { d: r - o }), detail: L.trD,
      links: [{ l: L.helsi, u: 'https://helsi.me' }] });
  }

  recos.push({ t: 'info', i: 'activity',
    h: L.actH, s: L.actS, detail: L.actD,
    links: [{ l: L.actLink, u: L.actLinkUrl }] });
  recos.push({ t: 'info', i: 'food',
    h: L.foodH, s: L.foodS, detail: L.foodD,
    links: [{ l: L.foodLink, u: L.foodLinkUrl }] });
  recos.push({ t: 'info', i: 'sleep',
    h: L.sleepH, s: L.sleepS, detail: L.sleepD,
    links: [{ l: L.sleepLink, u: L.sleepLinkUrl }] });

  listEl.innerHTML = recos.map((r, i) => `
    <div class="reco-item ri-${r.t}">
      <div class="reco-header" data-action="toggleReco" data-idx="${i}">
        <div class="reco-icon">${RECO_SVG[r.i] || RECO_SVG.warn_bp}</div>
        <div class="reco-main"><div class="reco-title">${r.h}</div><div class="reco-short">${r.s}</div></div>
        <div class="reco-chevron" id="rchev-${i}">›</div>
      </div>
      <div class="reco-body" id="rbody-${i}">
        <div class="reco-detail">${r.detail}</div>
        ${r.links.length ? `<div class="reco-links">${r.links.map((l) => `<a class="reco-link" href="${l.u}" ${l.u.startsWith('http') ? 'target="_blank"' : ''}>${l.l}</a>`).join('')}</div>` : ''}
      </div>
    </div>`).join('');
}

export function toggleReco(i) {
  const b = document.getElementById(`rbody-${i}`);
  const ch = document.getElementById(`rchev-${i}`);
  if (!b || !ch) return;
  const open = b.style.display === 'block';
  b.style.display = open ? 'none' : 'block';
  ch.style.transform = open ? '' : 'rotate(90deg)';
}
