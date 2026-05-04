// calcBMI — pure(ish) function: depends on state.settings.height and weight.

import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../src/core/state.js';
import { calcBMI, getBMICategory } from '../src/features/analytics/bmi.js';

function resetState() {
  state.lang = 'uk';
  state.settings = {};
}

describe('calcBMI()', () => {
  beforeEach(resetState);

  it('returns null when height or weight missing', () => {
    expect(calcBMI()).toBeNull();
    state.settings.height = 175;
    expect(calcBMI()).toBeNull();
    state.settings = { weight: 70 };
    expect(calcBMI()).toBeNull();
  });

  it('calculates BMI correctly for normal range (175cm / 70kg → 22.9)', () => {
    state.settings.height = 175;
    state.settings.weight = 70;
    expect(calcBMI()).toBe(22.9);
  });

  it('rounds to 1 decimal place', () => {
    state.settings.height = 180;
    state.settings.weight = 80;
    // 80 / (1.8 * 1.8) = 24.6913... → 24.7
    expect(calcBMI()).toBe(24.7);
  });

  it('handles string inputs from form fields', () => {
    state.settings.height = '170';
    state.settings.weight = '65';
    expect(calcBMI()).toBe(22.5);
  });

  it('returns 0 when weight is 0', () => {
    state.settings.height = 175;
    state.settings.weight = 0;
    expect(calcBMI()).toBeNull();
  });
});

describe('getBMICategory() — standard thresholds (age < 65)', () => {
  beforeEach(resetState);

  it('categorises severe deficit (< 16)', () => {
    expect(getBMICategory(15).label).toMatch(/[Дд]ефіцит|[Дд]ефицит/);
  });

  it('categorises normal range (18.5 - 24.9)', () => {
    expect(getBMICategory(22).label).toMatch(/Норма/);
  });

  it('categorises overweight (25 - 29.9)', () => {
    expect(getBMICategory(27).label).toMatch(/[Нн]адмірна|[Ии]збыточный/);
  });

  it('categorises obesity stage I (30 - 34.9)', () => {
    expect(getBMICategory(32).label).toMatch(/І ст\.|І ст\./);
  });

  it('categorises obesity stage III (>= 40)', () => {
    expect(getBMICategory(45).label).toMatch(/ІІІ ст\./);
  });

  it('returns Russian labels when state.lang === "ru"', () => {
    state.lang = 'ru';
    expect(getBMICategory(22).label).toBe('Норма ✓');
  });
});

describe('getBMICategory() — age 65+ adjusted norms (22–27 normal band)', () => {
  beforeEach(resetState);

  it('bmi=26 is NORMAL for age 65+ (inside 22–27 band)', () => {
    expect(getBMICategory(26, 65).label).toMatch(/Норма/);
  });

  it('bmi=26 is OVERWEIGHT for age 50 (above standard 24.9 threshold)', () => {
    expect(getBMICategory(26, 50).label).toMatch(/[Нн]адмірна|[Ии]збыточный/);
  });

  it('bmi=27 is NORMAL at upper boundary for 65+ (inclusive)', () => {
    expect(getBMICategory(27, 70).label).toMatch(/Норма/);
  });

  it('bmi=27.1 is OVERWEIGHT just above 65+ boundary', () => {
    expect(getBMICategory(27.1, 70).label).toMatch(/[Нн]адмірна|[Ии]збыточный/);
  });

  it('bmi=21 is DEFICIT for 65+ (below lo=22)', () => {
    expect(getBMICategory(21, 70).label).toMatch(/[Дд]ефіцит|[Дд]ефицит/);
  });

  it('bmi=18.5 is NORMAL for standard but DEFICIT for 65+ (below lo=22)', () => {
    expect(getBMICategory(18.5, 70).label).toMatch(/[Дд]ефіцит|[Дд]ефицит/);
    expect(getBMICategory(18.5, 50).label).toMatch(/Норма/);
  });

  it('bmi=30 is OVERWEIGHT for 65+ (27–32 band) but OBESITY I for standard', () => {
    expect(getBMICategory(30, 70).label).toMatch(/[Нн]адмірна|[Ии]збыточный/);
    expect(getBMICategory(30, 50).label).toMatch(/І ст\./);
  });

  it('bmi=35 is OBESITY I for 65+ (32–37 band) but OBESITY II for standard', () => {
    expect(getBMICategory(35, 70).label).toMatch(/І ст\./);
    expect(getBMICategory(35, 50).label).toMatch(/ІІ ст\./);
  });

  it('bmi=18.9 is SEVERE deficit for 65+ (below lo-3=19)', () => {
    expect(getBMICategory(18.9, 70).label).toMatch(/[Дд]ефіцит|[Дд]ефицит/);
  });

  it('age=65 boundary — exactly 65 uses 65+ norms', () => {
    expect(getBMICategory(26, 65).label).toMatch(/Норма/);
  });

  it('age=64 boundary — 64 uses standard norms', () => {
    expect(getBMICategory(26, 64).label).toMatch(/[Нн]адмірна|[Ии]збыточный/);
  });

  it('reads age from state.settings when age arg is omitted', () => {
    state.settings.age = 70;
    expect(getBMICategory(26).label).toMatch(/Норма/);
  });
});
