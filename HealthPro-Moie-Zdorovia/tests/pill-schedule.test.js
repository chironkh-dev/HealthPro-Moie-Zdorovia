import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isPillDueToday } from '../src/features/meds/index.js';

// Helper: pin system time to a known UTC date.
// We use noon UTC so that local-day calculations are stable across timezones
// (CI runs on UTC, Replit container is UTC).
//   2026-04-27 (Mon)   2026-04-28 (Tue)   2026-04-29 (Wed)   2026-04-30 (Thu)
function setToday(isoDate) {
  vi.setSystemTime(new Date(`${isoDate}T12:00:00Z`));
}

describe('isPillDueToday — pill scheduling logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── 1. Daily ──────────────────────────────────────────
  it('returns true for days="daily" on any day of the week', () => {
    setToday('2026-04-29'); // Wed
    expect(isPillDueToday({ days: 'daily' })).toBe(true);
    setToday('2026-05-03'); // Sun
    expect(isPillDueToday({ days: 'daily' })).toBe(true);
    setToday('2026-05-02'); // Sat
    expect(isPillDueToday({ days: 'daily' })).toBe(true);
  });

  // ─── 2-4. Specific date ────────────────────────────────
  it('returns true when days="date" and date === today', () => {
    setToday('2026-04-25');
    expect(isPillDueToday({ days: 'date', date: '2026-04-25' })).toBe(true);
  });

  it('returns false when days="date" and date is yesterday', () => {
    setToday('2026-04-25');
    expect(isPillDueToday({ days: 'date', date: '2026-04-24' })).toBe(false);
  });

  it('returns false when days="date" and date is tomorrow', () => {
    setToday('2026-04-25');
    expect(isPillDueToday({ days: 'date', date: '2026-04-26' })).toBe(false);
  });

  // ─── 5-6. Single weekday ───────────────────────────────
  it('returns true when days="mon" and today is Monday', () => {
    setToday('2026-04-27'); // Mon
    expect(isPillDueToday({ days: 'mon' })).toBe(true);
  });

  it('returns false when days="mon" and today is Tuesday', () => {
    setToday('2026-04-28'); // Tue
    expect(isPillDueToday({ days: 'mon' })).toBe(false);
  });

  // ─── 7-8. Multiple weekdays ────────────────────────────
  it('returns true when days="mon,wed" and today is Wednesday', () => {
    setToday('2026-04-29'); // Wed
    expect(isPillDueToday({ days: 'mon,wed' })).toBe(true);
  });

  it('returns false when days="mon,wed" and today is Thursday', () => {
    setToday('2026-04-30'); // Thu
    expect(isPillDueToday({ days: 'mon,wed' })).toBe(false);
  });

  // ─── 9-11. Defensive: empty / invalid / missing ────────
  it('returns false (does not crash) for empty days and null date', () => {
    setToday('2026-04-29');
    expect(() => isPillDueToday({ days: '', date: null })).not.toThrow();
    expect(isPillDueToday({ days: '', date: null })).toBe(false);
  });

  it('returns false (does not crash) for unknown days="xyz"', () => {
    setToday('2026-04-29');
    expect(() => isPillDueToday({ days: 'xyz' })).not.toThrow();
    expect(isPillDueToday({ days: 'xyz' })).toBe(false);
  });

  it('returns false (does not crash) for pill object without days field', () => {
    setToday('2026-04-29');
    expect(() => isPillDueToday({ name: 'NoDays', dose: '10mg' })).not.toThrow();
    expect(isPillDueToday({ name: 'NoDays', dose: '10mg' })).toBe(false);
  });

  // ─── Bonus: legacy "weekdays" key (Mon-Fri) ────────────
  it('returns true for legacy days="weekdays" on a weekday', () => {
    setToday('2026-04-29'); // Wed
    expect(isPillDueToday({ days: 'weekdays' })).toBe(true);
  });

  it('returns false for legacy days="weekdays" on the weekend', () => {
    setToday('2026-05-02'); // Sat
    expect(isPillDueToday({ days: 'weekdays' })).toBe(false);
  });
});
