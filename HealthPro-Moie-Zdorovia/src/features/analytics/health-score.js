// Health score calculation (0-100) with personalised norms.
// Priority: user profile values → age-based AHA/WHO defaults.
//
// Weights:  BP 40 | Pulse 20 | Pills 20 | BMI 10 | Activity 10
// Crisis veto: sys≥180||dia≥120 → ×0.30 | sys≥160||dia≥100 → ×0.60
// Hypotension veto: sys<85||dia<55 → ×0.55

import { state, today } from '../../core/state.js';
import { DEFAULT_STEP_GOAL } from '../../core/constants.js';
import { isPillDueToday } from '../meds/index.js';
import { getStepCount } from '../steps/index.js';
import { calcBMI } from './bmi.js';
import { t } from '../../i18n/index.js';

const avg = (arr) =>
  arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

let currentDetailedScores = null;
export function getDetailedScores() { return currentDetailedScores; }

// ─── Personalised norm helpers ────────────────────────────────────────────────

/**
 * Returns BP thresholds for scoring, respecting user profile.
 * If normalSys/normalDia are set → personal mode.
 * Otherwise → age-based WHO/AHA defaults.
 */
export function getBPThresholds() {
  const ns = parseInt(state.settings.normalSys);
  const nd = parseInt(state.settings.normalDia);
  if (ns >= 80 && ns <= 200 && nd >= 50 && nd <= 130) {
    // Personal mode: score relative to user's own baseline
    return {
      perfect:  { sys: ns + 5,  dia: nd + 5  },   // 40 pts
      good:     { sys: ns + 10, dia: nd + 8  },   // 35 pts
      fair:     { sys: ns + 20, dia: nd + 12 },   // 25 pts
      poor:     { sys: ns + 35, dia: nd + 20 },   // 15 pts
      bad:      { sys: ns + 50, dia: nd + 30 },   //  5 pts
      personal: true,
    };
  }
  // Age-based defaults
  const age = parseInt(state.settings.age) || 50;
  if (age < 18)  return { perfect:{sys:110,dia:70}, good:{sys:120,dia:78}, fair:{sys:130,dia:85}, poor:{sys:150,dia:95}, bad:{sys:170,dia:108} };
  if (age <= 59) return { perfect:{sys:120,dia:80}, good:{sys:130,dia:85}, fair:{sys:140,dia:90}, poor:{sys:160,dia:100},bad:{sys:180,dia:110} };
  if (age <= 79) return { perfect:{sys:130,dia:85}, good:{sys:140,dia:90}, fair:{sys:150,dia:95}, poor:{sys:165,dia:105},bad:{sys:180,dia:115} };
  // 80+
  return           { perfect:{sys:140,dia:90}, good:{sys:150,dia:92}, fair:{sys:160,dia:98}, poor:{sys:175,dia:108},bad:{sys:190,dia:118} };
}

/**
 * Returns pulse optimal range respecting user profile.
 * normalPulse → ±10 = perfect, ±20 = acceptable.
 * Otherwise age/gender defaults.
 */
export function getPulseThresholds() {
  const np = parseInt(state.settings.normalPulse);
  if (np >= 40 && np <= 120) {
    return {
      perfectLo: Math.max(40, np - 10),
      perfectHi: Math.min(120, np + 10),
      okLo:      Math.max(35, np - 20),
      okHi:      Math.min(130, np + 20),
      personal:  true,
    };
  }
  const age    = parseInt(state.settings.age) || 50;
  const gender = state.settings.gender || 'm';
  // Women have slightly higher resting HR on average
  const base = gender === 'f' ? 72 : 68;
  // HR norms loosen slightly with age
  const adj  = age >= 60 ? 5 : 0;
  return {
    perfectLo: 55,
    perfectHi: base + adj,
    okLo:      45,
    okHi:      100,
    personal:  false,
  };
}

/**
 * BMI normal range adjusted for age (65+ norm shifts to 22–27).
 */
function getBMIRange() {
  const age = parseInt(state.settings.age) || 50;
  if (age >= 65) return { lo: 22, hi: 27 };
  return               { lo: 18.5, hi: 24.9 };
}

// ─── Module scorers ──────────────────────────────────────────────────────────

