// Tests for scoreActivity() and its impact on calcHealthScore().
//
// scoreActivity() is private — tested indirectly via calcHealthScore()
// and getDetailedScores().activity.
//
// Progress bands (steps / goal):
//   ≥ 1.00  → 10 pts   100%
//   ≥ 0.75  →  8 pts    75%
//   ≥ 0.50  →  6 pts    50%
//   ≥ 0.25  →  3 pts    25%
//   < 0.25  →  0 pts     0%
//   stepsEnabled=false  → null (excluded from denominator entirely)
//
// Baseline setup (male age 50, no personal norms, no pills, no BMI):
//   BP perfect = 40 pts  (sys=115, dia=75)
//   Pulse ok   = 10 pts  (pulse=70, perfectHi=68 → ok band)
//   Pills      = 20 pts  (no meds due)
//   BMI        = null    (no height/weight → excluded)
//
// With stepsEnabled=FALSE → active max = 40+20+20 = 80
//   finalScore = round(70/80 * 100) = round(87.5) = 88
//
// With stepsEnabled=TRUE  → active max = 40+20+20+10 = 90
//   finalScore = round((70 + actPts) / 90 * 100)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../src/core/state.js';
import { calcHealthScore, getDetailedScores } from '../src/features/analytics/health-score.js';

// ── Mock getStepCount so tests don't touch the sensor/DB layer ─────────────
vi.mock('../src/features/steps/index.js', () => ({
  getStepCount: vi.fn().mockReturnValue(0),
}));

// Import the mock AFTER vi.mock so we get the mocked version
import { getStepCount } from '../src/features/steps/index.js';

// ── Helpers ────────────────────────────────────────────────────────────────

const DEFAULT_GOAL = 10000;

function resetState(stepsEnabled = false) {
  state.lang         = 'uk';
  state.measurements = [];
  state.pills        = [];
  state.pillsTaken   = {};
  state.settings     = { stepsEnabled };
}

function seedBaseline(stepsEnabled = true) {
  resetState(stepsEnabled);
  const time = new Date().toISOString();
  state.measurements = [{ sys: 115, dia: 75, pulse: 70, time }];
}

function setSteps(n) {
  vi.mocked(getStepCount).mockReturnValue(n);
}

// ── stepsEnabled = false ───────────────────────────────────────────────────

describe('scoreActivity() — stepsEnabled = false (excluded)', () => {
  beforeEach(() => {
    seedBaseline(false);
    setSteps(99999); // irrelevant when disabled
  });

  it('activity score stored as 0 in detailed breakdown (null coerced for UI)', () => {
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(0);
  });

  it('activityExcluded flag is true', () => {
    calcHealthScore();
    expect(getDetailedScores().activityExcluded).toBe(true);
  });

  it('activity module absent → denominator is 80 (BP+pulse+pills only)', () => {
    // max=80; raw=70; score = round(70/80*100) = round(87.5) = 88
    const { score } = calcHealthScore();
    expect(score).toBe(88);
  });

  it('step count has no effect on score when disabled', () => {
    setSteps(0);
    const { score: s0 } = calcHealthScore();

    setSteps(10000);
    const { score: s10k } = calcHealthScore();

    expect(s0).toBe(s10k);
  });
});

// ── stepsEnabled = true, 0% progress ──────────────────────────────────────

describe('scoreActivity() — 0% progress (steps < 25% of goal)', () => {
  beforeEach(() => seedBaseline(true));

  it('returns 0 activity pts when steps = 0', () => {
    setSteps(0);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(0);
  });

  it('returns 0 activity pts at steps = 1 (well below 25%)', () => {
    setSteps(1);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(0);
  });

  it('returns 0 activity pts at steps = 2499 (just below 25% of 10 000)', () => {
    setSteps(2499);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(0);
  });

  it('denominator is 90 (activity included even at 0 pts)', () => {
    setSteps(0);
    // max=90; raw=70+0=70; score = round(70/90*100) = round(77.78) = 78
    const { score } = calcHealthScore();
    expect(score).toBe(78);
  });

  it('score with stepsEnabled=true (0 steps) is lower than stepsEnabled=false', () => {
    setSteps(0);
    const { score: withActivity } = calcHealthScore();

    seedBaseline(false);
    const { score: withoutActivity } = calcHealthScore();

    expect(withActivity).toBeLessThan(withoutActivity); // 78 < 88
  });

  it('activityExcluded flag is false when stepsEnabled=true', () => {
    setSteps(0);
    calcHealthScore();
    expect(getDetailedScores().activityExcluded).toBe(false);
  });
});

