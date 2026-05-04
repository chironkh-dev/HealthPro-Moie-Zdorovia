// Tests for scoreBMI() — BMI-based score module inside calcHealthScore().
//
// getBMIRange() returns:
//   age < 65  → { lo: 18.5, hi: 24.9 }   hiOver=29.9  hiOb1=34.9  lo-3=15.5
//   age >= 65 → { lo: 22,   hi: 27   }   hiOver=32     hiOb1=37    lo-3=19
//
// scoreBMI() returns:
//   null                              (no height/weight → excluded from denominator)
//   lo  ≤ bmi ≤ hi                  → 10 pts  (normal)
//   hi  < bmi ≤ hiOver              →  7 pts  (overweight)
//   (hiOver < bmi ≤ hiOb1)
//     OR (lo-3 ≤ bmi < lo)          →  4 pts  (obesity I or slight deficit)
//   else                             →  0 pts  (severe obesity or severe deficit)
//
// BMI is always optional: null → module excluded → denominator stays 80.
// When set → denominator is 90.
//
// Baseline (sys=115, dia=75, pulse=70, no pills, age=50, stepsEnabled=false):
//   BP=40, Pulse=10, Pills=20 → raw=70
//   BMI=null → max=80  score = round(70/80×100) = 88
//   BMI=10   → max=90  score = round(80/90×100) = 89
//   BMI= 7   → max=90  score = round(77/90×100) = 86
//   BMI= 4   → max=90  score = round(74/90×100) = 82
//   BMI= 0   → max=90  score = round(70/90×100) = 78
//
// Trick: height=200 cm → denominator = (200/100)² = 4
//   bmi = Math.round(weight / 4 * 10) / 10
//   So weight = bmi * 4 gives an exact BMI value, e.g. weight=74 → bmi=18.5

import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../src/core/state.js';
import { calcHealthScore, getDetailedScores } from '../src/features/analytics/health-score.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function resetState(age = 50) {
  state.lang         = 'uk';
  state.measurements = [{ sys: 115, dia: 75, pulse: 70, time: new Date().toISOString() }];
  state.pills        = [];
  state.pillsTaken   = {};
  state.settings     = { stepsEnabled: false, age };
}

// Set height=200 cm + weight to produce an exact BMI value (bmi = weight/4).
function setBMI(bmi) {
  state.settings.height = 200;
  state.settings.weight = bmi * 4;   // 200cm → denominator=4 → bmi exact
}

function bmiPts() {
  calcHealthScore();
  return getDetailedScores().bmi;
}

// ── 1. No BMI data → excluded from denominator ────────────────────────────
//
// Note: getDetailedScores().bmi stores 0 (not null) for UI display purposes.
// The exclusion is signalled via the bmiExcluded flag (true when excluded).

describe('scoreBMI() — no data → excluded (bmiExcluded=true)', () => {
  beforeEach(() => resetState());

  it('bmiExcluded=true when neither height nor weight is set', () => {
    calcHealthScore();
    expect(getDetailedScores().bmiExcluded).toBe(true);
  });

  it('bmiExcluded=true when only height is set (no weight)', () => {
    state.settings.height = 175;
    calcHealthScore();
    expect(getDetailedScores().bmiExcluded).toBe(true);
  });

  it('bmiExcluded=true when only weight is set (no height)', () => {
    state.settings.weight = 70;
    calcHealthScore();
    expect(getDetailedScores().bmiExcluded).toBe(true);
  });

  it('bmiExcluded=true when height is set but weight is 0 (falsy)', () => {
    state.settings.height = 175;
    state.settings.weight = 0;
    calcHealthScore();
    expect(getDetailedScores().bmiExcluded).toBe(true);
  });

  it('denominator stays 80 (max=80) when BMI excluded', () => {
    // No height/weight → BMI=null → max=80, raw=70 → round(70/80*100)=88
    expect(calcHealthScore().score).toBe(88);
  });

  it('denominator shifts to 90 (max=90) once height+weight are provided', () => {
    setBMI(22); // normal → 10 pts → max=90, raw=80 → round(80/90*100)=89
    expect(calcHealthScore().score).toBe(89);
  });

  it('bmiExcluded=false when both height and weight are set', () => {
    setBMI(22);
    calcHealthScore();
    expect(getDetailedScores().bmiExcluded).toBe(false);
  });
});