function scoreBP(avgSys, avgDia) {
  // Hypotension is handled as a veto below, but still needs a raw score
  if (avgSys < 85 || avgDia < 55) return 10; // low — partial, veto applied later

  const th = getBPThresholds();
  if (avgSys <= th.perfect.sys && avgDia <= th.perfect.dia) return 40;
  if (avgSys <= th.good.sys    && avgDia <= th.good.dia)    return 35;
  if (avgSys <= th.fair.sys    && avgDia <= th.fair.dia)    return 25;
  if (avgSys <= th.poor.sys    && avgDia <= th.poor.dia)    return 15;
  if (avgSys <= th.bad.sys     && avgDia <= th.bad.dia)     return  5;
  return 0;
}

function scorePulse(pulse) {
  if (pulse == null) return 0; // strict: absent → 0 pts, always in denominator
  const th = getPulseThresholds();
  if (pulse >= th.perfectLo && pulse <= th.perfectHi) return 20;
  if (pulse >= th.okLo      && pulse <= th.okHi)      return 10;
  return 0;
}

function scorePills() {
  const pills     = state.pills;
  const pillsTaken = state.pillsTaken;
  const td        = today();
  const duePills  = pills.filter(isPillDueToday);
  if (!duePills.length) return 20; // no meds prescribed → full score

  const takenCount = Object.values(pillsTaken[td] || {}).filter(Boolean).length;
  const adherence  = takenCount / duePills.length;
  if (adherence >= 0.9) return 20;
  if (adherence >= 0.5) return 10;
  return 0;
}

function scoreBMI() {
  const bmi = calcBMI();
  if (!bmi) return null; // height/weight not set → exclude

  const { lo, hi } = getBMIRange();
  const hiOver  = hi + 5;   // 25–29.9 (or 27–31.9 for 65+)
  const hiOb1   = hi + 10;  // 30–34.9

  if (bmi >= lo && bmi <= hi)       return 10;
  if (bmi > hi  && bmi <= hiOver)   return  7;
  if ((bmi > hiOver && bmi <= hiOb1) || (bmi < lo && bmi >= lo - 3)) return 4;
  return 0;
}

function scoreActivity() {
  const settings = state.settings;
  if (!settings.stepsEnabled) return null; // not tracking → exclude

  const goal     = settings.stepGoal || DEFAULT_STEP_GOAL;
  const progress = getStepCount() / goal;
  if (progress >= 1)    return 10;
  if (progress >= 0.75) return  8;
  if (progress >= 0.5)  return  6;
  if (progress >= 0.25) return  3;
  return 0;
}

// ─── Main calculation ────────────────────────────────────────────────────────

