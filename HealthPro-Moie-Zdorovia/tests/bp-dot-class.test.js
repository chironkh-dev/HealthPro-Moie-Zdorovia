// getBPDotClass та getBPStatus — ESC 2024 та AHA 2017
// Паттерн: мутуємо state.settings перед кожним кейсом (як у bp-norm.test.js)

import { describe, it, expect, beforeEach } from 'vitest';
import { state } from '../src/core/state.js';
import { getBPDotClass, getBPStatus } from '../src/features/pressure/norm.js';

function resetState() {
  state.lang = 'uk';
  state.settings = { bpStandard: 'ESC2024', normalSys: null, normalDia: null, age: 50 };
}

// ══════════════════════════════════════════════════════════════════════════════
// getBPDotClass — ESC 2024
// ══════════════════════════════════════════════════════════════════════════════

describe('getBPDotClass — ESC 2024', () => {
  beforeEach(resetState);

  it('sys 85  → d-hypo',         () => expect(getBPDotClass(85)).toBe('d-hypo'));
  it('sys 90  → d-ok',           () => expect(getBPDotClass(90)).toBe('d-ok'));
  it('sys 120 → d-ok',           () => expect(getBPDotClass(120)).toBe('d-ok'));
  it('sys 129 → d-ok',           () => expect(getBPDotClass(129)).toBe('d-ok'));
  it('sys 130 → d-warn',         () => expect(getBPDotClass(130)).toBe('d-warn'));
  it('sys 139 → d-warn',         () => expect(getBPDotClass(139)).toBe('d-warn'));
  // Ключовий баг: sys 140-159 — d-grade1, НЕ d-warn
  it('sys 140 → d-grade1 (ESC Grade 1, виправлений баг)', () => expect(getBPDotClass(140)).toBe('d-grade1'));
  it('sys 150 → d-grade1',       () => expect(getBPDotClass(150)).toBe('d-grade1'));
  it('sys 159 → d-grade1',       () => expect(getBPDotClass(159)).toBe('d-grade1'));
  it('sys 160 → d-bad',          () => expect(getBPDotClass(160)).toBe('d-bad'));
  it('sys 179 → d-bad',          () => expect(getBPDotClass(179)).toBe('d-bad'));
  it('sys 180 → d-crit',         () => expect(getBPDotClass(180)).toBe('d-crit'));
  it('sys 220 → d-crit',         () => expect(getBPDotClass(220)).toBe('d-crit'));
});

// ══════════════════════════════════════════════════════════════════════════════
// getBPDotClass — AHA 2017
// ══════════════════════════════════════════════════════════════════════════════

describe('getBPDotClass — AHA 2017', () => {
  beforeEach(() => {
    resetState();
    state.settings.bpStandard = 'AHA2017';
  });

  it('sys 85  → d-hypo',                    () => expect(getBPDotClass(85)).toBe('d-hypo'));
  it('sys 90  → d-ok  (AHA Normal)',         () => expect(getBPDotClass(90)).toBe('d-ok'));
  it('sys 119 → d-ok  (AHA Normal)',         () => expect(getBPDotClass(119)).toBe('d-ok'));
  it('sys 120 → d-warn (AHA Elevated)',      () => expect(getBPDotClass(120)).toBe('d-warn'));
  it('sys 129 → d-warn (AHA Elevated)',      () => expect(getBPDotClass(129)).toBe('d-warn'));
  it('sys 130 → d-grade1 (AHA Stage 1)',     () => expect(getBPDotClass(130)).toBe('d-grade1'));
  it('sys 139 → d-grade1 (AHA Stage 1)',     () => expect(getBPDotClass(139)).toBe('d-grade1'));
  it('sys 140 → d-bad  (AHA Stage 2)',       () => expect(getBPDotClass(140)).toBe('d-bad'));
  it('sys 179 → d-bad  (AHA Stage 2)',       () => expect(getBPDotClass(179)).toBe('d-bad'));
  it('sys 180 → d-crit (AHA Crisis)',        () => expect(getBPDotClass(180)).toBe('d-crit'));
  it('sys 200 → d-crit (AHA Crisis)',        () => expect(getBPDotClass(200)).toBe('d-crit'));
});

