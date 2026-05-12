// Combined tests: scoreBMI() × scoreActivity() interaction.
//
// Both modules are OPTIONAL — each returns null when excluded,
// which removes it from the denominator entirely.
//
// Denominator configurations:
//   BMI=null, Act=null → max = 80   (BP+Pulse+Pills only)
//   BMI set,  Act=null → max = 90   (+ BMI)
//   BMI=null, Act set  → max = 90   (+ Activity)
//   BMI set,  Act set  → max = 100  (all 5 modules)
//
// Baseline (sys=115, dia=75, pulse=70, no pills, age=50 male):
//   BP=40, Pulse=10, Pills=20 → core raw = 70
//
// Score formula: Math.round(rawTotal / maxPossible * 100)
//
// Full BMI × Activity matrix (both active, max=100):
//   BMI pts:  0 / 4 / 7 / 10
//   Act pts:  0 / 3 / 6 / 8 / 10
//   score = round((70 + bmi + act) / 100 * 100) = 70+bmi+act exactly
//
// Trick for exact BMI: height=200 → bmi = weight/4
//   bmi=22 (weight=88)  → 10 pts  (normal)
//   bmi=27 (weight=108) →  7 pts  (overweight)
//   bmi=32 (weight=128) →  4 pts  (obesity I)
//   bmi=40 (weight=160) →  0 pts  (severe obesity)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../src/core/state.js';
import { calcHealthScore, getDetailedScores } from '../src/features/analytics/health-score.js';

// ── Mock step counter (isolate from sensor/DB) ─────────────────────────────
// health-score.js imports getStepCount from steps/api.js (architectural split).
vi.mock('../src/features/steps/api.js', () => ({
  getStepCount: vi.fn().mockReturnValue(0),
  _setStepCount: vi.fn(),
}));
import { getStepCount } from '../src/features/steps/api.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function resetState() {
  state.lang         = 'uk';
  state.measurements = [{ sys: 115, dia: 75, pulse: 70, time: new Date().toISOString() }];
  state.pills        = [];
  state.pillsTaken   = {};
  state.settings     = { age: 50, stepsEnabled: false };
  vi.mocked(getStepCount).mockReturnValue(0);
}

// height=200 cm → bmi = weight/4 exactly
function setBMI(bmi) {
  state.settings.height = 200;
  state.settings.weight = bmi * 4;
}

function enableActivity(steps = 0) {
  state.settings.stepsEnabled = true;
  state.settings.stepGoal     = 10000;
  vi.mocked(getStepCount).mockReturnValue(steps);
}

// ── Section 1: All 4 denominator configurations ───────────────────────────

describe('BMI × Activity — denominator configurations', () => {
  beforeEach(resetState);

  it('both excluded → max=80, score=round(70/80×100)=88', () => {
    // No height/weight, stepsEnabled=false
    expect(calcHealthScore().score).toBe(88);
    expect(getDetailedScores().bmiExcluded).toBe(true);
    expect(getDetailedScores().activityExcluded).toBe(true);
  });

  it('BMI only (10 pts) → max=90, score=round(80/90×100)=89', () => {
    setBMI(22);  // normal → 10 pts
    expect(calcHealthScore().score).toBe(89);
    expect(getDetailedScores().bmiExcluded).toBe(false);
    expect(getDetailedScores().activityExcluded).toBe(true);
  });

  it('Activity only (10 pts, 100% steps) → max=90, score=round(80/90×100)=89', () => {
    enableActivity(10000);
    expect(calcHealthScore().score).toBe(89);
    expect(getDetailedScores().bmiExcluded).toBe(true);
    expect(getDetailedScores().activityExcluded).toBe(false);
  });

  it('both active (BMI=10, Act=10) → max=100, score=90', () => {
    setBMI(22);
    enableActivity(10000);
    expect(calcHealthScore().score).toBe(90);
    expect(getDetailedScores().bmiExcluded).toBe(false);
    expect(getDetailedScores().activityExcluded).toBe(false);
  });

  it('BMI=0 + Activity=0, both active → max=100, score=70 (core pts only)', () => {
    setBMI(40);        // severe obesity → 0 pts
    enableActivity(0); // 0 steps → 0 pts
    expect(calcHealthScore().score).toBe(70);
  });

  it('same raw (80) but different max: BMI=10/Act=null vs BMI=null/Act=10 both give 89', () => {
    setBMI(22);
    const s1 = calcHealthScore().score; // max=90, raw=80 → 89

    resetState();
    enableActivity(10000);
    const s2 = calcHealthScore().score; // max=90, raw=80 → 89

    expect(s1).toBe(89);
    expect(s2).toBe(89);
  });
});

