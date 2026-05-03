// calcHealthScore — most complex calculation. Reads measurements, pills,
// pillsTaken, settings, and step counter. We seed state and verify the
// 0..100 result + crisis-veto multiplier behavior.

import { describe, it, expect, beforeEach } from 'vitest';
import { state, today } from '../src/core/state.js';
import { calcHealthScore, getDetailedScores } from '../src/features/analytics/health-score.js';

function resetState() {
  state.lang = 'uk';
  state.measurements = [];
  state.pills = [];
  state.pillsTaken = {};
  state.settings = { stepsEnabled: false };
}

function addMeasurement(sys, dia, pulse, daysAgo = 0) {
  const t = new Date(Date.now() - daysAgo * 86400000).toISOString();
  // index 0 = most recent in this app
  state.measurements.unshift({ sys, dia, pulse, time: t });
}

describe('calcHealthScore()', () => {
  beforeEach(resetState);

  it('returns 0 when no measurements exist', () => {
    expect(calcHealthScore()).toBe(0);
  });

  it('awards score for good BP (115/75) + ok pulse + no pills/BMI/activity', () => {
    addMeasurement(115, 75, 70);
    const score = calcHealthScore();
    // Default profile: male age 50, no personal norms.
    // BP 40 (115<=120 & 75<=80 → perfect band)
    // Pulse: perfectHi = base(68) + adj(0) = 68; 70 > 68 → ok band (10 pts)
    // Pills 20 (no due pills), BMI null (excluded), Activity null (excluded)
    // Active modules max = 40+20+20 = 80; raw = 40+10+20 = 70
    // finalScore = round(70/80 * 100) = round(87.5) = 88
    expect(score).toBe(88);
    const d = getDetailedScores();
    expect(d.bp).toBe(40);
    expect(d.pulse).toBe(10);
    expect(d.pills).toBe(20);
    expect(d.bmi).toBe(0);
    expect(d.activity).toBe(0);
    expect(d.isVetoApplied).toBe(false);
  });

  it('reduces score for stage-I hypertension (145/92)', () => {
    addMeasurement(145, 92, 75);
    const score = calcHealthScore();
    // BP: fair={140,90} < 145/92 <= poor={160,100} → 15 pts
    // Pulse(75): ok band → 10 pts
    // Pills 20; active max=80; raw=45
    // finalScore = round(45/80 * 100) = round(56.25) = 56
    expect(score).toBe(56);
    expect(getDetailedScores().bp).toBe(15);
  });

  it('applies crisis veto (×0.3) when sys >= 180', () => {
    addMeasurement(185, 110, 70);
    const score = calcHealthScore();
    // BP: sys=185 > bad.sys=180 → 0 pts
    // Pulse(70): ok → 10 pts; Pills 20
    // active max=80; raw=30; pre-veto = round(30/80*100) = round(37.5) = 38
    // Crisis veto ×0.3: round(38 * 0.3) = round(11.4) = 11
    expect(score).toBe(11);
    expect(getDetailedScores().isVetoApplied).toBe(true);
  });

  it('applies severe veto (×0.6) for stage-II hypertension (165/105)', () => {
    addMeasurement(165, 105, 70);
    const score = calcHealthScore();
    // BP: poor={160,100} < 165/105 <= bad={180,110} → 5 pts
    // Pulse(70): ok → 10 pts; Pills 20
    // active max=80; raw=35; pre-veto = round(35/80*100) = round(43.75) = 44
    // HT-2 veto ×0.6: round(44 * 0.6) = round(26.4) = 26
    expect(score).toBe(26);
    expect(getDetailedScores().isVetoApplied).toBe(true);
  });

  it('adds BMI score when height/weight set (175/70 → BMI 22.9 → 10 pts)', () => {
    addMeasurement(115, 75, 70);
    state.settings.height = 175;
    state.settings.weight = 70;
    const score = calcHealthScore();
    // BP 40 + Pulse(70) 10 + Pills 20 + BMI(22.9 in 18.5-24.9) 10
    // Activity still null (stepsEnabled false); active max=90; raw=80
    // finalScore = round(80/90 * 100) = round(88.89) = 89
    expect(score).toBe(89);
    expect(getDetailedScores().bmi).toBe(10);
  });

  it('penalises pills adherence < 50% (0 of 1 due)', () => {
    addMeasurement(115, 75, 70);
    state.pills = [{ id: 1, name: 'Test', dose: '10mg', time: '08:00', days: 'daily' }];
    state.pillsTaken[today()] = {}; // none taken
    const score = calcHealthScore();
    // BP 40 + Pulse(70) 10 + Pills 0; active max=80; raw=50
    // finalScore = round(50/80 * 100) = round(62.5) = 63
    expect(score).toBe(63);
    expect(getDetailedScores().pills).toBe(0);
  });

  it('caps result to [0, 100]', () => {
    addMeasurement(115, 75, 70);
    state.settings.height = 175;
    state.settings.weight = 70;
    state.settings.stepsEnabled = false;
    const score = calcHealthScore();
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('pulse module excluded (not zero-penalised) when measurement lacks pulse value', () => {
    addMeasurement(115, 75, null);
    const score = calcHealthScore();
    // Pulse=null → module excluded from both numerator & denominator (weight redistribution)
    // BP 40 + Pills 20; active max=60; raw=60
    // finalScore = round(60/60 * 100) = 100
    expect(score).toBe(100);
    // d.pulse stored as 0 (null ?? 0) for UI display
    expect(getDetailedScores().pulse).toBe(0);
  });
});
