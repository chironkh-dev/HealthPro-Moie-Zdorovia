// Tests verifying the four pedometer fixes:
//
//  Fix 1 — _inPeak reset on enableSteps()
//           Ensures peak-detection starts clean on every new session.
//  Fix 2 — Gravity filter (_gx/_gy/_gz) reset on enableSteps()
//           Prevents stale gravity estimate after a pause.
//  Fix 3 — _motionDetected / no-sensor toast after 3 s with no events
//           Shows st-no-sensor when DeviceMotion never fires.
//  Fix 4 — _lastMag removed (dead variable)
//           Verified by confirming step counting still works correctly.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { state } from '../src/core/state.js';

// ── Mock platform.js ─────────────────────────────────────────────────────────
vi.mock('../src/core/platform.js', () => ({
  isNative:                  vi.fn().mockReturnValue(false),
  getPlatform:               vi.fn().mockReturnValue('web'),
  requestActivityPermission: vi.fn().mockResolvedValue('granted'),
  checkActivityPermission:   vi.fn().mockResolvedValue('granted'),
  startStepService:          vi.fn().mockResolvedValue(true),
  stopStepService:           vi.fn().mockResolvedValue(true),
  getServiceStepCount:       vi.fn().mockResolvedValue(0),
  addStepUpdateListener:     vi.fn().mockReturnValue(() => {}),
}));

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

import { showToast, DB } from '../src/core/state.js';

// ── Mock i18n ────────────────────────────────────────────────────────────────
vi.mock('../src/i18n/index.js', () => ({
  t: vi.fn((k) => k),
}));

// ── DOM stubs ────────────────────────────────────────────────────────────────
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

import { enableSteps, disableSteps } from '../src/features/steps/index.js';

// ── Helpers to fire synthetic DeviceMotion events ────────────────────────────

// Builds a minimal DeviceMotionEvent-like object with linear acceleration.
function makeLinearEvent(x, y, z) {
  return { acceleration: { x, y, z }, accelerationIncludingGravity: null };
}

// Builds an event that only carries accelerationIncludingGravity (Path 2 fallback).
function makeGravityEvent(x, y, z) {
  return { acceleration: null, accelerationIncludingGravity: { x, y, z } };
}

// Fires the handler that was last registered via window.addEventListener('devicemotion', ...).
// We capture it by wrapping window.addEventListener in setup.
let capturedMotionHandler = null;

function fireMotion(event) {
  if (capturedMotionHandler) capturedMotionHandler(event);
}

// ── Setup / teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();

  // Use a fixed system time far in the future so Date.now() is always much
  // greater than any lastStepTs left by a previous test (which runs in the
  // same module instance). This prevents debounce from blocking the first step.
  vi.useFakeTimers({ now: new Date('2030-01-01T00:00:00.000Z').getTime() });

  setupDOMStubs();
  resetState();
  capturedMotionHandler = null;

  // In the Node test environment `window` is a plain stub (from setup.js)
  // without addEventListener/removeEventListener. Assign vi.fn() directly
  // so the step module can call window.addEventListener('devicemotion', …)
  // and we can intercept the registered handler.
  global.window.addEventListener = vi.fn((type, handler) => {
    if (type === 'devicemotion') capturedMotionHandler = handler;
  });
  global.window.removeEventListener = vi.fn();
});

