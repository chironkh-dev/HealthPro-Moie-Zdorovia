// Tests: custom stepGoal × BMI interaction.
//
// scoreActivity() uses: settings.stepGoal || 10000 (default)
// Progress bands (steps / goal):
//   ≥ 1.00 → 10 pts   ≥ 0.75 → 8 pts   ≥ 0.50 → 6 pts
//   ≥ 0.25 →  3 pts   < 0.25 → 0 pts
//
// For a given stepGoal G the 5 thresholds in actual steps are:
//   G×0.25 (25%) / G×0.50 (50%) / G×0.75 (75%) / G (100%)
//
// Combined score when BOTH active (BMI=10, max=100):
//   score = 70(core) + 10(bmi) + actPts = 80 + actPts
//   → [80, 83, 86, 88, 90] for actPts [0,3,6,8,10]
//
// Combined score when BMI excluded (max=90):
//   score = round((70 + actPts) / 90 × 100)
//   → [78, 81, 84, 87, 89] for actPts [0,3,6,8,10]
//
// Key insight tested in Section 4:
//   Same progress % → same actPts → same score, regardless of goal magnitude.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../src/core/state.js';
import { calcHealthScore, getDetailedScores } from '../src/features/analytics/health-score.js';

// ── Mock step counter ──────────────────────────────────────────────────────
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

// height=200 → bmi = weight / 4 exactly
function setNormalBMI() {
  state.settings.height = 200;
  state.settings.weight = 88; // bmi=22 → normal → 10 pts
}

function enableActivity(steps, goal) {
  state.settings.stepsEnabled = true;
  state.settings.stepGoal     = goal;
  vi.mocked(getStepCount).mockReturnValue(steps);
}

function actPts()  { calcHealthScore(); return getDetailedScores().activity; }
function score()   { return calcHealthScore().score; }

// ── Section 1: Goal=5000 — all 5 progress bands ───────────────────────────

describe('custom stepGoal=5000 — all 5 progress bands', () => {
  beforeEach(resetState);

  const GOAL = 5000;
  // threshold steps for each band boundary
  const t25 = GOAL * 0.25;  // 1250
  const t50 = GOAL * 0.50;  // 2500
  const t75 = GOAL * 0.75;  // 3750

  it('0 pts when steps < 25% threshold (steps=1249)', () => {
    enableActivity(t25 - 1, GOAL);
    expect(actPts()).toBe(0);
  });

  it('3 pts at exactly 25% threshold (steps=1250)', () => {
    enableActivity(t25, GOAL);
    expect(actPts()).toBe(3);
  });

  it('6 pts at exactly 50% threshold (steps=2500)', () => {
    enableActivity(t50, GOAL);
    expect(actPts()).toBe(6);
  });

  it('8 pts at exactly 75% threshold (steps=3750)', () => {
    enableActivity(t75, GOAL);
    expect(actPts()).toBe(8);
  });

  it('10 pts at exactly 100% (steps=5000)', () => {
    enableActivity(GOAL, GOAL);
    expect(actPts()).toBe(10);
  });

  it('10 pts when steps exceed goal (steps=8000 > 5000)', () => {
    enableActivity(8000, GOAL);
    expect(actPts()).toBe(10);
  });

  it('boundary: 1249 steps → 0 pts; 1250 steps → 3 pts', () => {
    enableActivity(1249, GOAL);
    const below = actPts();
    resetState(); enableActivity(1250, GOAL);
    const at = actPts();
    expect(below).toBe(0);
    expect(at).toBe(3);
  });

  it('boundary: 2499 steps → 3 pts; 2500 steps → 6 pts', () => {
    enableActivity(2499, GOAL);
    const below = actPts();
    resetState(); enableActivity(2500, GOAL);
    const at = actPts();
    expect(below).toBe(3);
    expect(at).toBe(6);
  });

  it('boundary: 4999 steps → 8 pts; 5000 steps → 10 pts', () => {
    enableActivity(4999, GOAL);
    const below = actPts();
    resetState(); enableActivity(5000, GOAL);
    const at = actPts();
    expect(below).toBe(8);
    expect(at).toBe(10);
  });
});

// ── Section 2: Goal=7500 — all 5 progress bands ───────────────────────────