// ── Section 2: BMI × Activity full matrix (max=100) ──────────────────────
//
// When both modules are active, max=100 and raw = 70+bmi+act.
// So finalScore = 70+bmi+act (integer, no rounding needed when sum is whole).

describe('BMI × Activity — full score matrix (both active, max=100)', () => {
  beforeEach(() => {
    resetState();
  });

  // Each row: [bmiVal, bmiPts, steps, actPts, expectedScore]
  const matrix = [
    // BMI=10 (normal, bmi=22)
    [22, 10, 10000, 10, 90],
    [22, 10,  7500,  8, 88],
    [22, 10,  5000,  6, 86],
    [22, 10,  2500,  3, 83],
    [22, 10,     0,  0, 80],
    // BMI=7 (overweight, bmi=27)
    [27,  7, 10000, 10, 87],
    [27,  7,  7500,  8, 85],
    [27,  7,  5000,  6, 83],
    [27,  7,  2500,  3, 80],
    [27,  7,     0,  0, 77],
    // BMI=4 (obesity I, bmi=32)
    [32,  4, 10000, 10, 84],
    [32,  4,  7500,  8, 82],
    [32,  4,  5000,  6, 80],
    [32,  4,  2500,  3, 77],
    [32,  4,     0,  0, 74],
    // BMI=0 (severe obesity, bmi=40)
    [40,  0, 10000, 10, 80],
    [40,  0,  7500,  8, 78],
    [40,  0,  5000,  6, 76],
    [40,  0,  2500,  3, 73],
    [40,  0,     0,  0, 70],
  ];

  matrix.forEach(([bmiVal, bmiPts, steps, actPts, expected]) => {
    it(`BMI=${bmiPts}pts (bmi=${bmiVal}) + Activity=${actPts}pts (${steps} steps) → score=${expected}`, () => {
      setBMI(bmiVal);
      enableActivity(steps);
      const { score } = calcHealthScore();
      expect(score).toBe(expected);
      expect(getDetailedScores().bmi).toBe(bmiPts);
      expect(getDetailedScores().activity).toBe(actPts);
    });
  });
});

// ── Section 3: Denominator effect — same raw, different max ───────────────

describe('BMI × Activity — denominator effect on same raw score', () => {
  beforeEach(resetState);

  it('raw=80 with max=100 (score=80) < raw=80 with max=90 (score=89)', () => {
    // BMI=0+Act=10 → raw=70+0+10=80, max=100 → score=80
    setBMI(40);
    enableActivity(10000);
    const scoreWith100max = calcHealthScore().score;

    // BMI=null+Act=10 → raw=70+10=80, max=90 → score=89
    resetState();
    enableActivity(10000);
    const scoreWith90max = calcHealthScore().score;

    expect(scoreWith100max).toBe(80);
    expect(scoreWith90max).toBe(89);
    expect(scoreWith100max).toBeLessThan(scoreWith90max);
  });

  it('raw=80 with max=100 (score=80) < raw=80 with max=80 (score=100, capped)', () => {
    // BMI=0+Act=10: raw=80/100 → 80
    setBMI(40);
    enableActivity(10000);
    const s1 = calcHealthScore().score;

    // BMI=null+Act=null: raw=70/80 → 88 (different raw)
    // So: score with bad modules < score with excluded modules
    resetState();
    const s2 = calcHealthScore().score; // 88

    expect(s1).toBe(80);
    expect(s2).toBe(88);
    expect(s1).toBeLessThan(s2);
  });

  it('BMI=10/Act=null (max=90,raw=80→89) > BMI=10/Act=0 (max=100,raw=80→80)', () => {
    // Having activity enabled but at 0% hurts score vs not tracking at all
    setBMI(22);
    const excludedAct = calcHealthScore().score; // max=90, raw=80 → 89

    resetState();
    setBMI(22);
    enableActivity(0); // 0 steps → 0 pts, but max becomes 100
    const zeroAct = calcHealthScore().score;    // max=100, raw=80 → 80

    expect(excludedAct).toBe(89);
    expect(zeroAct).toBe(80);
    expect(excludedAct).toBeGreaterThan(zeroAct);
  });

  it('BMI=null/Act=10 (89) = BMI=10/Act=null (89): both give same score when raw=80', () => {
    setBMI(22);
    const bmiOnly = calcHealthScore().score; // max=90, raw=80 → 89

    resetState();
    enableActivity(10000);
    const actOnly = calcHealthScore().score; // max=90, raw=80 → 89

    expect(bmiOnly).toBe(89);
    expect(actOnly).toBe(89);
  });
});

