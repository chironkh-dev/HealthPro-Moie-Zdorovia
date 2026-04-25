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

  it('awards near-perfect score for ideal BP (115/75) + perfect pulse + no pills/BMI/activity', () => {
    addMeasurement(115, 75, 70);
    const score = calcHealthScore();
    // BP 40 + pulse 20 + pills 20 (no due pills) + bmi 0 + activity 0 = 80
    expect(score).toBe(80);
    const d = getDetailedScores();
    expect(d.bp).toBe(40);
    expect(d.pulse).toBe(20);
    expect(d.pills).toBe(20);
    expect(d.bmi).toBe(0);
    expect(d.activity).toBe(0);
    expect(d.isVetoApplied).toBe(false);
  });

  it('reduces score for stage-I hypertension (145/92)', () => {
    addMeasurement(145, 92, 75);
    const score = calcHealthScore();
    // BP 15 + pulse 20 + pills 20 = 55
    expect(score).toBe(55);
    expect(getDetailedScores().bp).toBe(15);
  });

  it('applies crisis veto (×0.3) when sys >= 180', () => {
    addMeasurement(185, 110, 70);
    const score = calcHealthScore();
    // BP 0 (no band matches sys=185) + pulse 20 + pills 20 = 40 → ×0.3 = 12
    expect(score).toBe(12);
    expect(getDetailedScores().isVetoApplied).toBe(true);
  });

  it('applies severe veto (×0.6) for stage-II hypertension (165/105)', () => {
    addMeasurement(165, 105, 70);
    const score = calcHealthScore();
    // BP 5 + pulse 20 + pills 20 = 45 → ×0.6 = 27
    expect(score).toBe(27);
    expect(getDetailedScores().isVetoApplied).toBe(true);
  });

  it('adds BMI score when height/weight set (175/70 → BMI 22.9 → 10 pts)', () => {
    addMeasurement(115, 75, 70);
    state.settings.height = 175;
    state.settings.weight = 70;
    const score = calcHealthScore();
    expect(score).toBe(90); // 80 + 10 BMI
    expect(getDetailedScores().bmi).toBe(10);
  });

  it('penalises pills adherence < 50% (0 of 1 due)', () => {
    addMeasurement(115, 75, 70);
    state.pills = [{ id: 1, name: 'Test', dose: '10mg', time: '08:00', days: 'daily' }];
    state.pillsTaken[today()] = {}; // none taken
    const score = calcHealthScore();
    // BP 40 + pulse 20 + pills 0 + bmi 0 + activity 0 = 60
    expect(score).toBe(60);
    expect(getDetailedScores().pills).toBe(0);
  });

  it('caps result to [0, 100]', () => {
    // Trigger every bonus possible
    addMeasurement(115, 75, 70);
    state.settings.height = 175;
    state.settings.weight = 70;
    state.settings.stepsEnabled = false;
    const score = calcHealthScore();
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('zero pulse contribution when measurement lacks pulse value', () => {
    addMeasurement(115, 75, null);
    const score = calcHealthScore();
    // BP 40 + pulse 0 + pills 20 = 60
    expect(score).toBe(60);
    expect(getDetailedScores().pulse).toBe(0);
  });
});