// ── stepsEnabled = true, 25% progress ─────────────────────────────────────

describe('scoreActivity() — 25% progress band', () => {
  beforeEach(() => seedBaseline(true));

  it('awards 3 pts at exactly 25% (steps = 2500)', () => {
    setSteps(2500);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(3);
  });

  it('awards 3 pts at 49% (2 steps below 50% threshold)', () => {
    setSteps(4999);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(3);
  });

  it('score at 25% progress is correct — round((70+3)/90*100) = 81', () => {
    setSteps(2500);
    const { score } = calcHealthScore();
    expect(score).toBe(81);
  });

  it('boundary: steps=2499 → 0 pts; steps=2500 → 3 pts', () => {
    setSteps(2499);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(0);

    setSteps(2500);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(3);
  });
});

// ── stepsEnabled = true, 50% progress ─────────────────────────────────────

describe('scoreActivity() — 50% progress band', () => {
  beforeEach(() => seedBaseline(true));

  it('awards 6 pts at exactly 50% (steps = 5000)', () => {
    setSteps(5000);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(6);
  });

  it('awards 6 pts at 74% (1 step below 75% threshold)', () => {
    setSteps(7499);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(6);
  });

  it('score at 50% progress — round((70+6)/90*100) = round(84.44) = 84', () => {
    setSteps(5000);
    const { score } = calcHealthScore();
    expect(score).toBe(84);
  });

  it('boundary: steps=4999 → 3 pts; steps=5000 → 6 pts', () => {
    setSteps(4999);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(3);

    setSteps(5000);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(6);
  });
});

// ── stepsEnabled = true, 75% progress ─────────────────────────────────────

describe('scoreActivity() — 75% progress band', () => {
  beforeEach(() => seedBaseline(true));

  it('awards 8 pts at exactly 75% (steps = 7500)', () => {
    setSteps(7500);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(8);
  });

  it('awards 8 pts at 99% (1 step below 100% threshold)', () => {
    setSteps(9999);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(8);
  });

  it('score at 75% progress — round((70+8)/90*100) = round(86.67) = 87', () => {
    setSteps(7500);
    const { score } = calcHealthScore();
    expect(score).toBe(87);
  });

  it('boundary: steps=7499 → 6 pts; steps=7500 → 8 pts', () => {
    setSteps(7499);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(6);

    setSteps(7500);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(8);
  });
});

// ── stepsEnabled = true, 100% progress ────────────────────────────────────

describe('scoreActivity() — 100% progress (goal met)', () => {
  beforeEach(() => seedBaseline(true));

  it('awards 10 pts at exactly 100% (steps = 10 000)', () => {
    setSteps(10000);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(10);
  });

  it('awards 10 pts when steps exceed goal (steps = 15 000)', () => {
    setSteps(15000);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(10);
  });

  it('score at 100% — round((70+10)/90*100) = round(88.89) = 89', () => {
    setSteps(10000);
    const { score } = calcHealthScore();
    expect(score).toBe(89);
  });

  it('boundary: steps=9999 → 8 pts; steps=10000 → 10 pts', () => {
    setSteps(9999);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(8);

    setSteps(10000);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(10);
  });
});

// ── Score progression is monotonically non-decreasing ─────────────────────

