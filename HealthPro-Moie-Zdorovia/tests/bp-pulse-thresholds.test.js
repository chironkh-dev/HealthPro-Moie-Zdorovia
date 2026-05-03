// Unit tests for getBPThresholds() and getPulseThresholds().
// These helpers drive the personalised scoring logic: if the user has set
// their own baseline in the profile, thresholds shift relative to it.
// Otherwise age/gender WHO/AHA defaults are used.

import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../src/core/state.js';
import {
  getBPThresholds,
  getPulseThresholds,
} from '../src/features/analytics/health-score.js';

function resetState() {
  state.lang     = 'uk';
  state.settings = {};
}

// ─────────────────────────────────────────────────────────────────────────────
// getBPThresholds()
// ─────────────────────────────────────────────────────────────────────────────

describe('getBPThresholds() — personal norm mode', () => {
  beforeEach(resetState);

  it('activates personal mode when both normalSys and normalDia are valid', () => {
    state.settings.normalSys = '115';
    state.settings.normalDia = '75';
    const th = getBPThresholds();
    expect(th.personal).toBe(true);
  });

  it('computes perfect band as baseline +5 sys / +5 dia', () => {
    state.settings.normalSys = '115';
    state.settings.normalDia = '75';
    const th = getBPThresholds();
    expect(th.perfect).toEqual({ sys: 120, dia: 80 });
  });

  it('computes good band as baseline +10 sys / +8 dia', () => {
    state.settings.normalSys = '115';
    state.settings.normalDia = '75';
    const th = getBPThresholds();
    expect(th.good).toEqual({ sys: 125, dia: 83 });
  });

  it('computes fair band as baseline +20 sys / +12 dia', () => {
    state.settings.normalSys = '115';
    state.settings.normalDia = '75';
    const th = getBPThresholds();
    expect(th.fair).toEqual({ sys: 135, dia: 87 });
  });

  it('computes poor band as baseline +35 sys / +20 dia', () => {
    state.settings.normalSys = '115';
    state.settings.normalDia = '75';
    const th = getBPThresholds();
    expect(th.poor).toEqual({ sys: 150, dia: 95 });
  });

  it('computes bad band as baseline +50 sys / +30 dia', () => {
    state.settings.normalSys = '115';
    state.settings.normalDia = '75';
    const th = getBPThresholds();
    expect(th.bad).toEqual({ sys: 165, dia: 105 });
  });

  it('accepts normalSys at lower boundary (80)', () => {
    state.settings.normalSys = '80';
    state.settings.normalDia = '50';
    const th = getBPThresholds();
    expect(th.personal).toBe(true);
    expect(th.perfect.sys).toBe(85);
    expect(th.perfect.dia).toBe(55);
  });

  it('accepts normalSys at upper boundary (200)', () => {
    state.settings.normalSys = '200';
    state.settings.normalDia = '130';
    const th = getBPThresholds();
    expect(th.personal).toBe(true);
    expect(th.perfect.sys).toBe(205);
  });

  it('accepts string values from form fields', () => {
    state.settings.normalSys = '120';
    state.settings.normalDia = '80';
    const th = getBPThresholds();
    expect(th.personal).toBe(true);
    expect(th.perfect).toEqual({ sys: 125, dia: 85 });
  });
});

describe('getBPThresholds() — personal norm NOT activated (fallback)', () => {
  beforeEach(resetState);

  it('falls back to age-band when only normalSys is provided', () => {
    state.settings.normalSys = '115';
    // normalDia not set
    state.settings.age = 35;
    const th = getBPThresholds();
    expect(th.personal).toBeUndefined();
    expect(th.perfect.sys).toBe(120); // 18-59 band
  });

  it('falls back to age-band when only normalDia is provided', () => {
    state.settings.normalDia = '75';
    // normalSys not set
    state.settings.age = 35;
    const th = getBPThresholds();
    expect(th.personal).toBeUndefined();
    expect(th.perfect.sys).toBe(120);
  });

  it('falls back when normalSys is below minimum valid range (< 80)', () => {
    state.settings.normalSys = '70';
    state.settings.normalDia = '75';
    state.settings.age = 35;
    const th = getBPThresholds();
    expect(th.personal).toBeUndefined();
  });

  it('falls back when normalSys is above maximum valid range (> 200)', () => {
    state.settings.normalSys = '210';
    state.settings.normalDia = '75';
    state.settings.age = 35;
    const th = getBPThresholds();
    expect(th.personal).toBeUndefined();
  });

  it('falls back when normalDia is below minimum valid range (< 50)', () => {
    state.settings.normalSys = '115';
    state.settings.normalDia = '40';
    state.settings.age = 35;
    const th = getBPThresholds();
    expect(th.personal).toBeUndefined();
  });
});