describe('custom stepGoal=7500 — all 5 progress bands', () => {
  beforeEach(resetState);

  const GOAL = 7500;

  it('0 pts when steps < 25% (steps=1874)', () => {
    enableActivity(1874, GOAL);
    expect(actPts()).toBe(0);
  });

  it('3 pts at 25% (steps=1875)', () => {
    enableActivity(1875, GOAL);
    expect(actPts()).toBe(3);
  });

  it('6 pts at 50% (steps=3750)', () => {
    enableActivity(3750, GOAL);
    expect(actPts()).toBe(6);
  });

  it('8 pts at 75% (steps=5625)', () => {
    enableActivity(5625, GOAL);
    expect(actPts()).toBe(8);
  });

  it('10 pts at 100% (steps=7500)', () => {
    enableActivity(7500, GOAL);
    expect(actPts()).toBe(10);
  });

  it('10 pts when steps exceed goal (steps=12000 > 7500)', () => {
    enableActivity(12000, GOAL);
    expect(actPts()).toBe(10);
  });
});

// ── Section 3: Goal=15000 — all 5 progress bands ──────────────────────────

describe('custom stepGoal=15000 — all 5 progress bands', () => {
  beforeEach(resetState);

  const GOAL = 15000;

  it('0 pts when steps < 25% (steps=3749)', () => {
    enableActivity(3749, GOAL);
    expect(actPts()).toBe(0);
  });

  it('3 pts at 25% (steps=3750)', () => {
    enableActivity(3750, GOAL);
    expect(actPts()).toBe(3);
  });

  it('6 pts at 50% (steps=7500)', () => {
    enableActivity(7500, GOAL);
    expect(actPts()).toBe(6);
  });

  it('8 pts at 75% (steps=11250)', () => {
    enableActivity(11250, GOAL);
    expect(actPts()).toBe(8);
  });

  it('10 pts at 100% (steps=15000)', () => {
    enableActivity(15000, GOAL);
    expect(actPts()).toBe(10);
  });

  it('boundary: 3749 → 0 pts; 3750 → 3 pts', () => {
    enableActivity(3749, GOAL);
    const below = actPts();
    resetState(); enableActivity(3750, GOAL);
    const at = actPts();
    expect(below).toBe(0);
    expect(at).toBe(3);
  });

  it('boundary: 11249 → 6 pts; 11250 → 8 pts', () => {
    enableActivity(11249, GOAL);
    const below = actPts();
    resetState(); enableActivity(11250, GOAL);
    const at = actPts();
    expect(below).toBe(6);
    expect(at).toBe(8);
  });
});

// ── Section 4: Score invariance — same % progress → same score ────────────
//
// With BMI=10 and both modules active (max=100):
//   score = 80 + actPts
// This must hold for ANY goal magnitude when the same percentage is reached.

describe('score invariance — same progress % → same score regardless of goal', () => {
  beforeEach(resetState);

  const GOALS = [5000, 7500, 10000, 15000, 20000];

  // For each goal, compute the steps for each progress level
  function stepsForProgress(pct, goal) {
    return Math.floor(goal * pct);
  }

  it('actPts=3 (25% progress) is independent of goal magnitude', () => {
    GOALS.forEach((goal) => {
      resetState();
      setNormalBMI();
      enableActivity(stepsForProgress(0.25, goal), goal);
      expect(actPts()).toBe(3);
    });
  });

  it('actPts=6 (50% progress) is independent of goal magnitude', () => {
    GOALS.forEach((goal) => {
      resetState();
      setNormalBMI();
      enableActivity(stepsForProgress(0.5, goal), goal);
      expect(actPts()).toBe(6);
    });
  });

  it('actPts=8 (75% progress) is independent of goal magnitude', () => {
    GOALS.forEach((goal) => {
      resetState();
      setNormalBMI();
      enableActivity(stepsForProgress(0.75, goal), goal);
      expect(actPts()).toBe(8);
    });
  });

  it('actPts=10 (100% progress) is independent of goal magnitude', () => {
    GOALS.forEach((goal) => {
      resetState();
      setNormalBMI();
      enableActivity(goal, goal);
      expect(actPts()).toBe(10);
    });
  });

  it('combined score at 100% is always 90 (BMI=10, max=100) for all goals', () => {
    GOALS.forEach((goal) => {
      resetState();
      setNormalBMI();
      enableActivity(goal, goal);
      expect(calcHealthScore().score).toBe(90);
    });
  });

  it('combined score at 50% is always 86 (BMI=10, act=6, 80+6=86/100) for all goals', () => {
    GOALS.forEach((goal) => {
      resetState();
      setNormalBMI();
      enableActivity(stepsForProgress(0.5, goal), goal);
      expect(calcHealthScore().score).toBe(86);
    });
  });

  it('combined score at 0% is always 80 (BMI=10, act=0, 80+0=80/100) for all goals', () => {
    GOALS.forEach((goal) => {
      resetState();
      setNormalBMI();
      enableActivity(0, goal);
      expect(calcHealthScore().score).toBe(80);
    });
  });
});