describe('scoreActivity() — monotonic score progression', () => {
  beforeEach(() => seedBaseline(true));

  it('score increases (or stays equal) from 0% → 25% → 50% → 75% → 100%', () => {
    const checkpoints = [0, 2500, 5000, 7500, 10000];
    const scores = checkpoints.map((n) => {
      setSteps(n);
      return calcHealthScore().score;
    });

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });

  it('exact scores across all bands: [78, 81, 84, 87, 89]', () => {
    const expected = { 0: 78, 2500: 81, 5000: 84, 7500: 87, 10000: 89 };
    for (const [steps, expectedScore] of Object.entries(expected)) {
      setSteps(Number(steps));
      expect(calcHealthScore().score).toBe(expectedScore);
    }
  });
});

// ── Custom step goal ───────────────────────────────────────────────────────

describe('scoreActivity() — custom stepGoal', () => {
  beforeEach(() => seedBaseline(true));

  it('uses custom stepGoal from settings instead of default 10 000', () => {
    state.settings.stepGoal = 5000;
    setSteps(5000); // 100% of custom goal → 10 pts
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(10);
  });

  it('5000 steps = 50% of custom goal 10 000 → 6 pts', () => {
    state.settings.stepGoal = 10000;
    setSteps(5000);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(6);
  });

  it('5000 steps = 100% of custom goal 5000 → 10 pts', () => {
    state.settings.stepGoal = 5000;
    setSteps(5000);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(10);
  });

  it('2500 steps = 50% of custom goal 5000 → 6 pts', () => {
    state.settings.stepGoal = 5000;
    setSteps(2500);
    calcHealthScore();
    expect(getDetailedScores().activity).toBe(6);
  });
});

// ── Denominator consistency — combined with BMI ───────────────────────────

describe('scoreActivity() — denominator shifts with other optional modules', () => {
  beforeEach(() => resetState(true));

  it('BMI excluded + activity included → max = 90', () => {
    // No height/weight → BMI null. Steps=100% → activity=10.
    // BP=40, pulse=10, pills=20, activity=10; max=90; raw=80
    // score = round(80/90*100) = round(88.89) = 89
    state.measurements = [{ sys: 115, dia: 75, pulse: 70, time: new Date().toISOString() }];
    setSteps(10000);
    const { score } = calcHealthScore();
    expect(score).toBe(89);
  });

  it('BMI included + activity included → max = 100', () => {
    // Both present. BMI=10 (normal), activity=10 (100%).
    // BP=40, pulse=10, pills=20, bmi=10, activity=10; max=100; raw=90
    // score = round(90/100*100) = 90
    state.measurements = [{ sys: 115, dia: 75, pulse: 70, time: new Date().toISOString() }];
    state.settings.height = 175;
    state.settings.weight = 70; // BMI 22.9 → 10 pts
    setSteps(10000);
    const { score } = calcHealthScore();
    expect(score).toBe(90);
    expect(getDetailedScores().activityExcluded).toBe(false);
    expect(getDetailedScores().bmiExcluded).toBe(false);
  });

  it('BMI included + activity disabled → max = 90', () => {
    // Activity null (stepsEnabled=false). BMI=10.
    // BP=40, pulse=10, pills=20, bmi=10; max=90; raw=80
    // score = round(80/90*100) = round(88.89) = 89
    state.settings.stepsEnabled = false;
    state.measurements = [{ sys: 115, dia: 75, pulse: 70, time: new Date().toISOString() }];
    state.settings.height = 175;
    state.settings.weight = 70;
    const { score } = calcHealthScore();
    expect(score).toBe(89);
    expect(getDetailedScores().activityExcluded).toBe(true);
    expect(getDetailedScores().bmiExcluded).toBe(false);
  });

  it('all 5 modules active → max = 100', () => {
    state.measurements = [{ sys: 115, dia: 75, pulse: 70, time: new Date().toISOString() }];
    state.settings.height = 175;
    state.settings.weight = 70;
    setSteps(10000);
    calcHealthScore();
    expect(getDetailedScores().activityExcluded).toBe(false);
    expect(getDetailedScores().bmiExcluded).toBe(false);
    expect(getDetailedScores().pulseExcluded).toBe(false);
  });
});