// ══════════════════════════════════════════════════════════════════════════════
// ESC vs AHA граничні відмінності
// ══════════════════════════════════════════════════════════════════════════════

describe('getBPDotClass — ESC vs AHA граничні значення', () => {
  beforeEach(resetState);

  it('sys 120: ESC→d-ok,     AHA→d-warn', () => {
    state.settings.bpStandard = 'ESC2024';
    expect(getBPDotClass(120)).toBe('d-ok');
    state.settings.bpStandard = 'AHA2017';
    expect(getBPDotClass(120)).toBe('d-warn');
  });

  it('sys 130: ESC→d-warn,   AHA→d-grade1', () => {
    state.settings.bpStandard = 'ESC2024';
    expect(getBPDotClass(130)).toBe('d-warn');
    state.settings.bpStandard = 'AHA2017';
    expect(getBPDotClass(130)).toBe('d-grade1');
  });

  it('sys 140: ESC→d-grade1, AHA→d-bad', () => {
    state.settings.bpStandard = 'ESC2024';
    expect(getBPDotClass(140)).toBe('d-grade1');
    state.settings.bpStandard = 'AHA2017';
    expect(getBPDotClass(140)).toBe('d-bad');
  });

  it('sys 160: ESC→d-bad,    AHA→d-bad', () => {
    state.settings.bpStandard = 'ESC2024';
    expect(getBPDotClass(160)).toBe('d-bad');
    state.settings.bpStandard = 'AHA2017';
    expect(getBPDotClass(160)).toBe('d-bad');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getBPStatus — ESC 2024
// ══════════════════════════════════════════════════════════════════════════════

describe('getBPStatus — ESC 2024', () => {
  beforeEach(resetState);

  it('sys 75  dia 45 → badge-warn (дуже низький)', () => {
    const r = getBPStatus(75, 45);
    expect(r.cls).toBe('badge-warn');
    expect(r.label).toMatch(/very.low|very_low|дуже|n-bp-very-low/i);
  });

  it('sys 88  dia 56 → badge-warn (низький)', () => {
    const r = getBPStatus(88, 56);
    expect(r.cls).toBe('badge-warn');
  });

  it('sys 120 dia 80 → badge-ok (норма)', () => {
    const r = getBPStatus(120, 80);
    expect(r.cls).toBe('badge-ok');
  });

  it('sys 185 dia 115 → badge-crit (криз)', () => {
    const r = getBPStatus(185, 115);
    expect(r.cls).toBe('badge-crit');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getBPStatus — AHA 2017
// ══════════════════════════════════════════════════════════════════════════════

describe('getBPStatus — AHA 2017', () => {
  beforeEach(() => {
    resetState();
    state.settings.bpStandard = 'AHA2017';
  });

  it('sys 115 dia 75 → badge-ok (AHA Normal)', () => {
    const r = getBPStatus(115, 75);
    expect(r.cls).toBe('badge-ok');
  });

  it('sys 125 dia 75 → badge-warn, AHA Elevated (мітка містить AHA)', () => {
    const r = getBPStatus(125, 75);
    expect(r.cls).toBe('badge-warn');
    expect(r.label).toContain('AHA');
  });

  it('sys 135 dia 85 → badge-warn, AHA Stage 1 (мітка містить AHA)', () => {
    const r = getBPStatus(135, 85);
    expect(r.cls).toBe('badge-warn');
    expect(r.label).toContain('AHA');
  });

  it('sys 155 dia 95 → badge-bad, AHA Stage 2 (мітка містить AHA)', () => {
    const r = getBPStatus(155, 95);
    expect(r.cls).toBe('badge-bad');
    expect(r.label).toContain('AHA');
  });

  it('sys 185 dia 115 → badge-crit (AHA Crisis, sys>=180)', () => {
    const r = getBPStatus(185, 115);
    expect(r.cls).toBe('badge-crit');
  });

  it('sys 170 dia 125 → badge-crit (AHA Crisis, dia>=120)', () => {
    const r = getBPStatus(170, 125);
    expect(r.cls).toBe('badge-crit');
  });
});
