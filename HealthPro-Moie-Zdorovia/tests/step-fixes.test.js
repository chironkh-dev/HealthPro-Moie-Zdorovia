// Tests verifying pedometer fixes:
//
//  Fix 1 — _inPeak reset on enableSteps()
//           Ensures peak-detection starts clean on every new session.
//  Fix 2 — Gravity filter (_gx/_gy/_gz) reset on enableSteps()
//           Prevents stale gravity estimate after a pause.
//  Fix 3 — _motionDetected / no-sensor toast after 3 s with no events
//           Shows st-no-sensor when DeviceMotion never fires.
//  Fix 4 — step counting still correct with MIN_PEAK_SAMPLES=2 filter
//           Two consecutive rise events required to declare a peak
//           (rejects brief tap/vibration spikes < ~40 ms).
//
// NOTE: As of the tap-filter refactor STEP_MIN_PEAK_SAMPLES=2, so all
//       step-count tests must fire the rise event TWICE before the fall.

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
  getServiceStatus:           vi.fn().mockResolvedValue({ steps: 0, running: true, sensorAvailable: true }),
  getServiceStepCount:        vi.fn().mockResolvedValue(0),
  addStepUpdateListener:      vi.fn().mockReturnValue(() => {}),
  getBatteryOptStatus:        vi.fn().mockResolvedValue(true),
  requestBatteryOptExemption: vi.fn().mockResolvedValue(undefined),
  openAppSettings:            vi.fn(),
  onResume:                   vi.fn().mockReturnValue(() => {}),
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

function makeLinearEvent(x, y, z) {
  return { acceleration: { x, y, z }, accelerationIncludingGravity: null };
}

function makeGravityEvent(x, y, z) {
  return { acceleration: null, accelerationIncludingGravity: { x, y, z } };
}

let capturedMotionHandler = null;

function fireMotion(event) {
  if (capturedMotionHandler) capturedMotionHandler(event);
}

/**
 * Fire `n` consecutive rise events (linear acceleration path).
 * With STEP_MIN_PEAK_SAMPLES=2 the default n=2 sets _inPeak=true.
 */
function fireRise(x, y, z, n = 2) {
  for (let i = 0; i < n; i++) fireMotion(makeLinearEvent(x, y, z));
}

/**
 * Fire `n` consecutive rise events (gravity-fallback path).
 */
function fireGravityRise(x, y, z, n = 2) {
  for (let i = 0; i < n; i++) fireMotion(makeGravityEvent(x, y, z));
}

// ── Setup / teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();

  vi.useFakeTimers({ now: new Date('2030-01-01T00:00:00.000Z').getTime() });

  setupDOMStubs();
  resetState();
  capturedMotionHandler = null;

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
// Fix 1 — _inPeak and _peakSamples reset on enableSteps()
// ═══════════════════════════════════════════════════════════════════════════════

