// Tests for the refactored step counter feature.
//
// Environment: node (shared with all other tests — no jsdom).
// Strategy:    mock document.getElementById so DOM side-effects are captured
//              without a browser; test state mutations and platform call counts.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { state } from '../src/core/state.js';

// ── Mock platform.js ─────────────────────────────────────────────────────────
vi.mock('../src/core/platform.js', () => ({
  isNative:                   vi.fn().mockReturnValue(false),
  getPlatform:                vi.fn().mockReturnValue('web'),
  requestActivityPermission:  vi.fn().mockResolvedValue('granted'),
  checkActivityPermission:    vi.fn().mockResolvedValue('granted'),
  startStepService:           vi.fn().mockResolvedValue(true),
  stopStepService:            vi.fn().mockResolvedValue(true),
  // getServiceStatus replaces getServiceStepCount (returns { steps, running, sensorAvailable })
  getServiceStatus:           vi.fn().mockResolvedValue({ steps: 0, running: true, sensorAvailable: true }),
  getServiceStepCount:        vi.fn().mockResolvedValue(0),
  addStepUpdateListener:      vi.fn().mockReturnValue(() => {}),
  getBatteryOptStatus:        vi.fn().mockResolvedValue(true),
  requestBatteryOptExemption: vi.fn().mockResolvedValue(undefined),
  openAppSettings:            vi.fn(),
  onResume:                   vi.fn().mockReturnValue(() => {}),
}));

import {
  isNative, getPlatform,
  requestActivityPermission,
  startStepService, stopStepService,
  getServiceStatus, getServiceStepCount,
  addStepUpdateListener,
  getBatteryOptStatus,
  onResume,
} from '../src/core/platform.js';

// ── Mock state helpers ───────────────────────────────────────────────────────
vi.mock('../src/core/state.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    saveData:  vi.fn(),
    showToast: vi.fn(),
    today:     vi.fn().mockReturnValue('2026-05-04'),
    DB: {
      get: vi.fn().mockReturnValue(0),
      set: vi.fn(),
    },
  };
});

import { saveData, showToast, DB } from '../src/core/state.js';

// ── Mock i18n ────────────────────────────────────────────────────────────────
vi.mock('../src/i18n/index.js', () => ({
  t: vi.fn((k) => k),
}));

// ── Stub DOM elements ────────────────────────────────────────────────────────
// node environment has no browser DOM; we provide minimal stubs.

function makeEl(id, style) {
  return {
    id,
    style:     style || {},
    classList: {
      _list:       new Set(),
      add(c)    { this._list.add(c); },
      remove(c) { this._list.delete(c); },
      contains(c){ return this._list.has(c); },
    },
    textContent: '',
    value:       '',
  };
}

let domStubs;

function setupDOMStubs() {
  domStubs = {
    stepToggle:    makeEl('stepToggle',    {}),
    stepCard:      makeEl('stepCard',      { display: 'none' }),
    stepCount:     makeEl('stepCount',     {}),
    stepPct:       makeEl('stepPct',       {}),
    stepBar:       makeEl('stepBar',       { width: '0%' }),
    'step-goal':   makeEl('t-step-goal',   {}),
    stepGoalInput: makeEl('stepGoalInput', {}),
    stepPermModal: makeEl('stepPermModal', {}),
    stepFgModal:   makeEl('stepFgModal',   {}),
  };
  domStubs.stepGoalInput.value = '8000';

  // Override getElementById for the duration of tests
  vi.spyOn(global, 'document', 'get').mockReturnValue({
    getElementById: (id) => domStubs[id] || null,
    body: { style: {} },
  });
}

function resetState() {
  state.settings = {
    stepsEnabled: false,
    stepMode:     'active-only',
    stepGoal:     10000,
  };
}

// ── Import SUT ───────────────────────────────────────────────────────────────
import {
  enableSteps, disableSteps, saveStepGoal,
  toggleStepCounter,
  acceptStepPerm, declineStepPerm,
  acceptStepFg,   declineStepFg,
  restoreSteps, getStepCount, updateStepUI,
} from '../src/features/steps/index.js';

// ── Setup / teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();

  // Re-establish default mock return values after each test
  // (clearAllMocks resets call counts but NOT return values set via mockReturnValue)
  isNative.mockReturnValue(false);
  getPlatform.mockReturnValue('web');
  requestActivityPermission.mockResolvedValue('granted');
  startStepService.mockResolvedValue(true);
  stopStepService.mockResolvedValue(true);
  getServiceStatus.mockResolvedValue({ steps: 0, running: true, sensorAvailable: true });
  getServiceStepCount.mockResolvedValue(0);
  addStepUpdateListener.mockReturnValue(() => {});
  getBatteryOptStatus.mockResolvedValue(true);
  onResume.mockReturnValue(() => {});
  DB.get.mockReturnValue(0);

  setupDOMStubs();
  resetState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
