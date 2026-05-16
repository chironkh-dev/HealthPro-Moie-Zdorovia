// Integration tests: 7-day measurement window, averaging, veto, and dataPool fallback.
//
// Core logic in calcHealthScore():
//   last7 = measurements.filter(m => new Date(m.time) > now - 7×86400000)
//   dataPool = last7.length > 0 ? last7 : [measurements[0]]
//
//   avgSys/avgDia = Math.round(mean of dataPool)
//   pulsePool = dataPool.filter(m => m.pulse)   ← falsy pulse excluded
//   avgPulse  = pulsePool.length ? avg(pulsePool) : null
//
//   Veto: based on measurements[0] (the newest), NOT on the average.
//
// Baseline (age=50 male, no pills, no BMI, no activity):
//   BP thresholds (age 18-59):
//     perfect ≤ 120/80  → 40 pts     good ≤ 130/85 → 35 pts
//     fair    ≤ 140/90  → 25 pts     poor ≤ 160/100→ 15 pts
//     bad     ≤ 180/110 →  5 pts     else           →  0 pts
//   Pulse (male, <60): perfectLo=55 perfectHi=68 okLo=45 okHi=100
//     [55-68] → 20 pts   [45-100] → 10 pts   else → 0 pts
//   Pills (none prescribed) → 20 pts
//   max = 80 (BMI + Activity excluded)
//   score = round(raw / 80 × 100)
//
// Veto multipliers (applied after scaling):
//   sys≥180 || dia≥120  → Hard Cap max=10  (crisis)
//   sys≥160 || dia≥100  → Hard Cap max=25  (hypertension-2)
//   sys<85  || dia<55   → Hard Cap max=30  (hypotension)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state } from '../src/core/state.js';
import { calcHealthScore, getDetailedScores } from '../src/features/analytics/health-score.js';

