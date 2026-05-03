// Boundary-value tests for VETO coefficient switching and the `status` field.
//
// Key thresholds (last measurement, not 7-day average):
//   sys≥180  OR dia≥120 → crisis ×0.30       status='crisis'
//   sys≥160  OR dia≥100 → hypertension-2 ×0.60  status='hypertension-2'
//   sys<85   OR dia<55  → hypotension ×0.55      status='hypotension'
//
// All tests use default profile (male, age 50) with no personal norms,
// no pills, no BMI, no activity. Pulse always present (70 bpm) so that
// only BP drives the boundary crossing.

import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../src/core/state.js';
import { calcHealthScore, getDetailedScores } from '../src/features/analytics/health-score.js';

function resetState() {
  state.lang         = 'uk';
  state.measurements = [];
  state.pills        = [];
  state.pillsTaken   = {};
  state.settings     = { stepsEnabled: false };
}

function meas(sys, dia, pulse = 70) {
  const time = new Date().toISOString();
  state.measurements = [{ sys, dia, pulse, time }];
}

// ─── Helper: compute pre-veto score given (bpPts, pulsePts, pillsPts)
// active max = 80 (no BMI/activity), raw = sum, final = round(raw/80*100)
function preVeto(bpPts, pulsePts = 10, pillsPts = 20) {
  const raw = bpPts + pulsePts + pillsPts;
  return Math.round((raw / 80) * 100);
}

// ─── Status field ─────────────────────────────────────────────────────────────

describe('status field — no veto', () => {
  beforeEach(resetState);

  it('returns status=excellent for score ≥ 80', () => {
    meas(115, 75, 68); // BP perfect(40) + pulse perfect(20) + pills(20) → 100 → excellent
    expect(calcHealthScore().status).toBe('excellent');
  });

  it('returns status=good for score in 65–79', () => {
    // BP fair(25) + pulse ok(10) + pills(20) = 55; round(55/80*100) = 69 → good
    meas(138, 87); // 138>130(good) & 87>85(good) but ≤140/90(fair) → 25 pts
    expect(calcHealthScore().status).toBe('good');
  });

  it('returns status=fair for score in 50–64', () => {
    // BP poor(15) + pulse ok(10) + pills(20) = 45; round(45/80*100) = 56 → fair
    meas(145, 92);
    expect(calcHealthScore().status).toBe('fair');
  });

  it('returns status=poor for score < 50', () => {
    // BP 0 (sys>180) without crisis veto would be poor,
    // but if sys=175 dia=112 → bad band: sys≤180 dia≤110? 112>110 → 0 pts, but no crisis veto
    // sys=175 dia=108 → bad band: 175≤180 && 108≤110 → 5; pre-veto=round(35/80*100)=44 → poor
    // No veto: 175<180, 108<120 crisis? No. 175≥160 → HT-2 veto! Use a different case.
    // sys=155, dia=98, no veto: poor band(15) + pulse ok(10) + pills(20)=45 → 56 → fair...
    // Let's use: BP=5 (bad band), no veto (sys=178, dia=108 → bad:5, no crisis(178<180,108<120), no ht2(178≥160!) → HT-2!
    // Hard to get pre-veto 'poor' without triggering a veto since ht2 kicks in at sys≥160.
    // Use pulse=0 instead of 10:
    // BP=0(bad, sys=178 → HT-2 veto): nope.
    // Let's use elevated dia only: sys=120, dia=103 → HT-2 (dia>=100). Skip.
    // Actually 'poor' (0-49) without veto would require very bad scores on all modules.
    // With only BP+pulse+pills active (max=80):
    //   0+0+0=0 → 0 → poor. Trigger: no pulse (0), pills fail, bp=0.
    // Use: sys=175, dia=108 (bad band → 5 pts), no pills, pulse=0 (absent).
    // But sys=175 >= 160 → HT-2 veto... Can't avoid.
    // Conclusion: in practice, score<50 without veto requires all modules to fail.
    // Test this by using failing pills + low-but-not-vetoed BP:
    // sys=155, dia=98 → poor(15). Pulse 0 (use absent). Pills 0. max=80; raw=15; 15/80*100=19 → poor!
    state.pills = [{ id: 1, name: 'T', dose: '1', time: '08:00', days: 'daily' }];
    state.pillsTaken = {};
    meas(155, 98, null); // pulse absent → 0 (strict)
    const { score, status } = calcHealthScore();
    expect(score).toBeLessThan(50);
    expect(status).toBe('poor');
  });

  it('returns status=null when no measurements', () => {
    expect(calcHealthScore().status).toBeNull();
  });
});