// ── 2. Normal band (10 pts) — age < 65: 18.5 ≤ bmi ≤ 24.9 ───────────────

describe('scoreBMI() — normal band → 10 pts (age < 65)', () => {
  beforeEach(() => resetState(50));

  it('returns 10 pts at lower boundary bmi=18.5 (lo)', () => {
    setBMI(18.5);
    expect(bmiPts()).toBe(10);
  });

  it('returns 10 pts at mid-range bmi=22.0', () => {
    setBMI(22);
    expect(bmiPts()).toBe(10);
  });

  it('returns 10 pts at upper boundary bmi=24.9 (hi)', () => {
    setBMI(24.9);
    expect(bmiPts()).toBe(10);
  });

  it('score = 89 with normal BMI (round(80/90*100))', () => {
    setBMI(22);
    expect(calcHealthScore().score).toBe(89);
  });
});

// ── 3. Overweight band (7 pts) — age < 65: 24.9 < bmi ≤ 29.9 ─────────────

describe('scoreBMI() — overweight band → 7 pts (age < 65)', () => {
  beforeEach(() => resetState(50));

  it('returns 7 pts just above hi: bmi=25.0', () => {
    setBMI(25);
    expect(bmiPts()).toBe(7);
  });

  it('returns 7 pts at mid-overweight: bmi=27.0', () => {
    setBMI(27);
    expect(bmiPts()).toBe(7);
  });

  it('returns 7 pts at upper boundary of overweight: bmi=29.9 (hiOver)', () => {
    setBMI(29.9);
    expect(bmiPts()).toBe(7);
  });

  it('score = 86 with overweight BMI (round(77/90*100))', () => {
    setBMI(27);
    expect(calcHealthScore().score).toBe(86);
  });

  it('boundary: bmi=24.9 → 10 pts; bmi=25.0 → 7 pts', () => {
    setBMI(24.9);
    const at_hi = bmiPts();

    resetState(50); setBMI(25);
    const above_hi = bmiPts();

    expect(at_hi).toBe(10);
    expect(above_hi).toBe(7);
  });
});

// ── 4. Obesity I band (4 pts) — age < 65: 29.9 < bmi ≤ 34.9 ─────────────

describe('scoreBMI() — obesity I band → 4 pts (age < 65)', () => {
  beforeEach(() => resetState(50));

  it('returns 4 pts just above hiOver: bmi=30.0', () => {
    setBMI(30);
    expect(bmiPts()).toBe(4);
  });

  it('returns 4 pts at mid obesity I: bmi=32.0', () => {
    setBMI(32);
    expect(bmiPts()).toBe(4);
  });

  it('returns 4 pts at upper boundary of obesity I: bmi=34.9 (hiOb1)', () => {
    setBMI(34.9);
    expect(bmiPts()).toBe(4);
  });

  it('score = 82 with obesity I BMI (round(74/90*100))', () => {
    setBMI(32);
    expect(calcHealthScore().score).toBe(82);
  });

  it('boundary: bmi=29.9 → 7 pts; bmi=30.0 → 4 pts', () => {
    setBMI(29.9);
    const at_hiOver = bmiPts();

    resetState(50); setBMI(30);
    const above_hiOver = bmiPts();

    expect(at_hiOver).toBe(7);
    expect(above_hiOver).toBe(4);
  });
});

// ── 5. Severe obesity (0 pts) — age < 65: bmi > 34.9 ─────────────────────