export function calcHealthScore() {
  const measurements = state.measurements;
  if (!measurements.length) return { score: 0, status: null };

  const now      = Date.now();
  const last7    = measurements.filter((m) => new Date(m.time).getTime() > now - 7 * 86400000);
  const dataPool = last7.length > 0 ? last7 : [measurements[0]];

  const avgSys = avg(dataPool.map((m) => m.sys));
  const avgDia = avg(dataPool.map((m) => m.dia));

  // Pulse: average over last 7 days.
  // avgPulse === null means no measurements have pulse data.
  const pulsePool = dataPool.filter((m) => m.pulse);
  const avgPulse  = pulsePool.length ? avg(pulsePool.map((m) => m.pulse)) : null;

  // ── Raw module scores ──
  // Pulse always contributes to denominator (strict zero when absent).
  const bpRaw       = scoreBP(avgSys, avgDia);
  const pulseRaw    = scorePulse(avgPulse);   // 0 if absent (strict check)
  const pillsRaw    = scorePills();
  const bmiRaw      = scoreBMI();             // null if no height/weight → excluded
  const activityRaw = scoreActivity();        // null if steps disabled → excluded

  // ── Redistribute weights for missing optional modules ──
  // BMI and Activity are excluded when data is unavailable (null).
  // Pulse is always included (returns 0 when absent).
  const modules = [
    { score: bpRaw,       max: 40 },
    { score: pulseRaw,    max: 20 },
    { score: pillsRaw,    max: 20 },
    { score: bmiRaw,      max: 10 },
    { score: activityRaw, max: 10 },
  ];

  const activeModules  = modules.filter((m) => m.score !== null);
  const maxPossible    = activeModules.reduce((s, m) => s + m.max, 0);
  const rawTotal       = activeModules.reduce((s, m) => s + m.score, 0);

  // Scale to 100 if some modules are inactive
  let finalScore = maxPossible > 0 ? Math.round((rawTotal / maxPossible) * 100) : 0;

  // ── Crisis / hypotension veto (based on LAST measurement) ──
  const last         = measurements[0];
  let isVetoApplied  = false;
  let vetoReason     = null;

  if (last.sys >= 180 || last.dia >= 120) {
    finalScore    = Math.round(finalScore * 0.30);
    isVetoApplied = true;
    vetoReason    = 'hypertensive-crisis';
  } else if (last.sys >= 160 || last.dia >= 100) {
    finalScore    = Math.round(finalScore * 0.60);
    isVetoApplied = true;
    vetoReason    = 'hypertension-2';
  } else if (last.sys < 85 || last.dia < 55) {
    finalScore    = Math.round(finalScore * 0.55);
    isVetoApplied = true;
    vetoReason    = 'hypotension';
  }

  const score = Math.max(0, Math.min(100, finalScore));

  // ── Derive human-readable status ──
  let status;
  if      (vetoReason === 'hypertensive-crisis') status = 'crisis';
  else if (vetoReason === 'hypertension-2')      status = 'hypertension-2';
  else if (vetoReason === 'hypotension')         status = 'hypotension';
  else if (score >= 80)                          status = 'excellent';
  else if (score >= 65)                          status = 'good';
  else if (score >= 50)                          status = 'fair';
  else                                           status = 'poor';

  // ── Store breakdown for UI ──
  currentDetailedScores = {
    bp:           bpRaw       ?? 0,
    pulse:        pulseRaw,
    pills:        pillsRaw    ?? 0,
    bmi:          bmiRaw      ?? 0,
    activity:     activityRaw ?? 0,
    pulseExcluded:   avgPulse === null,   // true → show '—' in UI
    bmiExcluded:     bmiRaw      === null,
    activityExcluded:activityRaw === null,
    isVetoApplied,
    vetoReason,
    // Norm info for UI tooltip
    bpPersonal:    getBPThresholds().personal ?? false,
    pulsePersonal: getPulseThresholds().personal,
    avgSys,
    avgDia,
    avgPulse,
  };

  return { score, status };
}

// ─── UI helpers (unchanged API, extended veto display) ────────────────────────

function setScoreColor(id, value, max) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value >= max * 0.8) el.style.color = 'var(--green)';
  else if (value >= max * 0.5) el.style.color = 'var(--amber)';
  else el.style.color = 'var(--red)';
}

export function toggleHealthTooltip() {
  const el = document.getElementById('healthTooltip');
  if (!el) return;
  const isShowing = el.classList.contains('show');
  if (!isShowing && currentDetailedScores) {
    const d = currentDetailedScores;
    document.getElementById('score-bp').textContent       = d.bp;
    document.getElementById('score-pulse').textContent    = d.pulseExcluded    ? '—' : d.pulse;
    document.getElementById('score-pills').textContent    = d.pills;
    document.getElementById('score-activity').textContent = d.activityExcluded ? '—' : d.activity;
    document.getElementById('score-bmi').textContent      = d.bmiExcluded      ? '—' : d.bmi;

    setScoreColor('score-bp',       d.bp,       40);
    setScoreColor('score-pulse',    d.pulse,    20);
    setScoreColor('score-pills',    d.pills,    20);
    setScoreColor('score-activity', d.activity, 10);
    setScoreColor('score-bmi',      d.bmi,      10);

    // Veto status
    const vetoEl = document.getElementById('veto-status');
    if (vetoEl) {
      vetoEl.style.display = d.isVetoApplied ? 'block' : 'none';
      if (d.isVetoApplied) {
        const labels = {
          'hypertensive-crisis': t('hs-veto-crisis'),
          'hypertension-2':      t('hs-veto-ht2'),
          'hypotension':         t('hs-veto-hypo'),
        };
        vetoEl.textContent = labels[d.vetoReason] || t('hs-veto-default');
      }
    }

    // Personal norm badge
    const normEl = document.getElementById('norm-mode');
    if (normEl) {
      normEl.textContent    = d.bpPersonal ? t('hs-norm-personal') : t('hs-norm-standard');
      normEl.style.display  = 'block';
    }
  }
  el.classList.toggle('show');
}