describe('status field — veto cases', () => {
  beforeEach(resetState);

  it('returns status=crisis for sys≥180', () => {
    meas(185, 110);
    expect(calcHealthScore().status).toBe('crisis');
  });

  it('returns status=crisis for dia≥120', () => {
    meas(130, 122);
    expect(calcHealthScore().status).toBe('crisis');
  });

  it('returns status=hypertension-2 for sys≥160 (below crisis)', () => {
    meas(165, 98);
    expect(calcHealthScore().status).toBe('hypertension-2');
  });

  it('returns status=hypertension-2 for dia≥100 (below crisis)', () => {
    meas(130, 102);
    expect(calcHealthScore().status).toBe('hypertension-2');
  });

  it('returns status=hypotension for sys<85', () => {
    meas(84, 60);
    expect(calcHealthScore().status).toBe('hypotension');
  });

  it('returns status=hypotension for dia<55', () => {
    meas(100, 54);
    expect(calcHealthScore().status).toBe('hypotension');
  });
});

// ─── CRISIS boundary: sys 179 vs 180 ─────────────────────────────────────────

describe('crisis veto boundary — sys threshold', () => {
  beforeEach(resetState);

  it('sys=180 → crisis veto ×0.30 applied', () => {
    meas(180, 80);
    // BP: 180<=180 && 80<=110 → 5 (bad band); pulse ok=10; pills=20
    // pre-veto = round(35/80*100) = round(43.75) = 44
    // crisis: round(44*0.30) = round(13.2) = 13
    const { score } = calcHealthScore();
    expect(score).toBe(13);
    expect(getDetailedScores().isVetoApplied).toBe(true);
    expect(getDetailedScores().vetoReason).toBe('hypertensive-crisis');
  });

  it('sys=179 → HT-2 veto ×0.60 (not crisis)', () => {
    meas(179, 80);
    // BP: 179<=180 && 80<=110 → 5; pre-veto=44
    // HT-2 (sys>=160): round(44*0.60) = round(26.4) = 26
    const { score } = calcHealthScore();
    expect(score).toBe(26);
    expect(getDetailedScores().vetoReason).toBe('hypertension-2');
  });

  it('sys=180 score is strictly lower than sys=179 (stronger veto)', () => {
    meas(180, 80);
    const { score: s180 } = calcHealthScore();
    state.measurements = [{ sys: 179, dia: 80, pulse: 70, time: new Date().toISOString() }];
    const { score: s179 } = calcHealthScore();
    expect(s180).toBeLessThan(s179);
  });
});

// ─── CRISIS boundary: dia 119 vs 120 ─────────────────────────────────────────

describe('crisis veto boundary — dia threshold', () => {
  beforeEach(resetState);

  it('dia=120 → crisis veto ×0.30 applied', () => {
    meas(130, 120);
    // BP: 130<=180 && 120<=110? No → falls through all bands → 0
    // pre-veto = round(30/80*100) = round(37.5) = 38
    // crisis (dia>=120): round(38*0.30) = round(11.4) = 11
    const { score } = calcHealthScore();
    expect(score).toBe(11);
    expect(getDetailedScores().vetoReason).toBe('hypertensive-crisis');
  });

  it('dia=119 → HT-2 veto ×0.60 (not crisis)', () => {
    meas(130, 119);
    // BP: 130<=160 && 119<=100? No. All fail → 0
    // pre-veto = round(30/80*100) = 38
    // HT-2 (dia>=100): round(38*0.60) = round(22.8) = 23
    const { score } = calcHealthScore();
    expect(score).toBe(23);
    expect(getDetailedScores().vetoReason).toBe('hypertension-2');
  });

  it('dia=120 score is strictly lower than dia=119 (stronger veto)', () => {
    meas(130, 120);
    const { score: s120 } = calcHealthScore();
    state.measurements = [{ sys: 130, dia: 119, pulse: 70, time: new Date().toISOString() }];
    const { score: s119 } = calcHealthScore();
    expect(s120).toBeLessThan(s119);
  });
});

