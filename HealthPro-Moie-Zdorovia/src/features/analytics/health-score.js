// Health score calculation (0-100) and detail breakdown.
// Reads pressure / pills / BMI / steps from shared state.

import { state, today } from '../../core/state.js';
import { DEFAULT_STEP_GOAL } from '../../core/constants.js';
import { isPillDueToday } from '../meds/index.js';
import { getStepCount } from '../steps/index.js';
import { calcBMI } from './bmi.js';

const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

let currentDetailedScores = null;

export function getDetailedScores() {
  return currentDetailedScores;
}

export function calcHealthScore() {
  const measurements = state.measurements;
  const pills = state.pills;
  const pillsTaken = state.pillsTaken;
  const settings = state.settings;
  if (!measurements.length) return 0;

  const now = Date.now();
  const last7Days = measurements.filter((m) => new Date(m.time).getTime() > now - 7 * 86400000);
  const dataToUse = last7Days.length > 0 ? last7Days : [measurements[0]];

  const avgSys = avg(dataToUse.map((m) => m.sys));
  const avgDia = avg(dataToUse.map((m) => m.dia));

  // 1. BP (max 40)
  let bpScore = 0;
  if (avgSys < 120 && avgDia < 80) bpScore = 40;
  else if (avgSys < 130 && avgDia < 85) bpScore = 35;
  else if (avgSys < 140 && avgDia < 90) bpScore = 25;
  else if (avgSys < 160 && avgDia < 100) bpScore = 15;
  else if (avgSys < 180 && avgDia < 110) bpScore = 5;
  if (avgSys < 90 || avgDia < 60) bpScore = 15;

  // 2. Pulse (max 20)
  const last = measurements[0];
  let pulseScore = 0;
  if (last.pulse) {
    const p = last.pulse;
    if (p >= 60 && p <= 80) pulseScore = 20;
    else if ((p >= 50 && p < 60) || (p > 80 && p <= 95)) pulseScore = 10;
    else pulseScore = 0;
  }

  // 3. Pills (max 20)
  let pillScore = 20;
  const td = today();
  const duePills = pills.filter(isPillDueToday);
  if (duePills.length > 0) {
    const takenCount = Object.values(pillsTaken[td] || {}).filter(Boolean).length;
    const adherence = takenCount / duePills.length;
    if (adherence >= 0.9) pillScore = 20;
    else if (adherence >= 0.5) pillScore = 10;
    else pillScore = 0;
  }

  // 4. BMI (max 10)
  let bmiScore = 0;
  const bmi = calcBMI();
  if (bmi) {
    if (bmi >= 18.5 && bmi < 25) bmiScore = 10;
    else if (bmi >= 25 && bmi < 30) bmiScore = 7;
    else if ((bmi >= 30 && bmi < 35) || bmi < 18.5) bmiScore = 4;
    else bmiScore = 0;
  }

  // 5. Activity (max 10)
  let activityScore = 0;
  if (settings.stepsEnabled) {
    const goal = settings.stepGoal || DEFAULT_STEP_GOAL;
    const progress = getStepCount() / goal;
    if (progress >= 1) activityScore = 10;
    else if (progress >= 0.5) activityScore = 6;
    else activityScore = 0;
  }

  // Total + crisis veto
  let finalScore = bpScore + pulseScore + pillScore + bmiScore + activityScore;
  let isVetoApplied = false;
  if (last.sys >= 180 || last.dia >= 120) {
    finalScore *= 0.3;
    isVetoApplied = true;
  } else if (last.sys >= 160 || last.dia >= 100) {
    finalScore *= 0.6;
    isVetoApplied = true;
  }

  currentDetailedScores = {
    bp: bpScore,
    pulse: pulseScore,
    pills: pillScore,
    bmi: bmiScore,
    activity: activityScore,
    isVetoApplied,
  };

  return Math.max(0, Math.min(100, Math.round(finalScore)));
}

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
    document.getElementById('score-bp').textContent = currentDetailedScores.bp;
    document.getElementById('score-pulse').textContent = currentDetailedScores.pulse;
    document.getElementById('score-pills').textContent = currentDetailedScores.pills;
    document.getElementById('score-activity').textContent = currentDetailedScores.activity;
    document.getElementById('score-bmi').textContent = currentDetailedScores.bmi;
    setScoreColor('score-bp', currentDetailedScores.bp, 40);
    setScoreColor('score-pulse', currentDetailedScores.pulse, 20);
    setScoreColor('score-pills', currentDetailedScores.pills, 20);
    setScoreColor('score-activity', currentDetailedScores.activity, 20);
    document.getElementById('veto-status').style.display = currentDetailedScores.isVetoApplied ? 'block' : 'none';
  }
  el.classList.toggle('show');
}