vi.mock('../src/features/steps/index.js', () => ({
  getStepCount: vi.fn().mockReturnValue(0),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function msAgo(n) { return Date.now() - n * 86400000; }
function daysAgo(n) { return new Date(msAgo(n)).toISOString(); }

function m(sys, dia, pulse, daysBack = 0) {
  return { sys, dia, pulse: pulse ?? 70, time: daysAgo(daysBack) };
}

// measurementAt(sys, dia, pulse, days) — newest first is conventional
function resetState() {
  state.lang         = 'uk';
  state.pills        = [];
  state.pillsTaken   = {};
  state.settings     = { age: 50, stepsEnabled: false };
  state.measurements = [];
}

function score()  { return calcHealthScore().score; }
function status() { return calcHealthScore().status; }
function details(field) { calcHealthScore(); return getDetailedScores()[field]; }

// ── Section 1: 7-day window selection ─────────────────────────────────────

describe('7-day window — which measurements are included in the average', () => {
  beforeEach(resetState);

  it('single recent measurement → used directly', () => {
    state.measurements = [m(115, 75, 70, 0)];
    // BP=40, pulse=10, pills=20 → raw=70 → round(70/80×100)=88
    expect(score()).toBe(88);
  });

  it('7 recent perfect measurements → same score as 1 perfect', () => {
    state.measurements = [0, 1, 2, 3, 4, 5, 6].map((d) => m(115, 75, 70, d));
    expect(score()).toBe(88);
    expect(details('avgSys')).toBe(115);
    expect(details('avgDia')).toBe(75);
  });

  it('old measurements (8+ days) are excluded from average, recent ones dominate', () => {
    // 5 recent perfect + 2 old bad
    state.measurements = [
      m(115, 75, 70, 0),  // recent
      m(115, 75, 70, 2),  // recent
      m(115, 75, 70, 4),  // recent
      m(115, 75, 70, 5),  // recent
      m(115, 75, 70, 6),  // recent  ← last7 border (6 days = within)
      m(160, 100, 70, 8), // OLD — excluded
      m(180, 115, 70, 10),// OLD — excluded
    ];
    // Only 5 measurements used → avg=115/75 → perfect → score=88
    expect(score()).toBe(88);
    expect(details('avgSys')).toBe(115);
  });

  it('when old bad measurements ARE included, score drops — confirms exclusion is correct', () => {
    // Same bad values but placed within 7-day window → score must drop
    state.measurements = [
      m(115, 75, 70, 0),
      m(115, 75, 70, 2),
      m(115, 75, 70, 4),
      m(115, 75, 70, 5),
      m(115, 75, 70, 6),
      m(160, 100, 70, 6), // within window this time
      m(180, 115, 70, 5), // within window this time
    ];
    // All 7 within → avg affected by bad values → score < 88
    expect(score()).toBeLessThan(88);
  });

  it('measurement at exactly 6 days ago (< 7 days) is included', () => {
    // 1 perfect recent + 1 bad at exactly 6 days ago
    state.measurements = [
      m(115, 75, 70, 0),
      m(165, 105, 70, 6), // 6 days = within window
    ];
    // Both used → avg worse than perfect → score < 88
    const s = score();
    expect(s).toBeLessThan(88);
  });

  it('measurement at 8 days ago is excluded (outside 7-day window)', () => {
    state.measurements = [
      m(115, 75, 70, 0),
      m(165, 105, 70, 8), // 8 days = outside window
    ];
    // Only today's measurement used → perfect → score=88
    expect(score()).toBe(88);
  });

  it('only old measurements → fallback to measurements[0] only', () => {
    state.measurements = [
      m(115, 75, 70, 8),  // OLD, but measurements[0] — used as fallback
      m(165, 105, 70, 10),// OLD, measurements[1] — NOT used in fallback
      m(180, 115, 70, 14),// OLD, measurements[2] — NOT used in fallback
    ];
    // last7=[] → dataPool=[measurements[0]] → avg=115/75 → perfect → score=88
    expect(score()).toBe(88);
    expect(details('avgSys')).toBe(115);
    expect(details('avgDia')).toBe(75);
  });

  it('fallback uses ONLY measurements[0], not all old ones', () => {
    // If fallback used all old measurements, avg would be (115+165+180)/3=153
    state.measurements = [
      m(115, 75, 70, 8),
      m(165, 105, 70, 10),
      m(180, 115, 70, 14),
    ];
    // Only measurements[0]=115/75 → perfect
    expect(details('avgSys')).toBe(115);
    // Confirm measurements[1] and [2] did NOT influence the result
    expect(details('avgDia')).toBe(75);
  });
});

// ── Section 2: BP averaging affects score ─────────────────────────────────

describe('BP averaging — how 7-day mean changes the score band', () => {
  beforeEach(resetState);

  it('all perfect (sys≤120, dia≤80) → BP=40, score=88', () => {
    state.measurements = [0, 1, 2, 3, 4, 5, 6].map((d) => m(115, 75, 70, d));
    expect(details('bp')).toBe(40);
    expect(score()).toBe(88);
  });

  it('6 perfect + 1 good-band reading → average crosses into good (35 pts)', () => {
    // avg(sys) = round((6×115 + 125)/7) = round(855+125/7) hmm let me recalc
    // 6×115=690, +125=815 → 815/7=116.4 → round=116 — still perfect!
    // Need a reading that pushes avg above 120:
    // 6×115 + X > 120×7=840 → X > 150. Use sys=155:
    // avg(sys)=round((6×115+155)/7)=round((690+155)/7)=round(845/7)=round(120.7)=121
    // avg(dia)=round((6×75+90)/7)=round((450+90)/7)=round(540/7)=round(77.1)=77
    // sys=121 > 120 (perfect), ≤ 130 (good); dia=77 ≤ 85 (good) → 35 pts
    state.measurements = [
      m(115, 75, 70, 0), // measurements[0] (no veto)
      m(115, 75, 70, 1),
      m(115, 75, 70, 2),
      m(115, 75, 70, 3),
      m(115, 75, 70, 4),
      m(115, 75, 70, 5),
      m(155, 90, 70, 6), // pulls avg above 120
    ];
    expect(details('bp')).toBe(35);
    // raw=35+10+20=65 → round(65/80×100)=round(81.25)=81
    expect(score()).toBe(81);
  });

  it('half perfect, half fair-level → average lands in fair band (25 pts)', () => {
    // 4×(115/75) + 4×(155/98):
    // avg(sys)=round((4×115+4×155)/8)=round((460+620)/8)=round(1080/8)=135
    // avg(dia)=round((4×75+4×98)/8)=round((300+392)/8)=round(692/8)=round(86.5)=87
    // sys=135 ≤ 140 (fair.sys), dia=87 ≤ 90 (fair.dia) → 25 pts
    state.measurements = [
      m(115, 75, 70, 0), // measurements[0], no veto
      m(115, 75, 70, 1),
      m(115, 75, 70, 2),
      m(115, 75, 70, 3),
      m(155, 98, 70, 4),
      m(155, 98, 70, 5),
      m(155, 98, 70, 6),
    ];
    // avg(sys)=round((4×115+3×155)/7)=round((460+465)/7)=round(925/7)=round(132.1)=132
    // avg(dia)=round((4×75+3×98)/7)=round((300+294)/7)=round(594/7)=round(84.9)=85
    // sys=132 > 130 (good), ≤ 140 (fair); dia=85 ≤ 90 (fair) → 25 pts
    expect(details('bp')).toBe(25);
    expect(details('avgSys')).toBe(132);
    expect(details('avgDia')).toBe(85);
    // raw=25+10+20=55 → round(55/80×100)=round(68.75)=69
    expect(score()).toBe(69);
    expect(status()).toBe('good'); // 65-79
  });

  it('7 days of consistently elevated (145/92) → poor band (15 pts)', () => {
    // sys=145 > 140 (fair.sys), ≤ 160 (poor.sys); dia=92 ≤ 100 (poor.dia) → 15 pts
    state.measurements = [0, 1, 2, 3, 4, 5, 6].map((d) => m(145, 92, 70, d));
    expect(details('bp')).toBe(15);
    // raw=15+10+20=45 → round(45/80×100)=round(56.25)=56
    expect(score()).toBe(56);
    expect(status()).toBe('fair'); // 50-64
  });

  it('7 days of bad BP (170/108) → bad band (5 pts), HT-2 Hard Cap applies', () => {
    // sys=170 ≤ 180 (bad.sys); dia=108 ≤ 110 (bad.dia) → 5 pts
    // measurements[0].sys=170 ≥ 160 → hypertension-2 Hard Cap
    // pre-veto raw=5+10+20=35 → pre-veto score=round(35/80×100)=44
    // HT-2 Hard Cap: min(44, 25) = 25
    state.measurements = [0, 1, 2, 3, 4, 5, 6].map((d) => m(170, 108, 70, d));
    expect(details('bp')).toBe(5);
    expect(details('isVetoApplied')).toBe(true);
    expect(details('vetoReason')).toBe('hypertension-2');
    expect(score()).toBe(25);
    expect(status()).toBe('hypertension-2');
  });

  it('7 days of worst BP (185/122) → 0 pts + crisis Hard Cap', () => {
    // sys=185 > 180 (bad.sys) OR dia=122 > 110 → 0 pts
    // measurements[0].sys=185 ≥ 180 → crisis Hard Cap
    state.measurements = [0, 1, 2, 3, 4, 5, 6].map((d) => m(185, 122, 70, d));
    expect(details('bp')).toBe(0);
    expect(details('vetoReason')).toBe('hypertensive-crisis');
    // raw=0+10+20=30 → pre-veto=round(30/80×100)=38 → crisis Hard Cap: min(38, 10) = 10
    expect(score()).toBe(10);
    expect(status()).toBe('crisis');
  });

  it('old bad BP (8+ days) does NOT affect current score — only recent pool counts', () => {
    // Old bad measurements outside window → excluded → recent perfect wins
    state.measurements = [
      m(115, 75, 70, 0),
      m(115, 75, 70, 2),
      m(175, 110, 70, 8),  // outside window
      m(180, 118, 70, 10), // outside window
    ];
    // last7=[today, 2-days-ago] → avg=115/75 → perfect → score=88
    expect(score()).toBe(88);
    expect(details('bp')).toBe(40);
  });
});

// ── Section 3: Veto based on measurements[0] only ─────────────────────────

describe('veto is based on measurements[0] (newest), NOT on the 7-day average', () => {
  beforeEach(resetState);

  it('perfect 7-day average but crisis measurements[0] → veto applied', () => {
    // measurements[0]=crisis, rest=perfect within 7 days
    state.measurements = [
      m(185, 125, 70, 0), // crisis → triggers veto
      m(115, 75,  70, 1),
      m(115, 75,  70, 2),
      m(115, 75,  70, 3),
      m(115, 75,  70, 4),
      m(115, 75,  70, 5),
      m(115, 75,  70, 6),
    ];
    // avg(sys)=round((185+6×115)/7)=round((185+690)/7)=round(875/7)=round(125)=125
    // avg(dia)=round((125+6×75)/7)=round((125+450)/7)=round(575/7)=round(82.1)=82
    // sys=125≤130(good.sys), dia=82≤85(good.dia) → 35 pts
    // raw=35+10+20=65 → pre-veto=round(65/80×100)=81
    // crisis Hard Cap: measurements[0].sys=185≥180 → min(81, 10) = 10
    expect(details('isVetoApplied')).toBe(true);
    expect(details('vetoReason')).toBe('hypertensive-crisis');
    expect(score()).toBe(10);
    expect(status()).toBe('crisis');
  });

  it('perfect measurements[0] but bad 7-day average → NO veto, low score only', () => {
    state.measurements = [
      m(115, 75,  70, 0), // normal → no veto
      m(170, 110, 70, 1),
      m(170, 110, 70, 2),
      m(170, 110, 70, 3),
      m(170, 110, 70, 4),
      m(170, 110, 70, 5),
      m(170, 110, 70, 6),
    ];
    // avg(sys)=round((115+6×170)/7)=round((115+1020)/7)=round(1135/7)=round(162.1)=162
    // avg(dia)=round((75+6×110)/7)=round((75+660)/7)=round(735/7)=round(105)=105
    // sys=162 ≤ 180(bad.sys), dia=105 ≤ 110(bad.dia) → 5 pts
    // raw=5+10+20=35 → score=round(35/80×100)=44
    // Veto: measurements[0].sys=115 < 160 → NO veto
    expect(details('isVetoApplied')).toBe(false);
    expect(details('bp')).toBe(5);
    expect(score()).toBe(44);
    expect(status()).toBe('poor'); // <50
  });

  it('hypertension-2 Hard Cap: measurements[0].sys=162 ≥ 160 → max=25', () => {
    state.measurements = [
      m(162, 80, 70, 0), // sys=162 ≥ 160 → hypertension-2
      m(115, 75, 70, 1),
      m(115, 75, 70, 2),
    ];
    expect(details('isVetoApplied')).toBe(true);
    expect(details('vetoReason')).toBe('hypertension-2');
    expect(status()).toBe('hypertension-2');
  });

  it('hypertension-2 Hard Cap: measurements[0].dia=102 ≥ 100 → max=25', () => {
    state.measurements = [
      m(140, 102, 70, 0), // dia=102 ≥ 100 → veto
      m(115, 75,  70, 1),
    ];
    expect(details('isVetoApplied')).toBe(true);
    expect(details('vetoReason')).toBe('hypertension-2');
  });

  it('hypotension Hard Cap: measurements[0].sys=80 < 85 → max=30', () => {
    state.measurements = [
      m(80, 50, 70, 0), // sys<85 → hypotension veto
      m(115, 75, 70, 1),
    ];
    expect(details('isVetoApplied')).toBe(true);
    expect(details('vetoReason')).toBe('hypotension');
    expect(status()).toBe('hypotension');
  });

  it('hypotension Hard Cap: measurements[0].dia=52 < 55 → max=30', () => {
    state.measurements = [
      m(110, 52, 70, 0), // dia<55 → hypotension veto
      m(115, 75, 70, 1),
    ];
    expect(details('isVetoApplied')).toBe(true);
    expect(details('vetoReason')).toBe('hypotension');
  });

  it('crisis veto overrides hypertension-2 (sys≥180 checked first)', () => {
    state.measurements = [
      m(183, 100, 70, 0), // sys≥180 → crisis (even though dia=100 would also trigger ht2)
    ];
    expect(details('vetoReason')).toBe('hypertensive-crisis');
  });

  it('old crisis (8+ days) as measurements[0] fallback → veto still applied', () => {
    // Only old measurements → fallback to measurements[0]
    // measurements[0] is the old crisis → veto IS applied
    state.measurements = [
      m(185, 125, 70, 8), // old crisis, but IS measurements[0]
    ];
    // last7=[] → dataPool=[measurements[0]] → crisis measurement used both for avg and veto
    expect(details('isVetoApplied')).toBe(true);
    expect(details('vetoReason')).toBe('hypertensive-crisis');
    expect(status()).toBe('crisis');
  });
});

// ── Section 4: Pulse averaging within 7-day window ────────────────────────

describe('pulse averaging — only pulse-present measurements are averaged', () => {
  beforeEach(resetState);

  it('all measurements with same pulse → avg equals that pulse', () => {
    state.measurements = [0, 1, 2].map((d) => m(115, 75, 70, d));
    expect(details('avgPulse')).toBe(70);
    expect(details('pulseExcluded')).toBe(false);
  });

  it('mix of pulse-present and pulse-absent: avg from pulse-present only', () => {
    // 3 with pulse=70, 3 without pulse (pulse=0 → falsy)
    state.measurements = [
      { sys: 115, dia: 75, pulse: 70, time: daysAgo(0) },
      { sys: 115, dia: 75, pulse: 70, time: daysAgo(1) },
      { sys: 115, dia: 75, pulse: 70, time: daysAgo(2) },
      { sys: 115, dia: 75, pulse: 0,  time: daysAgo(3) }, // 0 → excluded from pulsePool
      { sys: 115, dia: 75, pulse: 0,  time: daysAgo(4) },
      { sys: 115, dia: 75, pulse: 0,  time: daysAgo(5) },
    ];
    // pulsePool = 3 measurements with pulse=70 → avg=70 → 10 pts
    expect(details('avgPulse')).toBe(70);
    expect(details('pulseExcluded')).toBe(false);
  });

  it('pulse average is computed correctly across different values', () => {
    // avg(60, 70, 80) = round(210/3) = 70
    state.measurements = [
      { sys: 115, dia: 75, pulse: 60, time: daysAgo(0) },
      { sys: 115, dia: 75, pulse: 70, time: daysAgo(1) },
      { sys: 115, dia: 75, pulse: 80, time: daysAgo(2) },
    ];
    expect(details('avgPulse')).toBe(70);
  });

  it('all measurements without pulse → avgPulse=null, pulseExcluded=true, ІЗ-4: excluded from denom', () => {
    // pulse=0 → falsy → excluded from pulsePool → avgPulse=null
    state.measurements = [
      { sys: 115, dia: 75, pulse: 0, time: daysAgo(0) },
      { sys: 115, dia: 75, pulse: 0, time: daysAgo(1) },
    ];
    expect(details('avgPulse')).toBe(null);
    expect(details('pulseExcluded')).toBe(true);
    // ІЗ-4: Pulse excluded from denominator (same as BMI/activity when absent)
    // BP40 + Pills20; active max=60; raw=60 → score=round(60/60×100)=100
    expect(score()).toBe(100);
  });

  it('pulse in ok band (average=80) → 10 pts', () => {
    // okLo=45, okHi=100 → 80 is ok
    state.measurements = [0, 1, 2].map((d) => ({ sys: 115, dia: 75, pulse: 80, time: daysAgo(d) }));
    expect(details('pulse')).toBe(10);
  });

  it('pulse outside all bands (average=110) → 0 pts', () => {
    state.measurements = [0, 1].map((d) => ({ sys: 115, dia: 75, pulse: 110, time: daysAgo(d) }));
    expect(details('pulse')).toBe(0);
  });

  it('pulse in perfect band (average=65, male <60) → 20 pts', () => {
    // perfectLo=55, perfectHi=68 → 65 is perfect for male age 50
    state.measurements = [0, 1].map((d) => ({ sys: 115, dia: 75, pulse: 65, time: daysAgo(d) }));
    expect(details('pulse')).toBe(20);
    // raw=40+20+20=80 → score=round(80/80×100)=100
    expect(score()).toBe(100);
  });

  it('pulse averaged across days: (60+80)/2=70 → ok band (10 pts)', () => {
    state.measurements = [
      { sys: 115, dia: 75, pulse: 60, time: daysAgo(0) }, // ok (60 is ≥55 perfect)
      { sys: 115, dia: 75, pulse: 80, time: daysAgo(1) }, // ok
    ];
    // avg=round((60+80)/2)=70 → ok → 10 pts
    expect(details('avgPulse')).toBe(70);
    expect(details('pulse')).toBe(10);
  });

  it('pulse from old measurements (outside window) is excluded from avg', () => {
    state.measurements = [
      { sys: 115, dia: 75, pulse: 70,  time: daysAgo(0) },   // within
      { sys: 115, dia: 75, pulse: 110, time: daysAgo(9) },   // old — excluded
    ];
    // Only today's pulse=70 → ok → 10 pts
    expect(details('avgPulse')).toBe(70);
    expect(details('pulse')).toBe(10);
  });
});

// ── Section 5: full realistic scenarios ───────────────────────────────────

describe('realistic scenarios — full user weekly cycles', () => {
  beforeEach(resetState);

  it('ideal week: 7 days of perfect BP and pulse → score=88', () => {
    state.measurements = [0, 1, 2, 3, 4, 5, 6].map((d) => m(115, 75, 65, d));
    // pulse=65 ≤ 68 → perfect (20 pts)
    // raw=40+20+20=80 → score=100
    expect(score()).toBe(100);
    expect(status()).toBe('excellent');
  });

  it('typical healthy week: bp ok, pulse ok → score=88', () => {
    state.measurements = [0, 1, 2, 3, 4, 5, 6].map((d) => m(115, 75, 70, d));
    // pulse=70 ok (10 pts) → raw=70 → 88
    expect(score()).toBe(88);
    expect(status()).toBe('excellent');
  });

  it('stressful week: perfect rest days cancel out 2 elevated days', () => {
    state.measurements = [
      m(115, 75, 70, 0), // perfect
      m(115, 75, 70, 1), // perfect
      m(115, 75, 70, 2), // perfect
      m(115, 75, 70, 3), // perfect
      m(115, 75, 70, 4), // perfect
      m(138, 88, 70, 5), // slightly elevated, within good band still
      m(138, 88, 70, 6), // slightly elevated
    ];
    // avg(sys)=round((5×115+2×138)/7)=round((575+276)/7)=round(851/7)=round(121.6)=122
    // avg(dia)=round((5×75+2×88)/7)=round((375+176)/7)=round(551/7)=round(78.7)=79
    // sys=122>120(perfect), ≤130(good); dia=79≤85(good) → 35 pts
    expect(details('bp')).toBe(35);
    expect(details('avgSys')).toBe(122);
    // raw=35+10+20=65 → round(65/80×100)=81
    expect(score()).toBe(81);
    expect(status()).toBe('excellent');
  });

  it('no measurements → score=0, status=null', () => {
    state.measurements = [];
    const result = calcHealthScore();
    expect(result.score).toBe(0);
    expect(result.status).toBe(null);
  });

  it('recovery scenario: past week bad, today perfect → today determines score trend', () => {
    // measurements[0]=today perfect, old week bad (>7 days)
    state.measurements = [
      m(115, 75, 70, 0),  // today — measurements[0], no veto
      m(165, 105, 70, 8), // last week bad — excluded from window
      m(170, 108, 70, 9),
      m(168, 106, 70, 10),
    ];
    // last7=[today] → avg=115/75 → perfect
    expect(details('avgSys')).toBe(115);
    expect(details('bp')).toBe(40);
    expect(score()).toBe(88);
    expect(details('isVetoApplied')).toBe(false);
  });

  it('gradual improvement: 7-day average moves from fair to good as old bad drop off', () => {
    // Simulate: 3 recent perfect + 4 recent fair-level
    const recentFair = [
      m(138, 88, 70, 4),
      m(138, 88, 70, 5),
      m(138, 88, 70, 6),
    ];
    const recentPerfect = [
      m(115, 75, 70, 0),
      m(115, 75, 70, 1),
      m(115, 75, 70, 2),
      m(115, 75, 70, 3),
    ];
    state.measurements = [...recentPerfect, ...recentFair];
    // avg(sys)=round((4×115+3×138)/7)=round((460+414)/7)=round(874/7)=round(124.9)=125
    // avg(dia)=round((4×75+3×88)/7)=round((300+264)/7)=round(564/7)=round(80.6)=81
    // sys=125>120, ≤130(good); dia=81≤85(good) → 35 pts → score=81
    expect(details('bp')).toBe(35);
    expect(score()).toBe(81);
    expect(status()).toBe('excellent');
  });

  it('veto from last measurement does not affect avgSys/avgDia stored in details', () => {
    // Veto multiplies the final score, but raw component scores are still calculated normally
    state.measurements = [
      m(182, 118, 70, 0), // crisis → veto
      m(115, 75,  70, 1),
    ];
    calcHealthScore();
    const d = getDetailedScores();
    // avgSys and avgDia reflect the true average (used for BP scoring)
    expect(d.avgSys).toBe(Math.round((182 + 115) / 2));
    expect(d.avgDia).toBe(Math.round((118 + 75) / 2));
    // Crisis veto is applied after scoring
    expect(d.isVetoApplied).toBe(true);
    expect(d.vetoReason).toBe('hypertensive-crisis');
  });
});
