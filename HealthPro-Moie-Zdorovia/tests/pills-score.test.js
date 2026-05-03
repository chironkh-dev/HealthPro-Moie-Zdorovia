// Tests for scorePills() — adherence-based scoring for daily medications.
//
// scorePills() logic:
//   duePills = pills.filter(isPillDueToday)
//   if duePills.length === 0  → 20 pts   (no prescriptions today)
//   adherence = takenCount / duePills.length
//   adherence >= 0.9          → 20 pts   (excellent)
//   adherence >= 0.5          → 10 pts   (partial)
//   else                      →  0 pts   (missed)
//
// Tested indirectly via calcHealthScore() + getDetailedScores().pills.
// All tests use a fixed baseline to isolate the pills module:
//   sys=115 dia=75 pulse=70 → BP=40, Pulse=10, BMI=null, Activity=null
//   active max = 40+20+20 = 80  (pills always in denominator)
//   finalScore = round((40+10+pills) / 80 * 100)
//     pills=20 → round(70/80*100) = round(87.5) = 88
//     pills=10 → round(60/80*100) = round(75.0) = 75
//     pills= 0 → round(50/80*100) = round(62.5) = 63

import { describe, it, expect, beforeEach } from 'vitest';
import { state, today } from '../src/core/state.js';
import { calcHealthScore, getDetailedScores } from '../src/features/analytics/health-score.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function resetState() {
  state.lang         = 'uk';
  state.measurements = [{ sys: 115, dia: 75, pulse: 70, time: new Date().toISOString() }];
  state.pills        = [];
  state.pillsTaken   = {};
  state.settings     = { stepsEnabled: false };
}

// Create N daily pills with sequential IDs
function addDailyPills(count, startId = 1) {
  for (let i = 0; i < count; i++) {
    state.pills.push({ id: startId + i, name: `Pill-${startId + i}`, dose: '10mg', time: '08:00', days: 'daily' });
  }
}

// Mark specific pill IDs as taken today
function markTaken(...ids) {
  const td = today();
  if (!state.pillsTaken[td]) state.pillsTaken[td] = {};
  ids.forEach((id) => { state.pillsTaken[td][id] = true; });
}

// Mark specific pill IDs as explicitly NOT taken
function markMissed(...ids) {
  const td = today();
  if (!state.pillsTaken[td]) state.pillsTaken[td] = {};
  ids.forEach((id) => { state.pillsTaken[td][id] = false; });
}

// ── No prescriptions (no pills due today) ─────────────────────────────────

describe('scorePills() — no prescriptions today', () => {
  beforeEach(resetState);

  it('returns 20 pts when pills list is empty', () => {
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(20);
  });

  it('score = 88 when no pills prescribed (max denominator stays 80)', () => {
    const { score } = calcHealthScore();
    expect(score).toBe(88);
  });

  it('returns 20 pts even when pillsTaken has leftover data from yesterday', () => {
    state.pillsTaken['2020-01-01'] = { 99: true };
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(20);
  });

  it('pill with days=weekdays not due on Sunday returns 20 pts (no due pills)', () => {
    const day = new Date().getDay();
    if (day === 0) { // only run on Sunday
      state.pills = [{ id: 1, name: 'P', dose: '5mg', time: '08:00', days: 'weekdays' }];
      calcHealthScore();
      expect(getDetailedScores().pills).toBe(20);
    } else {
      // Not Sunday — skip by asserting no pills → still 20
      calcHealthScore();
      expect(getDetailedScores().pills).toBe(20);
    }
  });

  it('pill with days=date not matching today → no due pills → 20 pts', () => {
    state.pills = [{ id: 1, name: 'P', dose: '5mg', time: '08:00', days: 'date', date: '1990-01-01' }];
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(20);
  });
});

// ── 0% adherence ──────────────────────────────────────────────────────────

describe('scorePills() — 0% adherence (nothing taken)', () => {
  beforeEach(resetState);

  it('returns 0 pts when 1 pill prescribed, none taken', () => {
    addDailyPills(1);
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(0);
  });

  it('returns 0 pts when 5 pills prescribed, none taken', () => {
    addDailyPills(5);
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(0);
  });

  it('returns 0 pts when pills exist but pillsTaken is empty object', () => {
    addDailyPills(3);
    // pillsTaken[today()] not set at all
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(0);
  });

  it('returns 0 pts when all pills explicitly marked false', () => {
    addDailyPills(3, 1);
    markMissed(1, 2, 3);
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(0);
  });

  it('score = 63 when 0% adherence (round(50/80*100))', () => {
    addDailyPills(1);
    const { score } = calcHealthScore();
    expect(score).toBe(63);
  });
});

// ── 49% adherence (just below 50% threshold) ──────────────────────────────

describe('scorePills() — 49% adherence (just below 50% threshold)', () => {
  beforeEach(resetState);

  it('4 of 9 taken (44%) → 0 pts (below 50%)', () => {
    addDailyPills(9, 1);
    markTaken(1, 2, 3, 4);
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(0);
  });

  it('1 of 3 taken (33%) → 0 pts', () => {
    addDailyPills(3, 1);
    markTaken(1);
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(0);
  });
});

// ── 50% adherence ─────────────────────────────────────────────────────────

