// BMI calculation, classification and rendering.

import { state } from '../../core/state.js';
import { t } from '../../i18n/index.js';

export function calcBMI() {
  const h = parseFloat(state.settings.height);
  const w = parseFloat(state.settings.weight);
  if (!h || !w) return null;
  return Math.round((w / ((h / 100) ** 2)) * 10) / 10;
}

/**
 * Returns BMI category with age-adjusted norms.
 * For users aged 65+: normal range shifts to 22–27 (WHO/EFSA recommendation).
 * For users aged < 65:  standard WHO thresholds (18.5–24.9 normal).
 *
 * @param {number} bmi   - calculated BMI value
 * @param {number} [age] - optional; falls back to state.settings.age or 50
 */
export function getBMICategory(bmi, age) {
  const resolvedAge = parseInt(age) || parseInt(state.settings.age) || 50;
  const isElder = resolvedAge >= 65;

  if (isElder) {
    // Adjusted norms for 65+: normal 22–27, slight deficit 19–21.9
    if (bmi < 19)   return { label: t('b-cat-very-low'), c: 'var(--red)',   impact: t('b-impact-very-low') };
    if (bmi < 22)   return { label: t('b-cat-low'),      c: 'var(--amber)', impact: t('b-impact-low') };
    if (bmi <= 27)  return { label: t('b-cat-normal'),   c: 'var(--green)', impact: t('b-impact-normal') };
    if (bmi <= 32)  return { label: t('b-cat-over'),     c: 'var(--amber)', impact: t('b-impact-over') };
    if (bmi <= 37)  return { label: t('b-cat-ob1'),      c: 'var(--red)',   impact: t('b-impact-ob1') };
    if (bmi < 40)   return { label: t('b-cat-ob2'),      c: 'var(--red)',   impact: t('b-impact-ob2') };
    return            { label: t('b-cat-ob3'),      c: 'var(--rose)',  impact: t('b-impact-ob3') };
  }

  // Standard WHO thresholds (age < 65)
  if (bmi < 16)   return { label: t('b-cat-very-low'), c: 'var(--red)',   impact: t('b-impact-very-low') };
  if (bmi < 18.5) return { label: t('b-cat-low'),      c: 'var(--amber)', impact: t('b-impact-low') };
  if (bmi < 25)   return { label: t('b-cat-normal'),   c: 'var(--green)', impact: t('b-impact-normal') };
  if (bmi < 30)   return { label: t('b-cat-over'),     c: 'var(--amber)', impact: t('b-impact-over') };
  if (bmi < 35)   return { label: t('b-cat-ob1'),      c: 'var(--red)',   impact: t('b-impact-ob1') };
  if (bmi < 40)   return { label: t('b-cat-ob2'),      c: 'var(--red)',   impact: t('b-impact-ob2') };
  return            { label: t('b-cat-ob3'),      c: 'var(--rose)',  impact: t('b-impact-ob3') };
}

export function renderBMI() {
  const bmi = calcBMI();
  const el = document.getElementById('bmiContent');
  if (!el) return;
  if (!bmi) {
    el.innerHTML = `<div class="empty-state" style="padding:12px"><div class="em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg></div><p>${t('b-empty-fill-profile')}</p></div>`;
    return;
  }
  const age = parseInt(state.settings.age) || 50;
  const isElder = age >= 65;
  const cat = getBMICategory(bmi, age);
  const pct = Math.min(96, Math.max(2, ((bmi - 14) / (45 - 14)) * 100));
  const h = parseFloat(state.settings.height) / 100;

  // Age-adjusted ideal weight range
  const loRange = isElder ? 22 : 18.5;
  const hiRange = isElder ? 27 : 24.9;
  const wMin = Math.round(loRange * h * h);
  const wMax = Math.round(hiRange * h * h);

  el.innerHTML = `
    <div class="bmi-visual">
      <div class="bmi-circle" style="border-color:${cat.c}">
        <div class="bmi-num" style="color:${cat.c}">${bmi}</div>
        <div class="bmi-label">${t('b-imt')}</div>
      </div>
      <div class="bmi-info">
        <div class="bmi-category" style="color:${cat.c}">${cat.label}</div>
        ${isElder ? `<div class="bmi-sub" style="color:var(--blue);font-size:10px">${t('b-age-note-65')}</div>` : ''}
        <div class="bmi-sub">${t('b-ideal-weight')}: ${wMin}–${wMax} ${t('b-kg')}</div>
        <div class="bmi-sub">${t('b-height')}: ${state.settings.height} ${t('b-cm')} · ${t('b-weight')}: ${state.settings.weight} ${t('b-kg')}</div>
      </div>
    </div>
    <div class="bmi-bar">
      <div class="bmi-bar-indicator" style="left:calc(${pct}% - 1.5px)"></div>
    </div>
    <div class="bmi-zones">
      <span style="color:#3b82f6">${t('b-zone-deficit')}</span>
      <span style="color:#10b981">${t('b-zone-norm')}</span>
      <span style="color:#f59e0b">${t('b-zone-excess')}</span>
      <span style="color:#ef4444">${t('b-zone-obese')}</span>
    </div>
    <div class="bmi-impact"><strong>${t('b-impact-title')}:</strong> ${cat.impact}. ${bmi > hiRange ? t('b-tip-lose') : t('b-tip-norm')}</div>`;
}