// ─── HT-2 boundary: sys 159 vs 160 ───────────────────────────────────────────

describe('hypertension-2 veto boundary — sys threshold', () => {
  beforeEach(resetState);

  it('sys=160 → HT-2 veto ×0.60 applied', () => {
    meas(160, 80);
    // BP: 160<=160 && 80<=100 → 15 (poor band); pulse=10; pills=20
    // pre-veto = round(45/80*100) = round(56.25) = 56
    // HT-2: round(56*0.60) = round(33.6) = 34
    const { score } = calcHealthScore();
    expect(score).toBe(34);
    expect(getDetailedScores().vetoReason).toBe('hypertension-2');
  });

  it('sys=159 → NO veto (clear pass)', () => {
    meas(159, 80);
    // BP: 159<=160 && 80<=100 → 15; pre-veto=56; no veto (159<160, 80<100, ≥85, ≥55)
    const { score } = calcHealthScore();
    expect(score).toBe(56);
    expect(getDetailedScores().isVetoApplied).toBe(false);
  });

  it('sys=160 score is strictly lower than sys=159 (veto kicks in)', () => {
    meas(160, 80);
    const { score: s160 } = calcHealthScore();
    state.measurements = [{ sys: 159, dia: 80, pulse: 70, time: new Date().toISOString() }];
    const { score: s159 } = calcHealthScore();
    expect(s160).toBeLessThan(s159);
  });
});

// ─── HT-2 boundary: dia 99 vs 100 ────────────────────────────────────────────

describe('hypertension-2 veto boundary — dia threshold', () => {
  beforeEach(resetState);

  it('dia=100 → HT-2 veto ×0.60 applied', () => {
    meas(130, 100);
    // BP: 130<=160 && 100<=100 → 15 (poor); pre-veto=56
    // HT-2 (dia>=100): round(56*0.60) = 34
    const { score } = calcHealthScore();
    expect(score).toBe(34);
    expect(getDetailedScores().vetoReason).toBe('hypertension-2');
  });

  it('dia=99 → NO veto (clear pass)', () => {
    meas(130, 99);
    // BP: 130<=160 && 99<=100 → 15; pre-veto=56; no veto
    const { score } = calcHealthScore();
    expect(score).toBe(56);
    expect(getDetailedScores().isVetoApplied).toBe(false);
  });
});

// ─── Hypotension boundary: sys 84 vs 85 ──────────────────────────────────────

describe('hypotension veto boundary — sys threshold', () => {
  beforeEach(resetState);

  it('sys=84 → hypotension veto ×0.55 applied', () => {
    meas(84, 60);
    // scoreBP: 84<85 → 10 (partial, veto applied below)
    // pulse ok=10; pills=20; max=80; raw=40; pre-veto=round(40/80*100)=50
    // hypotension: round(50*0.55) = round(27.5) = 28
    const { score } = calcHealthScore();
    expect(score).toBe(28);
    expect(getDetailedScores().vetoReason).toBe('hypotension');
  });

  it('sys=85 → NO veto (clear pass)', () => {
    meas(85, 60);
    // scoreBP: 85>=85, 60>=55 → bands. 85<=120 && 60<=80 → 40 (perfect)
    // pulse=10; pills=20; max=80; raw=70; finalScore=round(70/80*100)=88
    const { score } = calcHealthScore();
    expect(score).toBe(88);
    expect(getDetailedScores().isVetoApplied).toBe(false);
  });

  it('sys=85 score is strictly higher than sys=84 (no veto vs veto)', () => {
    meas(85, 60);
    const { score: s85 } = calcHealthScore();
    state.measurements = [{ sys: 84, dia: 60, pulse: 70, time: new Date().toISOString() }];
    const { score: s84 } = calcHealthScore();
    expect(s85).toBeGreaterThan(s84);
  });
});