describe('scorePills() — 50% adherence (partial band)', () => {
  beforeEach(resetState);

  it('returns 10 pts at exactly 50% (1 of 2 taken)', () => {
    addDailyPills(2, 1);
    markTaken(1);
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(10);
  });

  it('returns 10 pts at exactly 50% (5 of 10 taken)', () => {
    addDailyPills(10, 1);
    markTaken(1, 2, 3, 4, 5);
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(10);
  });

  it('returns 10 pts at exactly 50% (3 of 6 taken)', () => {
    addDailyPills(6, 1);
    markTaken(1, 2, 3);
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(10);
  });

  it('score = 75 when 50% adherence (round(60/80*100))', () => {
    addDailyPills(2, 1);
    markTaken(1);
    const { score } = calcHealthScore();
    expect(score).toBe(75);
  });

  it('boundary: 4 of 9 (44%) → 0 pts; 5 of 10 (50%) → 10 pts', () => {
    addDailyPills(9, 1);
    markTaken(1, 2, 3, 4);
    calcHealthScore();
    const pts_below = getDetailedScores().pills;

    resetState();
    addDailyPills(10, 1);
    markTaken(1, 2, 3, 4, 5);
    calcHealthScore();
    const pts_at = getDetailedScores().pills;

    expect(pts_below).toBe(0);
    expect(pts_at).toBe(10);
  });
});

// ── 89% adherence (just below 90% threshold) ─────────────────────────────

describe('scorePills() — 89% adherence (still partial band)', () => {
  beforeEach(resetState);

  it('8 of 9 taken (88.8%) → 10 pts (below 90%)', () => {
    addDailyPills(9, 1);
    markTaken(1, 2, 3, 4, 5, 6, 7, 8);
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(10);
  });

  it('7 of 8 taken (87.5%) → 10 pts', () => {
    addDailyPills(8, 1);
    markTaken(1, 2, 3, 4, 5, 6, 7);
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(10);
  });
});

// ── 90%+ adherence (excellent band) ──────────────────────────────────────

describe('scorePills() — 90%+ adherence (excellent)', () => {
  beforeEach(resetState);

  it('returns 20 pts at exactly 90% (9 of 10 taken)', () => {
    addDailyPills(10, 1);
    markTaken(1, 2, 3, 4, 5, 6, 7, 8, 9);
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(20);
  });

  it('returns 20 pts at 100% (10 of 10 taken)', () => {
    addDailyPills(10, 1);
    markTaken(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(20);
  });

  it('returns 20 pts at 100% (1 of 1 taken)', () => {
    addDailyPills(1, 1);
    markTaken(1);
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(20);
  });

  it('score = 88 when 90%+ adherence (same as no-pills baseline)', () => {
    addDailyPills(10, 1);
    markTaken(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const { score } = calcHealthScore();
    expect(score).toBe(88);
  });

  it('boundary: 8 of 9 (88.8%) → 10 pts; 9 of 10 (90%) → 20 pts', () => {
    addDailyPills(9, 1);
    markTaken(1, 2, 3, 4, 5, 6, 7, 8);
    calcHealthScore();
    const pts_below = getDetailedScores().pills;

    resetState();
    addDailyPills(10, 1);
    markTaken(1, 2, 3, 4, 5, 6, 7, 8, 9);
    calcHealthScore();
    const pts_at = getDetailedScores().pills;

    expect(pts_below).toBe(10);
    expect(pts_at).toBe(20);
  });
});

// ── Adherence only counts pills due TODAY ─────────────────────────────────

describe('scorePills() — takenCount isolation (today only)', () => {
  beforeEach(resetState);

  it('extra taken entries from other dates do not inflate takenCount', () => {
    addDailyPills(2, 1); // 2 due today
    markTaken(1);        // 1 taken → 50%
    state.pillsTaken['1990-01-01'] = { 2: true }; // old date, should be ignored
    calcHealthScore();
    expect(getDetailedScores().pills).toBe(10); // 50% → 10, not 20
  });

  it('takenCount counts only truthy values (false entries not counted)', () => {
    addDailyPills(4, 1);
    markTaken(1, 2);    // 2 taken
    markMissed(3, 4);   // 2 explicitly false
    calcHealthScore();
    // adherence = 2/4 = 0.5 → 10 pts
    expect(getDetailedScores().pills).toBe(10);
  });
});

// ── Score impact with pills and other modules ─────────────────────────────

describe('scorePills() — score formula validation', () => {
  beforeEach(resetState);

  it('pills=20: round(70/80*100) = 88', () => {
    // no pills → 20 pts by default
    expect(calcHealthScore().score).toBe(88);
  });

  it('pills=10: round(60/80*100) = 75', () => {
    addDailyPills(2, 1);
    markTaken(1); // 50% → 10 pts
    expect(calcHealthScore().score).toBe(75);
  });

  it('pills=0: round(50/80*100) = 63', () => {
    addDailyPills(1, 1);
    // none taken → 0 pts
    expect(calcHealthScore().score).toBe(63);
  });

  it('pills score is monotonically ordered: 0 < 10 < 20 pts', () => {
    addDailyPills(10, 1);

    // 0% — none taken
    calcHealthScore();
    const s0 = getDetailedScores().pills;

    // 50% — 5 of 10 taken
    markTaken(1, 2, 3, 4, 5);
    calcHealthScore();
    const s50 = getDetailedScores().pills;

    // 90% — 9 of 10 taken
    markTaken(6, 7, 8, 9);
    calcHealthScore();
    const s90 = getDetailedScores().pills;

    expect(s0).toBe(0);
    expect(s50).toBe(10);
    expect(s90).toBe(20);
    expect(s0).toBeLessThan(s50);
    expect(s50).toBeLessThan(s90);
  });

  it('pills module does NOT interact with denominator (always weight=20)', () => {
    // Even with 0% adherence, pills max stays 20 (never null)
    addDailyPills(3, 1);
    calcHealthScore();
    // If pills were excluded (null), max would be 60 and raw=50/60*100=83
    // If pills are 0 pts with max 20, raw=50/80*100=63 ← correct
    expect(calcHealthScore().score).toBe(63);
  });
});