afterEach(() => {
  delete global.window.addEventListener;
  delete global.window.removeEventListener;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fix 1 — _inPeak reset on enableSteps()
// ═══════════════════════════════════════════════════════════════════════════════

describe('Fix 1 — _inPeak reset on enableSteps()', () => {

  it('step is counted when motion rises above then falls below threshold after re-enable', async () => {
    // Session 1: start a peak but never finish it (disable mid-peak)
    await enableSteps('active-only');
    fireMotion(makeLinearEvent(3, 0, 0));  // rise → _inPeak = true

    disableSteps();

    // Session 2: re-enable — _inPeak must be false so the peak cycle works correctly
    vi.clearAllMocks();
    DB.get.mockReturnValue(0);
    await enableSteps('active-only');

    // Rising edge: magnitude = 3 > 2.0 threshold
    fireMotion(makeLinearEvent(3, 0, 0));
    // Falling edge: magnitude = 0.1 < 2.0 threshold → must count one step
    vi.advanceTimersByTime(300);  // past MIN_INTERVAL_MS (250 ms)
    fireMotion(makeLinearEvent(0.1, 0, 0));

    expect(DB.set).toHaveBeenCalledWith('stepCount-2026-05-04', 1);
  });

  it('does not double-count a step if re-enabled while inPeak was true', async () => {
    await enableSteps('active-only');
    fireMotion(makeLinearEvent(3, 0, 0));  // _inPeak → true
    disableSteps();

    DB.get.mockReturnValue(0);
    await enableSteps('active-only');

    // Without the fix the first falling-edge event would immediately count
    // a step (because stale _inPeak=true). With the fix _inPeak=false so we
    // need a full rise→fall cycle.
    // Falling edge only — must NOT count a step.
    vi.advanceTimersByTime(300);
    fireMotion(makeLinearEvent(0.1, 0, 0));

    // DB.set for stepCount should NOT have been called (no full peak cycle yet)
    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fix 2 — Gravity filter reset on enableSteps()
// ═══════════════════════════════════════════════════════════════════════════════

describe('Fix 2 — gravity filter (_gx/_gy/_gz) reset on enableSteps()', () => {

  it('step cycle completes correctly from zero gravity state on new session', async () => {
    await enableSteps('active-only');

    // With _gx/_gy/_gz = 0 (freshly reset) and ag = (5, 0, 0):
    //   gravity estimate ≈ 0 (first sample, α=0.8: gx = 0.8*0 + 0.2*5 = 1)
    //   linear component = 5 - 1 = 4 > 2.0 → _inPeak = true

    fireMotion(makeGravityEvent(5, 0, 0));   // rise → inPeak
    vi.advanceTimersByTime(300);
    fireMotion(makeGravityEvent(0.1, 0, 0)); // fall → step counted

    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls.length).toBeGreaterThan(0);
  });

  it('gravity filter starts from 0 on second session (not carried over)', async () => {
    // Session 1: drive gx high via gravity events
    await enableSteps('active-only');
    for (let i = 0; i < 10; i++) {
      fireMotion(makeGravityEvent(20, 0, 0)); // large x → drives gx toward 20
    }
    disableSteps();

    // Session 2: re-enable — gx must be 0 again
    DB.get.mockReturnValue(0);
    vi.clearAllMocks();
    await enableSteps('active-only');

    // With fresh gx=0 and ag.x=5: lx = 5 - (0.8*0 + 0.2*5) = 5 - 1 = 4 > 2.0 → peak
    fireMotion(makeGravityEvent(5, 0, 0));
    vi.advanceTimersByTime(300);
    fireMotion(makeGravityEvent(0.1, 0, 0));

    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fix 3 — No-sensor toast after 3 s with no DeviceMotion events
// ═══════════════════════════════════════════════════════════════════════════════

describe('Fix 3 — no-sensor warning toast', () => {

  it('shows st-no-sensor toast when no devicemotion event arrives within 3 s', async () => {
    await enableSteps('active-only');

    // Advance 3 seconds without any motion event
    vi.advanceTimersByTime(3000);

    expect(showToast).toHaveBeenCalledWith('st-no-sensor');
  });

  it('does NOT show st-no-sensor toast when a devicemotion event arrives before 3 s', async () => {
    await enableSteps('active-only');

    // Motion event arrives at 1 s
    vi.advanceTimersByTime(1000);
    fireMotion(makeLinearEvent(3, 0, 0));

    // Advance past the 3 s mark
    vi.advanceTimersByTime(2500);

    const noSensorCalls = showToast.mock.calls.filter(([k]) => k === 'st-no-sensor');
    expect(noSensorCalls).toHaveLength(0);
  });

  it('does NOT show st-no-sensor toast after steps are disabled before 3 s', async () => {
    await enableSteps('active-only');

    // Disable before timer fires
    vi.advanceTimersByTime(1000);
    disableSteps();

    // Advance past the 3 s mark — timer must have been cancelled
    vi.advanceTimersByTime(2500);

    const noSensorCalls = showToast.mock.calls.filter(([k]) => k === 'st-no-sensor');
    expect(noSensorCalls).toHaveLength(0);
  });

  it('resets detection flag on disable so next enable can show toast again if needed', async () => {
    await enableSteps('active-only');
    fireMotion(makeLinearEvent(3, 0, 0));  // sensor detected
    vi.advanceTimersByTime(3000);          // timer fires but no-toast (already detected)

    disableSteps();

    // Re-enable — detection flag must be reset
    DB.get.mockReturnValue(0);
    vi.clearAllMocks();
    await enableSteps('active-only');

    // No events for 3 s → should warn again
    vi.advanceTimersByTime(3000);
    expect(showToast).toHaveBeenCalledWith('st-no-sensor');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fix 4 — _lastMag removed (dead variable) — step counting still works
// ═══════════════════════════════════════════════════════════════════════════════

describe('Fix 4 — step counting still correct after _lastMag removal', () => {

  it('counts one step per rise→fall cycle (linear path)', async () => {
    await enableSteps('active-only');

    // Cycle 1: rise → advance past debounce → fall → step #1
    fireMotion(makeLinearEvent(3, 0, 0));   // rise → _inPeak = true
    vi.advanceTimersByTime(300);            // T+300 ms, past debounce
    fireMotion(makeLinearEvent(0.1, 0, 0)); // fall → step #1, lastStepTs = T+300

    // Advance again past debounce before cycle 2
    vi.advanceTimersByTime(300);            // T+600 ms
    // Cycle 2: rise → advance → fall → step #2
    fireMotion(makeLinearEvent(3, 0, 0));   // rise → _inPeak = true
    vi.advanceTimersByTime(300);            // T+900 ms
    fireMotion(makeLinearEvent(0.1, 0, 0)); // fall → step #2

    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls).toHaveLength(2);
    expect(stepCalls[stepCalls.length - 1][1]).toBe(2);
  });

  it('debounce prevents a second step within MIN_INTERVAL_MS (250 ms)', async () => {
    await enableSteps('active-only');

    // Step #1: full cycle, lastStepTs = T+300
    fireMotion(makeLinearEvent(3, 0, 0));   // rise
    vi.advanceTimersByTime(300);
    fireMotion(makeLinearEvent(0.1, 0, 0)); // fall → step #1

    // Immediately start next cycle (only 100 ms since last step)
    fireMotion(makeLinearEvent(3, 0, 0));   // rise
    vi.advanceTimersByTime(100);            // T+400 — only 100 ms since step #1
    fireMotion(makeLinearEvent(0.1, 0, 0)); // fall → debounced (400-300=100 < 250)

    // Now advance past the debounce window
    vi.advanceTimersByTime(200);            // T+600 — 300 ms since step #1
    fireMotion(makeLinearEvent(3, 0, 0));   // rise
    vi.advanceTimersByTime(300);            // T+900
    fireMotion(makeLinearEvent(0.1, 0, 0)); // fall → step #2 (300 ms since step #1 ≥ 250)

    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls).toHaveLength(2);     // step #1 + step #2 (debounced attempt not counted)
    expect(stepCalls[stepCalls.length - 1][1]).toBe(2);
  });

  it('counts steps via gravity-fallback path (Path 2)', async () => {
    await enableSteps('active-only');

    // Path 2: accelerationIncludingGravity only (no linear acceleration).
    // With _gx=0 (reset on enableSteps): lx = ag.x - 0.2*ag.x = 0.8*ag.x for first sample.
    // ag.x=10 → gx after 1st event = 0.8*0 + 0.2*10 = 2; lx = 10-2 = 8 > 2.0 → peak.
    fireMotion(makeGravityEvent(10, 0, 0)); // rise → _inPeak = true
    vi.advanceTimersByTime(300);            // past debounce
    // ag.x=0: gx = 0.8*2 + 0.2*0 = 1.6; lx = 0 - 1.6 = -1.6 → mag=1.6 < 2.0 → fall
    fireMotion(makeGravityEvent(0, 0, 0));  // fall → step counted

    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls).toHaveLength(1);
  });
});