describe('Fix 1 — _inPeak/_peakSamples reset on enableSteps()', () => {

  it('step counted correctly after a full rise→fall cycle on fresh session', async () => {
    await enableSteps('active-only');

    // Need 2 consecutive rise events (MIN_PEAK_SAMPLES=2) to declare a peak.
    fireRise(4, 0, 0);             // 2 events above threshold → _inPeak = true
    vi.advanceTimersByTime(300);   // past MIN_INTERVAL_MS (250 ms)
    fireMotion(makeLinearEvent(0.1, 0, 0)); // fall → step #1

    expect(DB.set).toHaveBeenCalledWith('stepCount-2026-05-04', 1);
  });

  it('_peakSamples resets to 0 on re-enable (stale count does not bleed)', async () => {
    // Session 1: fire ONE rise event (peakSamples=1 but inPeak=false), then disable.
    await enableSteps('active-only');
    fireMotion(makeLinearEvent(4, 0, 0)); // peakSamples=1, inPeak=false
    disableSteps();

    // Session 2: re-enable. peakSamples must be 0 so the first event alone
    // cannot trigger a peak (we still need a full 2-event rise).
    vi.clearAllMocks();
    DB.get.mockReturnValue(0);
    await enableSteps('active-only');

    // Only ONE rise event → peakSamples=1, inPeak=false.
    // Falling edge only — must NOT count a step.
    fireMotion(makeLinearEvent(4, 0, 0));  // peakSamples=1
    vi.advanceTimersByTime(300);
    fireMotion(makeLinearEvent(0.1, 0, 0)); // below threshold → peakSamples reset to 0, no step

    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls).toHaveLength(0);
  });

  it('does not double-count if re-enabled while _inPeak was true', async () => {
    // Session 1: get _inPeak=true (2 rise events), then disable mid-peak.
    await enableSteps('active-only');
    fireRise(4, 0, 0); // 2 events → _inPeak = true
    disableSteps();

    // Session 2: _inPeak must be reset to false by disableSteps().
    DB.get.mockReturnValue(0);
    vi.clearAllMocks();
    await enableSteps('active-only');

    // Falling edge only (no rise cycle). With inPeak=false, no step counted.
    vi.advanceTimersByTime(300);
    fireMotion(makeLinearEvent(0.1, 0, 0));

    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fix 2 — Gravity filter (_gx/_gy/_gz) reset on enableSteps()
// ═══════════════════════════════════════════════════════════════════════════════

describe('Fix 2 — gravity filter (_gx/_gy/_gz) reset on enableSteps()', () => {

  it('step cycle completes correctly from zero gravity state on new session', async () => {
    await enableSteps('active-only');

    // Path 2 (gravity fallback). With gx=0:
    //  Event 1: gx=0.8*0+0.2*5=1.0; lx=5-1.0=4.0 > 3.0 → peakSamples=1
    //  Event 2: gx=0.8*1.0+0.2*5=1.8+0.2*5=1.8+1=... wait:
    //           gx=0.8*1.0+0.2*5 = 0.8+1.0 = 1.8; lx=5-1.8=3.2 > 3.0 → peakSamples=2 → inPeak=true
    fireGravityRise(5, 0, 0);
    vi.advanceTimersByTime(300);
    fireMotion(makeGravityEvent(0.1, 0, 0)); // fall → step

    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls.length).toBeGreaterThan(0);
  });

  it('gravity filter starts from 0 on second session (not carried over)', async () => {
    // Session 1: drive gx high
    await enableSteps('active-only');
    for (let i = 0; i < 10; i++) {
      fireMotion(makeGravityEvent(20, 0, 0));
    }
    disableSteps();

    // Session 2: gx must be 0 again → peak can form with ag.x=5
    DB.get.mockReturnValue(0);
    vi.clearAllMocks();
    await enableSteps('active-only');

    fireGravityRise(5, 0, 0);
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
    vi.advanceTimersByTime(3000);
    expect(showToast).toHaveBeenCalledWith('st-no-sensor');
  });

  it('does NOT show st-no-sensor toast when a devicemotion event arrives before 3 s', async () => {
    await enableSteps('active-only');
    vi.advanceTimersByTime(1000);
    fireMotion(makeLinearEvent(4, 0, 0));
    vi.advanceTimersByTime(2500);

    const noSensorCalls = showToast.mock.calls.filter(([k]) => k === 'st-no-sensor');
    expect(noSensorCalls).toHaveLength(0);
  });

  it('does NOT show st-no-sensor toast after steps are disabled before 3 s', async () => {
    await enableSteps('active-only');
    vi.advanceTimersByTime(1000);
    disableSteps();
    vi.advanceTimersByTime(2500);

    const noSensorCalls = showToast.mock.calls.filter(([k]) => k === 'st-no-sensor');
    expect(noSensorCalls).toHaveLength(0);
  });

  it('resets detection flag on disable so next enable can show toast again if needed', async () => {
    await enableSteps('active-only');
    fireMotion(makeLinearEvent(4, 0, 0));
    vi.advanceTimersByTime(3000);
    disableSteps();

    DB.get.mockReturnValue(0);
    vi.clearAllMocks();
    await enableSteps('active-only');

    vi.advanceTimersByTime(3000);
    expect(showToast).toHaveBeenCalledWith('st-no-sensor');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fix 4 — step counting with MIN_PEAK_SAMPLES=2 tap filter
// ═══════════════════════════════════════════════════════════════════════════════

describe('Fix 4 — step counting with MIN_PEAK_SAMPLES=2 tap filter', () => {

  it('counts one step per rise→fall cycle (linear path, 2 rise events)', async () => {
    await enableSteps('active-only');

    // Cycle 1
    fireRise(4, 0, 0);              // 2 events → _inPeak = true
    vi.advanceTimersByTime(300);
    fireMotion(makeLinearEvent(0.1, 0, 0)); // fall → step #1

    vi.advanceTimersByTime(300);

    // Cycle 2
    fireRise(4, 0, 0);
    vi.advanceTimersByTime(300);
    fireMotion(makeLinearEvent(0.1, 0, 0)); // fall → step #2

    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls).toHaveLength(2);
    expect(stepCalls[stepCalls.length - 1][1]).toBe(2);
  });

  it('single rise event does NOT declare a peak (tap filter active)', async () => {
    await enableSteps('active-only');

    // Only 1 rise event (not enough for MIN_PEAK_SAMPLES=2)
    fireMotion(makeLinearEvent(4, 0, 0)); // peakSamples=1, inPeak=false
    vi.advanceTimersByTime(300);
    fireMotion(makeLinearEvent(0.1, 0, 0)); // below threshold → reset, no step

    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls).toHaveLength(0);
  });

  it('debounce prevents a second step within MIN_INTERVAL_MS (250 ms)', async () => {
    await enableSteps('active-only');

    // Step #1: full cycle → T+300 ms (lastStepTs = T+300)
    fireRise(4, 0, 0);
    vi.advanceTimersByTime(300);
    fireMotion(makeLinearEvent(0.1, 0, 0)); // step #1

    // Next cycle: only 100 ms since step #1 → debounced
    fireRise(4, 0, 0);
    vi.advanceTimersByTime(100);            // T+400, only 100 ms since step #1
    fireMotion(makeLinearEvent(0.1, 0, 0)); // debounced (100 < 250 ms)

    // Advance past debounce, then another full cycle
    vi.advanceTimersByTime(200);            // T+600, 300 ms since step #1
    fireRise(4, 0, 0);
    vi.advanceTimersByTime(300);            // T+900
    fireMotion(makeLinearEvent(0.1, 0, 0)); // step #2

    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls).toHaveLength(2);
    expect(stepCalls[stepCalls.length - 1][1]).toBe(2);
  });

  it('counts steps via gravity-fallback path (Path 2), 2 rise events', async () => {
    await enableSteps('active-only');

    // 2× ag.x=10 events to build peak:
    //  Event 1: gx=0.8*0+0.2*10=2.0; lx=10-2=8.0 > 3.0 → peakSamples=1
    //  Event 2: gx=0.8*2+0.2*10=1.6+2=3.6; lx=10-3.6=6.4 > 3.0 → peakSamples=2 → inPeak=true
    fireGravityRise(10, 0, 0);
    vi.advanceTimersByTime(300);
    // ag.x=0: gx=0.8*3.6+0.2*0=2.88; lx=0-2.88=-2.88 → mag=2.88 < 3.0 → fall
    fireMotion(makeGravityEvent(0, 0, 0));

    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls).toHaveLength(1);
  });

  it('_peakSamples resets to 0 when signal dips below threshold between rise events', async () => {
    await enableSteps('active-only');

    // Interrupted rise: high → low → high → low (never 2 consecutive highs)
    fireMotion(makeLinearEvent(4, 0, 0));   // peakSamples=1
    fireMotion(makeLinearEvent(0.1, 0, 0)); // below threshold → peakSamples=0
    vi.advanceTimersByTime(300);
    fireMotion(makeLinearEvent(4, 0, 0));   // peakSamples=1
    fireMotion(makeLinearEvent(0.1, 0, 0)); // below threshold → peakSamples=0, no step

    const stepCalls = DB.set.mock.calls.filter(([k]) => k.startsWith('stepCount-'));
    expect(stepCalls).toHaveLength(0);
  });
});