describe('scoreBMI() — severe obesity → 0 pts (age < 65)', () => {
  beforeEach(() => resetState(50));

  it('returns 0 pts just above hiOb1: bmi=35.0', () => {
    setBMI(35);
    expect(bmiPts()).toBe(0);
  });

  it('returns 0 pts at bmi=40 (morbid obesity)', () => {
    setBMI(40);
    expect(bmiPts()).toBe(0);
  });

  it('score = 78 with severe obesity (round(70/90*100))', () => {
    setBMI(40);
    expect(calcHealthScore().score).toBe(78);
  });

  it('boundary: bmi=34.9 → 4 pts; bmi=35.0 → 0 pts', () => {
    setBMI(34.9);
    const at_hiOb1 = bmiPts();

    resetState(50); setBMI(35);
    const above_hiOb1 = bmiPts();

    expect(at_hiOb1).toBe(4);
    expect(above_hiOb1).toBe(0);
  });
});

// ── 6. Slight deficit (4 pts) — age < 65: 15.5 ≤ bmi < 18.5 ─────────────

describe('scoreBMI() — slight deficit band → 4 pts (age < 65)', () => {
  beforeEach(() => resetState(50));

  it('returns 4 pts at lower boundary of deficit band: bmi=15.5 (lo-3)', () => {
    setBMI(15.5);
    expect(bmiPts()).toBe(4);
  });

  it('returns 4 pts at mid deficit: bmi=17.0', () => {
    setBMI(17);
    expect(bmiPts()).toBe(4);
  });

  it('returns 4 pts just below lo: bmi=18.4', () => {
    setBMI(18.4);
    expect(bmiPts()).toBe(4);
  });

  it('boundary: bmi=15.5 → 4 pts; bmi=15.4 → 0 pts (severe deficit)', () => {
    setBMI(15.5);
    const at_lo_minus3 = bmiPts();

    resetState(50); setBMI(15.4);
    const below_lo_minus3 = bmiPts();

    expect(at_lo_minus3).toBe(4);
    expect(below_lo_minus3).toBe(0);
  });
});

// ── 7. Severe deficit (0 pts) — age < 65: bmi < 15.5 ─────────────────────

describe('scoreBMI() — severe deficit → 0 pts (age < 65)', () => {
  beforeEach(() => resetState(50));

  it('returns 0 pts just below lo-3: bmi=15.4', () => {
    setBMI(15.4);
    expect(bmiPts()).toBe(0);
  });

  it('returns 0 pts at extreme underweight: bmi=12.0', () => {
    setBMI(12);
    expect(bmiPts()).toBe(0);
  });
});

// ── 8. Age 65+ adjustments (lo=22, hi=27, hiOver=32, hiOb1=37) ──────────

describe('scoreBMI() — age 65+ adjusted norms', () => {
  beforeEach(() => resetState(70));  // age=70 → 65+ band

  it('returns 10 pts at lo boundary: bmi=22.0 (lo for 65+)', () => {
    setBMI(22);
    expect(bmiPts()).toBe(10);
  });

  it('returns 10 pts at hi boundary: bmi=27.0 (hi for 65+)', () => {
    setBMI(27);
    expect(bmiPts()).toBe(10);
  });

  it('returns 7 pts just above hi: bmi=27.1 → overweight band', () => {
    // bmi=27.1 → weight=108.4 → calcBMI = Math.round(108.4/4*10)/10 = 27.1
    state.settings.height = 200;
    state.settings.weight = 108.4;
    expect(bmiPts()).toBe(7);
  });

  it('returns 7 pts at hiOver: bmi=32.0', () => {
    setBMI(32);
    expect(bmiPts()).toBe(7);
  });

  it('returns 4 pts in obesity I band for 65+: bmi=35.0', () => {
    setBMI(35);
    expect(bmiPts()).toBe(4);
  });

  it('returns 4 pts at hiOb1 boundary for 65+: bmi=37.0', () => {
    setBMI(37);
    expect(bmiPts()).toBe(4);
  });

  it('returns 0 pts above hiOb1 for 65+: bmi=38.0', () => {
    setBMI(38);
    expect(bmiPts()).toBe(0);
  });

  it('returns 4 pts in slight deficit band for 65+ (lo-3=19): bmi=19.0', () => {
    setBMI(19);
    expect(bmiPts()).toBe(4);
  });

  it('returns 4 pts just below lo for 65+: bmi=21.0 (19 ≤ bmi < 22)', () => {
    setBMI(21);
    expect(bmiPts()).toBe(4);
  });

  it('returns 0 pts below lo-3 for 65+: bmi=18.9', () => {
    // weight=75.6 → 75.6/4=18.9 → below lo-3=19 → 0 pts
    state.settings.height = 200;
    state.settings.weight = 75.6;
    expect(bmiPts()).toBe(0);
  });

  it('boundary for 65+: bmi=27.0 → 10 pts (hi); bmi=27.1 → 7 pts (just above)', () => {
    setBMI(27);
    const at_hi = bmiPts();

    resetState(70);
    state.settings.height = 200;
    state.settings.weight = 108.4;
    calcHealthScore();
    const above_hi = getDetailedScores().bmi;

    expect(at_hi).toBe(10);
    expect(above_hi).toBe(7);
  });

  it('age exactly 65 uses 65+ band (hi=27, not 24.9)', () => {
    state.settings.age = 65;
    setBMI(26); // inside 65+ normal, but overweight for under-65
    expect(bmiPts()).toBe(10);
  });

  it('age 64 uses standard band (hi=24.9): bmi=26 → 7 pts', () => {
    state.settings.age = 64;
    setBMI(26);
    expect(bmiPts()).toBe(7);
  });
});

