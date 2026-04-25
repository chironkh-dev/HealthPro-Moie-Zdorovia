// getBPNorm — depends on state.lang and state.settings.{normalSys,normalDia,age}.
// We mutate the shared state object before each case (state is exported as
// `const`, but its properties are writable).

import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../src/core/state.js';
import { getBPNorm } from '../src/features/pressure/norm.js';

function resetState() {
  state.lang = 'uk';
  state.settings = {};
}

describe('getBPNorm()', () => {
  beforeEach(resetState);

  it('returns 18-59 normative range when no personal norm and age inside band', () => {
    state.settings.age = 35;
    const n = getBPNorm();
    expect(n.sysOk).toBe(120);
    expect(n.diaOk).toBe(80);
    expect(n.sysWarn).toBe(130);
    expect(n.diaWarn).toBe(80);
    expect(n.note).toMatch(/18.+59/);
    expect(n.personal).toBeUndefined();
  });

  it('returns child band for age < 18', () => {
    state.settings.age = 12;
    const n = getBPNorm();
    expect(n.sysOk).toBe(110);
    expect(n.diaOk).toBe(70);
    expect(n.note).toMatch(/17/);
  });

  it('returns 60-79 band for age 70', () => {
    state.settings.age = 70;
    const n = getBPNorm();
    expect(n.sysOk).toBe(130);
    expect(n.diaOk).toBe(85);
  });

  it('returns 80+ band for age >= 80', () => {
    state.settings.age = 84;
    const n = getBPNorm();
    expect(n.sysOk).toBe(140);
    expect(n.diaOk).toBe(90);
  });

  it('uses personal norm when both normalSys and normalDia are set', () => {
    state.settings.normalSys = '115';
    state.settings.normalDia = '75';
    state.settings.age = 50;
    const n = getBPNorm();
    expect(n.personal).toBe(true);
    expect(n.sysOk).toBe(120);
    expect(n.diaOk).toBe(80);
    expect(n.sysWarn).toBe(130);
    expect(n.diaWarn).toBe(85);
    expect(n.note).toMatch(/115\/75/);
  });

  it('falls back to age band when only one personal value provided', () => {
    state.settings.normalSys = '115';
    state.settings.age = 35;
    const n = getBPNorm();
    expect(n.personal).toBeUndefined();
    expect(n.sysOk).toBe(120);
  });

  it('uses default age 50 when age is missing', () => {
    const n = getBPNorm();
    expect(n.sysOk).toBe(120);
    expect(n.diaOk).toBe(80);
  });

  it('returns Russian-language note when state.lang === "ru"', () => {
    state.lang = 'ru';
    state.settings.age = 35;
    const n = getBPNorm();
    expect(n.note).toMatch(/нормы/);
  });
});