// ── Section 4: Score monotonicity across all module states ─────────────────

describe('BMI × Activity — score monotonicity', () => {
  beforeEach(resetState);

  it('score increases as BMI improves (fixed activity=10 pts, max=100)', () => {
    enableActivity(10000);

    setBMI(40); const s0  = calcHealthScore().score; // BMI=0
    resetState(); setBMI(32); enableActivity(10000); const s4  = calcHealthScore().score; // BMI=4
    resetState(); setBMI(27); enableActivity(10000); const s7  = calcHealthScore().score; // BMI=7
    resetState(); setBMI(22); enableActivity(10000); const s10 = calcHealthScore().score; // BMI=10

    expect(s0).toBe(80);
    expect(s4).toBe(84);
    expect(s7).toBe(87);
    expect(s10).toBe(90);
    expect(s0).toBeLessThan(s4);
    expect(s4).toBeLessThan(s7);
    expect(s7).toBeLessThan(s10);
  });

  it('score increases as activity improves (fixed BMI=10 pts, max=100)', () => {
    const scores = [];
    const steps = [0, 2500, 5000, 7500, 10000];
    const expected = [80, 83, 86, 88, 90];

    steps.forEach((s, i) => {
      resetState();
      setBMI(22);
      enableActivity(s);
      scores.push(calcHealthScore().score);
    });

    expect(scores).toEqual(expected);
    // Verify monotonically non-decreasing
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });

  it('score increases as activity improves (BMI excluded, max=90)', () => {
    // No height/weight → BMI excluded, max=90
    const steps    = [0,   2500, 5000, 7500, 10000];
    const actPts   = [0,      3,    6,    8,    10];
    // round((70 + act) / 90 * 100):
    //   70/90*100=77.8→78, 73/90*100=81.1→81, 76/90*100=84.4→84,
    //   78/90*100=86.7→87, 80/90*100=88.9→89
    const expected = [78, 81, 84, 87, 89];

    steps.forEach((s, i) => {
      resetState();
      enableActivity(s);
      expect(calcHealthScore().score).toBe(expected[i]);
    });
  });

  it('adding worse-than-null BMI always lowers the score', () => {
    // For any BMI band except 10 pts, enabling BMI with max=100
    // gives a lower score than excluding BMI (max=80 or 90)
    const bmiBands = [0, 4, 7]; // all < 10 pts
    bmiBands.forEach((bmiPts) => {
      const bmiVal = bmiPts === 0 ? 40 : bmiPts === 4 ? 32 : 27;

      resetState();
      const baseScore = calcHealthScore().score; // BMI excluded → max=80 → 88

      resetState();
      setBMI(bmiVal);
      const bmiScore = calcHealthScore().score; // BMI active → max=90

      expect(bmiScore).toBeLessThan(baseScore);
    });
  });
});

// ── Section 5: exclusion flags are consistent ─────────────────────────────