// ── Section 5: BMI excluded + custom goal ─────────────────────────────────
//
// Without BMI (max=90): score = round((70 + actPts) / 90 × 100)
// [0,3,6,8,10] pts → [78,81,84,87,89]

describe('custom stepGoal + BMI excluded (max=90)', () => {
  beforeEach(resetState); // no height/weight → BMI excluded

  const GOALS = [5000, 7500, 10000, 15000];

  it('0% progress → actPts=0 → score=78 for any goal', () => {
    GOALS.forEach((goal) => {
      resetState();
      enableActivity(0, goal);
      expect(calcHealthScore().score).toBe(78);
    });
  });

  it('25% progress → actPts=3 → score=81 for any goal', () => {
    GOALS.forEach((goal) => {
      resetState();
      enableActivity(Math.floor(goal * 0.25), goal);
      expect(calcHealthScore().score).toBe(81);
    });
  });

  it('50% progress → actPts=6 → score=84 for any goal', () => {
    GOALS.forEach((goal) => {
      resetState();
      enableActivity(Math.floor(goal * 0.5), goal);
      expect(calcHealthScore().score).toBe(84);
    });
  });

  it('75% progress → actPts=8 → score=87 for any goal', () => {
    GOALS.forEach((goal) => {
      resetState();
      enableActivity(Math.floor(goal * 0.75), goal);
      expect(calcHealthScore().score).toBe(87);
    });
  });

  it('100% progress → actPts=10 → score=89 for any goal', () => {
    GOALS.forEach((goal) => {
      resetState();
      enableActivity(goal, goal);
      expect(calcHealthScore().score).toBe(89);
    });
  });
});

// ── Section 6: default goal fallback ──────────────────────────────────────

describe('default stepGoal (10000) when not set', () => {
  beforeEach(resetState);

  it('falls back to 10000 when stepGoal is not set in settings', () => {
    state.settings.stepsEnabled = true;
    delete state.settings.stepGoal;
    vi.mocked(getStepCount).mockReturnValue(10000);
    expect(actPts()).toBe(10);
  });

  it('falls back to 10000 when stepGoal=0 (falsy)', () => {
    state.settings.stepsEnabled = true;
    state.settings.stepGoal = 0;
    vi.mocked(getStepCount).mockReturnValue(10000);
    expect(actPts()).toBe(10);
  });

  it('5000 steps = 50% of default 10000 → 6 pts', () => {
    state.settings.stepsEnabled = true;
    delete state.settings.stepGoal;
    vi.mocked(getStepCount).mockReturnValue(5000);
    expect(actPts()).toBe(6);
  });

  it('explicit goal=10000 and implicit default give same actPts', () => {
    enableActivity(7500, 10000);
    const explicit = actPts();

    resetState();
    state.settings.stepsEnabled = true;
    delete state.settings.stepGoal;
    vi.mocked(getStepCount).mockReturnValue(7500);
    const implicit = actPts();

    expect(explicit).toBe(8);
    expect(implicit).toBe(8);
  });
});

// ── Section 7: BMI bands × stepGoal cross-check ───────────────────────────
//
// Verify score formula at 100% steps for all 4 BMI bands and 3 custom goals.
// With max=100: score = 70 + bmiPts + 10 (100% activity)

describe('BMI bands × custom stepGoal — full cross-check at 100% progress', () => {
  beforeEach(resetState);

  // [bmiVal, bmiPts, expectedScore at 100% steps (max=100)]
  const bands = [
    [22, 10, 90],  // normal:     70+10+10=90
    [27,  7, 87],  // overweight: 70+7+10=87
    [32,  4, 84],  // obesity I:  70+4+10=84
    [40,  0, 80],  // severe:     70+0+10=80
  ];

  const GOALS = [5000, 10000, 15000];

  bands.forEach(([bmiVal, bmiPts, expectedScore]) => {
    GOALS.forEach((goal) => {
      it(`BMI=${bmiPts}pts (bmi=${bmiVal}) + 100% of goal=${goal} → score=${expectedScore}`, () => {
        state.settings.height = 200;
        state.settings.weight = bmiVal * 4;
        enableActivity(goal, goal);
        expect(calcHealthScore().score).toBe(expectedScore);
        expect(getDetailedScores().bmi).toBe(bmiPts);
        expect(getDetailedScores().activity).toBe(10);
      });
    });
  });
});