// ── 9. Monotonicity & score formula ──────────────────────────────────────

describe('scoreBMI() — score formula and denominator interaction', () => {
  beforeEach(() => resetState(50));

  it('BMI pts monotonically ordered: 0 < 4 < 7 < 10', () => {
    setBMI(40);   calcHealthScore(); const s0 = getDetailedScores().bmi; // severe obesity
    resetState(50); setBMI(32);  calcHealthScore(); const s4 = getDetailedScores().bmi; // obesity I
    resetState(50); setBMI(27);  calcHealthScore(); const s7 = getDetailedScores().bmi; // overweight
    resetState(50); setBMI(22);  calcHealthScore(); const s10 = getDetailedScores().bmi; // normal

    expect(s0).toBe(0);
    expect(s4).toBe(4);
    expect(s7).toBe(7);
    expect(s10).toBe(10);
    expect(s0).toBeLessThan(s4);
    expect(s4).toBeLessThan(s7);
    expect(s7).toBeLessThan(s10);
  });

  it('BMI=null → max=80 → score=88', () => {
    // No height/weight set
    expect(calcHealthScore().score).toBe(88);
  });

  it('BMI=10 (normal) → max=90 → score=89  [round(80/90×100)]', () => {
    setBMI(22);
    expect(calcHealthScore().score).toBe(89);
  });

  it('BMI=7 (overweight) → max=90 → score=86  [round(77/90×100)]', () => {
    setBMI(27);
    expect(calcHealthScore().score).toBe(86);
  });

  it('BMI=4 (obesity I) → max=90 → score=82  [round(74/90×100)]', () => {
    setBMI(32);
    expect(calcHealthScore().score).toBe(82);
  });

  it('BMI=0 (severe obesity) → max=90 → score=78  [round(70/90×100)]', () => {
    setBMI(40);
    expect(calcHealthScore().score).toBe(78);
  });

  it('bad BMI (0 pts) gives lower score than no BMI (null) — penalty for wrong data entry', () => {
    const no_bmi = calcHealthScore().score; // BMI excluded → 88

    resetState(50); setBMI(40);
    const bad_bmi = calcHealthScore().score; // BMI=0 pts → 78

    expect(bad_bmi).toBeLessThan(no_bmi);
  });

  it('string height/weight values (from form fields) still resolve correctly', () => {
    state.settings.height = '175';
    state.settings.weight = '70';
    // bmi = 70 / (1.75^2) = 70/3.0625 = 22.857 → 22.9 → normal → 10 pts
    calcHealthScore();
    expect(getDetailedScores().bmi).toBe(10);
  });
});