describe('BMI × Activity — exclusion flags', () => {
  beforeEach(resetState);

  it('both excluded: bmiExcluded=true, activityExcluded=true', () => {
    calcHealthScore();
    const d = getDetailedScores();
    expect(d.bmiExcluded).toBe(true);
    expect(d.activityExcluded).toBe(true);
  });

  it('BMI set, activity disabled: bmiExcluded=false, activityExcluded=true', () => {
    setBMI(22);
    calcHealthScore();
    const d = getDetailedScores();
    expect(d.bmiExcluded).toBe(false);
    expect(d.activityExcluded).toBe(true);
  });

  it('BMI absent, activity enabled: bmiExcluded=true, activityExcluded=false', () => {
    enableActivity(5000);
    calcHealthScore();
    const d = getDetailedScores();
    expect(d.bmiExcluded).toBe(true);
    expect(d.activityExcluded).toBe(false);
  });

  it('both active: bmiExcluded=false, activityExcluded=false', () => {
    setBMI(22);
    enableActivity(5000);
    calcHealthScore();
    const d = getDetailedScores();
    expect(d.bmiExcluded).toBe(false);
    expect(d.activityExcluded).toBe(false);
  });

  it('exclusion flags are independent — toggling one does not affect the other', () => {
    // Enable only BMI
    setBMI(22);
    calcHealthScore();
    expect(getDetailedScores().bmiExcluded).toBe(false);
    expect(getDetailedScores().activityExcluded).toBe(true);

    // Now also enable activity
    enableActivity(5000);
    calcHealthScore();
    expect(getDetailedScores().bmiExcluded).toBe(false);
    expect(getDetailedScores().activityExcluded).toBe(false);

    // Disable activity again
    state.settings.stepsEnabled = false;
    calcHealthScore();
    expect(getDetailedScores().bmiExcluded).toBe(false);
    expect(getDetailedScores().activityExcluded).toBe(true);
  });

  it('pulseExcluded stays false (strict mode) regardless of BMI/Activity state', () => {
    // Pulse is always in denominator — pulseExcluded=false as long as pulse data exists
    setBMI(22);
    enableActivity(5000);
    calcHealthScore();
    expect(getDetailedScores().pulseExcluded).toBe(false);

    resetState();
    calcHealthScore();
    expect(getDetailedScores().pulseExcluded).toBe(false);
  });
});

// ── Section 6: age 65+ BMI with activity ─────────────────────────────────

describe('BMI (age 65+) × Activity — adjusted norms interact correctly', () => {
  beforeEach(() => {
    resetState();
    state.settings.age = 70; // triggers 65+ BMI range
  });

  // Note: at age=70 (male), pulse=70 falls in PERFECT band (perfectHi=68+5adj=73)
  // → pulse score = 20 pts instead of 10 pts for age=50.
  // Baseline at age=70: BP=40, Pulse=20, Pills=20 → core raw = 80

  it('bmi=26 is normal for age 70 (10 pts) + 100% activity → score=100', () => {
    // age=70: pulse perfect (20 pts) → core=80; BMI=10, Act=10 → raw=100/100 → 100
    setBMI(26); // 65+ normal band (22-27) → 10 pts
    enableActivity(10000);
    const { score } = calcHealthScore();
    expect(score).toBe(100);
    expect(getDetailedScores().bmi).toBe(10);
  });

  it('bmi=26 would be overweight for age 50 (7 pts) → confirms age matters', () => {
    // age=50: pulse ok (10 pts) → core=70; BMI=7, Act=10 → raw=87/100 → 87
    state.settings.age = 50;
    setBMI(26); // under-65: hi=24.9 → overweight → 7 pts
    enableActivity(10000);
    const { score } = calcHealthScore();
    expect(score).toBe(87); // (70+7+10)/100*100 = 87
    expect(getDetailedScores().bmi).toBe(7);
  });

  it('bmi=26 age 70 (10 pts) gives higher combined score than bmi=26 age 50 (7 pts)', () => {
    // age=70: core=80, BMI=10, Act=10 → 100/100 = 100
    // age=50: core=70, BMI=7,  Act=10 →  87/100 = 87
    setBMI(26);
    enableActivity(10000);
    state.settings.age = 70;
    const scoreAt70 = calcHealthScore().score;

    resetState();
    setBMI(26);
    enableActivity(10000);
    state.settings.age = 50;
    const scoreAt50 = calcHealthScore().score;

    expect(scoreAt70).toBeGreaterThan(scoreAt50);
    expect(scoreAt70).toBe(100);
    expect(scoreAt50).toBe(87);
  });
});