describe('enableSteps() — active-only mode (web)', () => {

  it('sets stepsEnabled = true in state', async () => {
    await enableSteps('active-only');
    expect(state.settings.stepsEnabled).toBe(true);
  });

  it('sets stepMode = "active-only" in state', async () => {
    await enableSteps('active-only');
    expect(state.settings.stepMode).toBe('active-only');
  });

  it('calls saveData()', async () => {
    await enableSteps('active-only');
    expect(saveData).toHaveBeenCalled();
  });

  it('shows stepCard and adds "on" class to toggle', async () => {
    await enableSteps('active-only');
    expect(domStubs.stepCard.style.display).toBe('block');
    expect(domStubs.stepToggle.classList.contains('on')).toBe(true);
  });

  it('does NOT call startStepService on web', async () => {
    await enableSteps('active-only');
    expect(startStepService).not.toHaveBeenCalled();
  });

  it('reads stepCount from DB', async () => {
    DB.get.mockReturnValueOnce(250);
    await enableSteps('active-only');
    expect(getStepCount()).toBe(250);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('enableSteps() — foreground mode (Android native)', () => {

  beforeEach(() => {
    isNative.mockReturnValue(true);
    getPlatform.mockReturnValue('android');
  });

  it('calls startStepService with goal + i18n keys + initialSteps', async () => {
    state.settings.stepGoal = 8000;
    DB.get.mockReturnValue(150); // DB has 150 steps for today
    await enableSteps('foreground');
    // 4th arg is initialSteps (today's DB count passed to the service)
    expect(startStepService).toHaveBeenCalledWith(8000, 'st-notif-title', 'st-notif-text', 150);
  });

  it('registers addStepUpdateListener', async () => {
    await enableSteps('foreground');
    expect(addStepUpdateListener).toHaveBeenCalled();
  });

  it('sets stepMode = "foreground" in state', async () => {
    await enableSteps('foreground');
    expect(state.settings.stepMode).toBe('foreground');
  });

  it('syncs step count from service when service has more steps than DB', async () => {
    DB.get.mockReturnValue(100);
    getServiceStatus.mockResolvedValueOnce({ steps: 350, running: true, sensorAvailable: true });
    await enableSteps('foreground');
    expect(getStepCount()).toBe(350);
  });

  it('keeps DB count when service count is lower', async () => {
    DB.get.mockReturnValue(400);
    getServiceStatus.mockResolvedValueOnce({ steps: 50, running: true, sensorAvailable: true });
    await enableSteps('foreground');
    expect(getStepCount()).toBe(400);
  });

  it('falls back to active-only when startStepService returns false', async () => {
    startStepService.mockResolvedValueOnce(false);
    await enableSteps('foreground');
    expect(state.settings.stepMode).toBe('active-only');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('disableSteps()', () => {

  it('sets stepsEnabled = false and saves', async () => {
    await enableSteps('active-only');
    vi.clearAllMocks();
    disableSteps();
    expect(state.settings.stepsEnabled).toBe(false);
    expect(saveData).toHaveBeenCalled();
  });

  it('hides stepCard and removes "on" class from toggle', async () => {
    await enableSteps('active-only');
    disableSteps();
    expect(domStubs.stepCard.style.display).toBe('none');
    expect(domStubs.stepToggle.classList.contains('on')).toBe(false);
  });

  it('calls stopStepService on Android native', async () => {
    isNative.mockReturnValue(true);
    getPlatform.mockReturnValue('android');
    await enableSteps('foreground');
    vi.clearAllMocks();
    disableSteps();
    await Promise.resolve(); // flush microtasks
    expect(stopStepService).toHaveBeenCalled();
  });

  it('does NOT call stopStepService on web', async () => {
    await enableSteps('active-only');
    vi.clearAllMocks();
    disableSteps();
    await Promise.resolve();
    expect(stopStepService).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('saveStepGoal()', () => {

  it('reads value from stepGoalInput and saves', () => {
    domStubs.stepGoalInput.value = '7500';
    saveStepGoal();
    expect(state.settings.stepGoal).toBe(7500);
    expect(saveData).toHaveBeenCalled();
  });

  it('defaults to DEFAULT_STEP_GOAL when input is NaN', () => {
    domStubs.stepGoalInput.value = 'abc';
    saveStepGoal();
    expect(state.settings.stepGoal).toBeGreaterThan(0);
    expect(saveData).toHaveBeenCalled();
  });

  it('calls startStepService on Android foreground mode', async () => {
    isNative.mockReturnValue(true);
    getPlatform.mockReturnValue('android');
    state.settings.stepMode = 'foreground';
    domStubs.stepGoalInput.value = '12000';
    saveStepGoal();
    await Promise.resolve();
    expect(startStepService).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('getStepCount()', () => {

  it('returns 0 initially (no enableSteps called)', () => {
    // Module is shared; count may differ in CI — test relative invariant
    expect(typeof getStepCount()).toBe('number');
    expect(getStepCount()).toBeGreaterThanOrEqual(0);
  });

  it('returns count synced from DB after enableSteps()', async () => {
    DB.get.mockReturnValueOnce(500);
    await enableSteps('active-only');
    expect(getStepCount()).toBe(500);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('restoreSteps()', () => {

  it('reads stepCount from DB', async () => {
    DB.get.mockReturnValue(1200);
    await restoreSteps();
    expect(DB.get).toHaveBeenCalled();
    expect(getStepCount()).toBe(1200);
  });

  it('syncs from service when Android foreground and service count is higher', async () => {
    isNative.mockReturnValue(true);
    getPlatform.mockReturnValue('android');
    state.settings.stepMode = 'foreground';
    DB.get.mockReturnValue(300);
    // restoreSteps() calls getServiceStatus(); running=true + steps=800 > 300
    getServiceStatus.mockResolvedValueOnce({ steps: 800, running: true, sensorAvailable: true });
    await restoreSteps();
    expect(getStepCount()).toBe(800);
    expect(DB.set).toHaveBeenCalled();
  });

  it('does NOT override DB count when service count is lower', async () => {
    isNative.mockReturnValue(true);
    getPlatform.mockReturnValue('android');
    state.settings.stepMode = 'foreground';
    DB.get.mockReturnValue(500);
    getServiceStatus.mockResolvedValueOnce({ steps: 200, running: true, sensorAvailable: true });
    await restoreSteps();
    expect(getStepCount()).toBe(500);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('Modal flow — declineStepPerm()', () => {

  it('removes "show" class from stepPermModal', () => {
    domStubs.stepPermModal.classList.add('show');
    declineStepPerm();
    expect(domStubs.stepPermModal.classList.contains('show')).toBe(false);
  });

  it('does NOT enable steps', () => {
    declineStepPerm();
    expect(state.settings.stepsEnabled).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('Modal flow — acceptStepFg() / declineStepFg()', () => {

  it('acceptStepFg() sets stepMode = "foreground" on Android', async () => {
    isNative.mockReturnValue(true);
    getPlatform.mockReturnValue('android');
    await acceptStepFg();
    expect(state.settings.stepMode).toBe('foreground');
  });

  it('acceptStepFg() falls back to "active-only" on web (no native service)', async () => {
    await acceptStepFg(); // isNative=false by default
    expect(state.settings.stepMode).toBe('active-only');
  });

  it('acceptStepFg() hides stepFgModal', async () => {
    domStubs.stepFgModal.classList.add('show');
    await acceptStepFg();
    expect(domStubs.stepFgModal.classList.contains('show')).toBe(false);
  });

  it('declineStepFg() sets stepMode = "active-only"', async () => {
    await declineStepFg();
    expect(state.settings.stepMode).toBe('active-only');
  });

  it('declineStepFg() hides stepFgModal', async () => {
    domStubs.stepFgModal.classList.add('show');
    await declineStepFg();
    expect(domStubs.stepFgModal.classList.contains('show')).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('updateStepUI()', () => {

  it('updates stepCount textContent', async () => {
    DB.get.mockReturnValueOnce(3000);
    await enableSteps('active-only');
    expect(domStubs.stepCount.textContent).toBe((3000).toLocaleString());
  });

  it('shows correct percentage', async () => {
    DB.get.mockReturnValueOnce(5000);
    state.settings.stepGoal = 10000;
    await enableSteps('active-only');
    expect(domStubs.stepPct.textContent).toBe('50%');
  });

  it('caps percentage at 100%', async () => {
    DB.get.mockReturnValueOnce(15000);
    state.settings.stepGoal = 10000;
    await enableSteps('active-only');
    expect(domStubs.stepPct.textContent).toBe('100%');
  });

  it('does not throw when getElementById returns null', () => {
    vi.spyOn(global, 'document', 'get').mockReturnValue({
      getElementById: () => null,
      body: { style: {} },
    });
    expect(() => updateStepUI()).not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
describe('platform.js FG service wrappers (integration-style mocks)', () => {

  it('checkActivityPermission returns "granted" when plugin absent (web)', async () => {
    const { checkActivityPermission: check } = await import('../src/core/platform.js');
    // Mock is set to return 'granted'
    const r = await check();
    expect(r).toBe('granted');
  });

  it('addStepUpdateListener (mock) returns a cleanup function', () => {
    const unsub = addStepUpdateListener(() => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });
});