// ─── Hypotension boundary: dia 54 vs 55 ──────────────────────────────────────

describe('hypotension veto boundary — dia threshold', () => {
  beforeEach(resetState);

  it('dia=54 → hypotension veto ×0.55 applied', () => {
    meas(100, 54);
    // scoreBP: dia=54 < 55 → 10
    // pre-veto = round(40/80*100) = 50
    // hypotension: round(50*0.55) = 28
    const { score } = calcHealthScore();
    expect(score).toBe(28);
    expect(getDetailedScores().vetoReason).toBe('hypotension');
  });

  it('dia=55 → NO veto (clear pass, BP perfect band)', () => {
    meas(100, 55);
    // scoreBP: 100<=120 && 55<=80 → 40 (perfect)
    // pre-veto: round(70/80*100) = 88; no veto
    const { score } = calcHealthScore();
    expect(score).toBe(88);
    expect(getDetailedScores().isVetoApplied).toBe(false);
  });
});

// ─── Veto coefficient precision ───────────────────────────────────────────────

describe('veto coefficient precision', () => {
  beforeEach(resetState);

  it('crisis ×0.30: pre-veto 44 → final 13', () => {
    meas(180, 80); // BP=5, pulse=10, pills=20 → pre=44
    const { score } = calcHealthScore();
    expect(score).toBe(Math.round(44 * 0.30)); // 13
  });

  it('HT-2 ×0.60: pre-veto 56 → final 34', () => {
    meas(160, 80); // BP=15, pulse=10, pills=20 → pre=56
    const { score } = calcHealthScore();
    expect(score).toBe(Math.round(56 * 0.60)); // 34
  });

  it('hypotension ×0.55: pre-veto 50 → final 28', () => {
    meas(84, 60); // BP=10, pulse=10, pills=20 → pre=50
    const { score } = calcHealthScore();
    expect(score).toBe(Math.round(50 * 0.55)); // 28
  });

  it('crisis ×0.30 is weaker multiplier than HT-2 ×0.60 (crisis penalises more)', () => {
    meas(180, 80);
    const { score: crisisScore } = calcHealthScore();
    state.measurements = [{ sys: 160, dia: 80, pulse: 70, time: new Date().toISOString() }];
    const { score: ht2Score } = calcHealthScore();
    expect(crisisScore).toBeLessThan(ht2Score);
  });

  it('result is always clamped to [0, 100]', () => {
    meas(200, 130);
    const { score } = calcHealthScore();
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ─── Priority: crisis takes precedence over HT-2 ─────────────────────────────

describe('veto priority ordering', () => {
  beforeEach(resetState);

  it('sys=185 & dia=110 → crisis (not HT-2), as crisis is checked first', () => {
    meas(185, 110);
    const d = getDetailedScores();
    calcHealthScore();
    expect(getDetailedScores().vetoReason).toBe('hypertensive-crisis');
  });

  it('sys=165 & dia=115 → crisis (dia≥120? No. sys≥180? No. sys≥160 → HT-2)', () => {
    meas(165, 115);
    calcHealthScore();
    // 165<180, 115<120 → no crisis. 165>=160 → HT-2
    expect(getDetailedScores().vetoReason).toBe('hypertension-2');
  });

  it('hypotension is not triggered when crisis already applies', () => {
    // sys=200, dia=130 → crisis.  sys<85 is false so hypotension would not apply anyway.
    meas(200, 130);
    calcHealthScore();
    expect(getDetailedScores().vetoReason).toBe('hypertensive-crisis');
  });
});