describe('getBPThresholds() — age-based defaults', () => {
  beforeEach(resetState);

  it('returns under-18 band for age 12', () => {
    state.settings.age = 12;
    const th = getBPThresholds();
    expect(th.perfect).toEqual({ sys: 110, dia: 70 });
    expect(th.good).toEqual({ sys: 120, dia: 78 });
    expect(th.fair).toEqual({ sys: 130, dia: 85 });
    expect(th.poor).toEqual({ sys: 150, dia: 95 });
    expect(th.bad).toEqual({ sys: 170, dia: 108 });
  });

  it('returns under-18 band for age 17 (boundary)', () => {
    state.settings.age = 17;
    const th = getBPThresholds();
    expect(th.perfect.sys).toBe(110);
  });

  it('returns 18-59 band for age 18 (lower boundary)', () => {
    state.settings.age = 18;
    const th = getBPThresholds();
    expect(th.perfect).toEqual({ sys: 120, dia: 80 });
    expect(th.good).toEqual({ sys: 130, dia: 85 });
    expect(th.fair).toEqual({ sys: 140, dia: 90 });
    expect(th.poor).toEqual({ sys: 160, dia: 100 });
    expect(th.bad).toEqual({ sys: 180, dia: 110 });
  });

  it('returns 18-59 band for age 35 (mid-range)', () => {
    state.settings.age = 35;
    const th = getBPThresholds();
    expect(th.perfect.sys).toBe(120);
  });

  it('returns 18-59 band for age 59 (upper boundary)', () => {
    state.settings.age = 59;
    const th = getBPThresholds();
    expect(th.perfect.sys).toBe(120);
  });

  it('returns 60-79 band for age 60 (lower boundary)', () => {
    state.settings.age = 60;
    const th = getBPThresholds();
    expect(th.perfect).toEqual({ sys: 130, dia: 85 });
    expect(th.good).toEqual({ sys: 140, dia: 90 });
    expect(th.fair).toEqual({ sys: 150, dia: 95 });
    expect(th.poor).toEqual({ sys: 165, dia: 105 });
    expect(th.bad).toEqual({ sys: 180, dia: 115 });
  });

  it('returns 60-79 band for age 70 (mid-range)', () => {
    state.settings.age = 70;
    const th = getBPThresholds();
    expect(th.perfect.sys).toBe(130);
  });

  it('returns 60-79 band for age 79 (upper boundary)', () => {
    state.settings.age = 79;
    const th = getBPThresholds();
    expect(th.perfect.sys).toBe(130);
  });

  it('returns 80+ band for age 80 (lower boundary)', () => {
    state.settings.age = 80;
    const th = getBPThresholds();
    expect(th.perfect).toEqual({ sys: 140, dia: 90 });
    expect(th.good).toEqual({ sys: 150, dia: 92 });
    expect(th.fair).toEqual({ sys: 160, dia: 98 });
    expect(th.poor).toEqual({ sys: 175, dia: 108 });
    expect(th.bad).toEqual({ sys: 190, dia: 118 });
  });

  it('returns 80+ band for age 90', () => {
    state.settings.age = 90;
    const th = getBPThresholds();
    expect(th.perfect.sys).toBe(140);
  });

  it('defaults to age 50 (18-59 band) when age is not set', () => {
    // state.settings = {} — no age
    const th = getBPThresholds();
    expect(th.perfect.sys).toBe(120);
  });

  it('defaults to age 50 when age is an invalid string', () => {
    state.settings.age = 'abc';
    const th = getBPThresholds();
    expect(th.perfect.sys).toBe(120); // 18-59 band (age 50 default)
  });

  it('language change does NOT affect BP thresholds (pure math)', () => {
    state.settings.age = 35;
    state.lang = 'uk';
    const thUk = getBPThresholds();

    state.lang = 'ru';
    const thRu = getBPThresholds();

    expect(thUk).toEqual(thRu);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPulseThresholds()
// ─────────────────────────────────────────────────────────────────────────────

describe('getPulseThresholds() — personal norm mode', () => {
  beforeEach(resetState);

  it('activates personal mode when normalPulse is valid (40–120)', () => {
    state.settings.normalPulse = '70';
    const th = getPulseThresholds();
    expect(th.personal).toBe(true);
  });

  it('computes perfect band as normalPulse ±10', () => {
    state.settings.normalPulse = '70';
    const th = getPulseThresholds();
    expect(th.perfectLo).toBe(60); // 70-10
    expect(th.perfectHi).toBe(80); // 70+10
  });

  it('computes ok band as normalPulse ±20', () => {
    state.settings.normalPulse = '70';
    const th = getPulseThresholds();
    expect(th.okLo).toBe(50); // 70-20
    expect(th.okHi).toBe(90); // 70+20
  });

  it('clamps perfectLo at minimum 40', () => {
    state.settings.normalPulse = '45'; // 45-10=35 → clamped to 40
    const th = getPulseThresholds();
    expect(th.perfectLo).toBe(40);
  });

  it('clamps perfectHi at maximum 120', () => {
    state.settings.normalPulse = '115'; // 115+10=125 → clamped to 120
    const th = getPulseThresholds();
    expect(th.perfectHi).toBe(120);
  });

  it('clamps okLo at minimum 35', () => {
    state.settings.normalPulse = '50'; // 50-20=30 → clamped to 35
    const th = getPulseThresholds();
    expect(th.okLo).toBe(35);
  });

  it('clamps okHi at maximum 130', () => {
    state.settings.normalPulse = '115'; // 115+20=135 → clamped to 130
    const th = getPulseThresholds();
    expect(th.okHi).toBe(130);
  });

  it('accepts normalPulse at lower boundary (40)', () => {
    state.settings.normalPulse = '40';
    const th = getPulseThresholds();
    expect(th.personal).toBe(true);
    expect(th.perfectLo).toBe(40); // max(40, 40-10=30) = 40
    expect(th.perfectHi).toBe(50); // 40+10
  });

  it('accepts normalPulse at upper boundary (120)', () => {
    state.settings.normalPulse = '120';
    const th = getPulseThresholds();
    expect(th.personal).toBe(true);
    expect(th.perfectHi).toBe(120); // min(120, 120+10=130) = 120
  });
});

describe('getPulseThresholds() — personal norm NOT activated (fallback)', () => {
  beforeEach(resetState);

  it('falls back when normalPulse < 40', () => {
    state.settings.normalPulse = '35';
    const th = getPulseThresholds();
    expect(th.personal).toBe(false);
  });

  it('falls back when normalPulse > 120', () => {
    state.settings.normalPulse = '125';
    const th = getPulseThresholds();
    expect(th.personal).toBe(false);
  });

  it('falls back when normalPulse is not set', () => {
    // state.settings = {} — no normalPulse
    const th = getPulseThresholds();
    expect(th.personal).toBe(false);
  });
});

describe('getPulseThresholds() — age/gender defaults', () => {
  beforeEach(resetState);

  it('returns male under-60 thresholds (perfectHi = 68)', () => {
    state.settings.age    = 35;
    state.settings.gender = 'm';
    const th = getPulseThresholds();
    expect(th.perfectLo).toBe(55);
    expect(th.perfectHi).toBe(68); // base=68, adj=0
    expect(th.okLo).toBe(45);
    expect(th.okHi).toBe(100);
  });

  it('returns female under-60 thresholds (perfectHi = 72)', () => {
    state.settings.age    = 35;
    state.settings.gender = 'f';
    const th = getPulseThresholds();
    expect(th.perfectHi).toBe(72); // base=72, adj=0
  });

  it('adds age adjustment (+5) for male aged 60+', () => {
    state.settings.age    = 65;
    state.settings.gender = 'm';
    const th = getPulseThresholds();
    expect(th.perfectHi).toBe(73); // base=68, adj=5
  });

  it('adds age adjustment (+5) for female aged 60+', () => {
    state.settings.age    = 65;
    state.settings.gender = 'f';
    const th = getPulseThresholds();
    expect(th.perfectHi).toBe(77); // base=72, adj=5
  });

  it('applies adjustment exactly at age boundary (age=60)', () => {
    state.settings.age    = 60;
    state.settings.gender = 'm';
    const th = getPulseThresholds();
    expect(th.perfectHi).toBe(73); // adj kicks in at >=60
  });

  it('does NOT apply age adjustment at age 59', () => {
    state.settings.age    = 59;
    state.settings.gender = 'm';
    const th = getPulseThresholds();
    expect(th.perfectHi).toBe(68); // adj=0
  });

  it('defaults to male when gender is not set', () => {
    state.settings.age = 35;
    // no gender in settings
    const th = getPulseThresholds();
    expect(th.perfectHi).toBe(68); // male default
  });

  it('defaults to age 50 (male, no adj) when age is not set', () => {
    state.settings.gender = 'm';
    const th = getPulseThresholds();
    expect(th.perfectHi).toBe(68); // age 50 → adj=0
  });

  it('okLo, okHi are always 45 and 100 in age/gender mode', () => {
    state.settings.age    = 70;
    state.settings.gender = 'f';
    const th = getPulseThresholds();
    expect(th.okLo).toBe(45);
    expect(th.okHi).toBe(100);
  });

  it('language change does NOT affect pulse thresholds (pure math)', () => {
    state.settings.age    = 35;
    state.settings.gender = 'm';

    state.lang = 'uk';
    const thUk = getPulseThresholds();

    state.lang = 'ru';
    const thRu = getPulseThresholds();

    expect(thUk).toEqual(thRu);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: threshold selection drives scoreBP correctly
// (verified through calcHealthScore + getDetailedScores)
// ─────────────────────────────────────────────────────────────────────────────

import { calcHealthScore, getDetailedScores } from '../src/features/analytics/health-score.js';

describe('threshold selection → score integration', () => {
  beforeEach(() => {
    resetState();
    state.settings = { stepsEnabled: false };
    state.measurements = [];
    state.pills = [];
    state.pillsTaken = {};
  });

  it('personal BP norm: 130/85 is perfect when baseline is 125/80', () => {
    state.settings.normalSys = '125';
    state.settings.normalDia = '80';
    // perfect band → sys ≤ 130, dia ≤ 85
    state.measurements = [{ sys: 130, dia: 85, pulse: 68, time: new Date().toISOString() }];
    calcHealthScore();
    expect(getDetailedScores().bp).toBe(40);
  });

  it('personal BP norm: 120/80 drops to "good" band when reading is 128/86', () => {
    state.settings.normalSys = '120';
    state.settings.normalDia = '80';
    // perfect ≤ 125/85; good ≤ 130/88; 128/86 → good band
    state.measurements = [{ sys: 128, dia: 86, pulse: 68, time: new Date().toISOString() }];
    calcHealthScore();
    expect(getDetailedScores().bp).toBe(35);
  });

  it('age-based default: 125/82 is perfect for a 35-year-old (perfect ≤ 120/80 → not perfect → good)', () => {
    state.settings.age = 35;
    // age band 18-59: perfect={120,80}; good={130,85}; 125/82 → good
    state.measurements = [{ sys: 125, dia: 82, pulse: 68, time: new Date().toISOString() }];
    calcHealthScore();
    expect(getDetailedScores().bp).toBe(35);
  });

  it('age-based default: 138/88 is perfect for an 80-year-old (perfect ≤ 140/90)', () => {
    state.settings.age = 80;
    state.measurements = [{ sys: 138, dia: 88, pulse: 68, time: new Date().toISOString() }];
    calcHealthScore();
    expect(getDetailedScores().bp).toBe(40);
  });

  it('personal pulse norm: pulse 68 scores perfect when baseline is 70 (±10 band)', () => {
    state.settings.normalPulse = '70'; // perfect: 60–80
    state.measurements = [{ sys: 115, dia: 75, pulse: 68, time: new Date().toISOString() }];
    calcHealthScore();
    expect(getDetailedScores().pulse).toBe(20);
  });

  it('age/gender default: pulse 68 scores ok (not perfect) for male age 35 (perfectHi=68 → edge)', () => {
    state.settings.age    = 35;
    state.settings.gender = 'm';
    // perfectHi = 68; 68 === 68 → inside perfect band (<=)
    state.measurements = [{ sys: 115, dia: 75, pulse: 68, time: new Date().toISOString() }];
    calcHealthScore();
    expect(getDetailedScores().pulse).toBe(20);
  });

  it('age/gender default: pulse 69 scores ok (not perfect) for male age 35 (perfectHi=68)', () => {
    state.settings.age    = 35;
    state.settings.gender = 'm';
    // 69 > perfectHi(68) → falls to ok band
    state.measurements = [{ sys: 115, dia: 75, pulse: 69, time: new Date().toISOString() }];
    calcHealthScore();
    expect(getDetailedScores().pulse).toBe(10);
  });

  it('age/gender default: pulse 69 scores perfect for male age 65 (perfectHi=73)', () => {
    state.settings.age    = 65;
    state.settings.gender = 'm';
    // perfectHi = 68+5 = 73; 69 ≤ 73 → perfect
    state.measurements = [{ sys: 115, dia: 75, pulse: 69, time: new Date().toISOString() }];
    calcHealthScore();
    expect(getDetailedScores().pulse).toBe(20);
  });
});
