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

describe('getBMICategory()', () => {
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
