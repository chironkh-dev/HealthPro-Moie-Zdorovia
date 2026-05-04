// Step counter feature.
//
// Modes:
//   'foreground'   — Android Foreground Service (StepCounterService.java) with
//                    hardware TYPE_STEP_COUNTER; persists across app kills.
//   'active-only'  — browser DeviceMotion API; stops when the app is backgrounded.
//
// Flow:
//   toggleStepCounter()
//     ↓ (first enable)
//   showStepPermModal()  ← Modal A: explain step tracking
//     ↓ user taps "Так"
//   acceptStepPerm()     → requestActivityPermission() (system dialog, Android 10+)
//     ↓ granted + Android
//   showStepFgModal()    ← Modal B: explain Foreground Service / battery tradeoff
//     ↓ user decides
//   acceptStepFg()  → enableSteps('foreground')
//   declineStepFg() → enableSteps('active-only')

import { state, saveData, showToast, today, DB } from '../../core/state.js';
import {
  DEFAULT_STEP_GOAL,
  STEP_ACCEL_THRESHOLD,
  STEP_MIN_INTERVAL_MS,
  STEP_LINEAR_THRESHOLD,
  STEP_GRAVITY_FILTER_ALPHA,
} from '../../core/constants.js';
import { t } from '../../i18n/index.js';
import {
  isNative, getPlatform,
  requestActivityPermission, checkActivityPermission,
  startStepService, stopStepService,
  getServiceStepCount, addStepUpdateListener,
} from '../../core/platform.js';

const MIN_INTERVAL_MS  = STEP_MIN_INTERVAL_MS;
const LINEAR_THRESH    = STEP_LINEAR_THRESHOLD;
const GRAVITY_THRESH   = STEP_ACCEL_THRESHOLD;  // fallback with gravity
const LP_ALPHA         = STEP_GRAVITY_FILTER_ALPHA;

// ── Module-level state ──────────────────────────────────────────────────────
let stepCount     = 0;
let lastStepTs    = 0;
let stepEnabled   = false;
let fgUnsubscribe = null;   // cleanup fn for addStepUpdateListener

// DeviceMotion peak-detection state
let _inPeak  = false;       // currently inside an acceleration peak
let _gx = 0, _gy = 0, _gz = 0;  // gravity low-pass filter state

// ── Public toggle ───────────────────────────────────────────────────────────

export function toggleStepCounter() {
  if (stepEnabled) {
    disableSteps();
  } else {
    _showStepPermModal();
  }
}

// ── Modal A: step-tracking consent ─────────────────────────────────────────

function _showStepPermModal() {
  const m = document.getElementById('stepPermModal');
  if (!m) { _startPermFlow(); return; }       // no modal → go straight to perm
  m.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function _hideStepPermModal() {
  const m = document.getElementById('stepPermModal');
  if (!m) return;
  m.classList.remove('show');
  document.body.style.overflow = '';
}

/** Called by app.js dispatch: user tapped "Так, дозволити" in Modal A */
export async function acceptStepPerm() {
  _hideStepPermModal();
  await _startPermFlow();
}

/** Called by app.js dispatch: user tapped "Ні, дякую" in Modal A */
export function declineStepPerm() {
  _hideStepPermModal();
}

async function _startPermFlow() {
  const isAndroid = isNative() && getPlatform() === 'android';

  if (isAndroid) {
    const status = await requestActivityPermission();
    if (status !== 'granted') {
      showToast(t('st-perm-denied'));
      return;
    }
    // Permission granted on Android → show FG consent modal
    _showStepFgModal();
  } else {
    // Web / iOS: request DeviceMotion permission (iOS Safari) or just enable
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const p = await DeviceMotionEvent.requestPermission();
        if (p !== 'granted') { showToast(t('st-no-perm')); return; }
      } catch { showToast(t('st-no-perm')); return; }
    }
    enableSteps('active-only');
  }
}

// ── Modal B: Foreground Service consent ────────────────────────────────────

function _showStepFgModal() {
  const m = document.getElementById('stepFgModal');
  if (!m) { enableSteps('foreground'); return; }   // no modal → direct enable
  m.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function _hideStepFgModal() {
  const m = document.getElementById('stepFgModal');
  if (!m) return;
  m.classList.remove('show');
  document.body.style.overflow = '';
}

/** Called by app.js dispatch: user tapped "Запустити у фоні" in Modal B */
export function acceptStepFg() {
  _hideStepFgModal();
  enableSteps('foreground');
}

/** Called by app.js dispatch: user tapped "Тільки при відкритому" in Modal B */
export function declineStepFg() {
  _hideStepFgModal();
  enableSteps('active-only');
}

// ── Core enable / disable ──────────────────────────────────────────────────

export async function enableSteps(mode) {
  mode = mode || state.settings.stepMode || 'active-only';

  stepEnabled = true;
  state.settings.stepsEnabled = true;
  state.settings.stepMode     = mode;
  saveData();

  const toggle = document.getElementById('stepToggle');
  const card   = document.getElementById('stepCard');
  if (toggle) toggle.classList.add('on');
  if (card)   card.style.display = 'block';

  stepCount = DB.get('stepCount-' + today(), 0);

  const goal = state.settings.stepGoal || DEFAULT_STEP_GOAL;

  if (mode === 'foreground' && isNative() && getPlatform() === 'android') {
    // ── Native Foreground Service path ──
    const ok = await startStepService(goal, t('st-notif-title'), t('st-notif-text'));
    if (ok) {
      // Real-time updates from service → JS
      fgUnsubscribe = addStepUpdateListener((steps, _goal) => {
        stepCount = steps;
        DB.set('stepCount-' + today(), stepCount);
        updateStepUI();
      });
      // Sync initial count from service
      const serviceSteps = await getServiceStepCount();
      if (serviceSteps !== null && serviceSteps > stepCount) {
        stepCount = serviceSteps;
        DB.set('stepCount-' + today(), stepCount);
      }
      showToast(t('st-mode-fg'));
    } else {
      // Service failed to start → fall back to active-only
      state.settings.stepMode = 'active-only';
      saveData();
      _attachDeviceMotion();
      showToast(t('st-mode-active'));
    }
  } else {
    // ── DeviceMotion (active-only) path ──
    state.settings.stepMode = 'active-only';
    saveData();
    _attachDeviceMotion();
    showToast(t('st-mode-active'));
  }

  updateStepUI();
}

export function disableSteps() {
  stepEnabled = false;
  state.settings.stepsEnabled = false;
  saveData();

  const toggle = document.getElementById('stepToggle');
  const card   = document.getElementById('stepCard');
  if (toggle) toggle.classList.remove('on');
  if (card)   card.style.display = 'none';

  // Stop foreground service if running
  if (fgUnsubscribe) { fgUnsubscribe(); fgUnsubscribe = null; }
  if (isNative() && getPlatform() === 'android') {
    stopStepService().catch(() => {});
  }

  if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
    window.removeEventListener('devicemotion', _handleMotion);
  }
  showToast(t('st-off'));
}

// ── DeviceMotion handler ───────────────────────────────────────────────────

function _attachDeviceMotion() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  window.removeEventListener('devicemotion', _handleMotion); // avoid duplicates
  window.addEventListener('devicemotion', _handleMotion);
}

function _handleMotion(e) {
  const a = e.accelerationIncludingGravity || (e.acceleration && {
    x: (e.acceleration.x || 0),
    y: (e.acceleration.y || 0),
    z: ((e.acceleration.z || 0) + 9.81),
  });
  if (!a) return;

  const acc = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
  const now = Date.now();

  if (acc > STEP_THRESHOLD && lastAcc <= STEP_THRESHOLD &&
      (now - lastStepTs) >= MIN_INTERVAL_MS) {
    stepCount++;
    lastStepTs = now;
    DB.set('stepCount-' + today(), stepCount);
    updateStepUI();
  }
  lastAcc = acc;
}

// ── UI ─────────────────────────────────────────────────────────────────────

export function updateStepUI() {
  const stepCountEl = document.getElementById('stepCount');
  const stepPctEl   = document.getElementById('stepPct');
  const stepBarEl   = document.getElementById('stepBar');
  const stepGoalEl  = document.getElementById('t-step-goal');
  if (!stepCountEl || !stepPctEl || !stepBarEl) return;

  stepCountEl.textContent = stepCount.toLocaleString();
  const goal = state.settings.stepGoal || DEFAULT_STEP_GOAL;
  const pct  = Math.min(100, Math.round(stepCount / goal * 100));
  stepPctEl.textContent   = pct + '%';
  stepBarEl.style.width   = pct + '%';
  if (stepGoalEl) stepGoalEl.textContent = `${t('st-goal-pref')} ${goal.toLocaleString()}`;
}

// ── Restore on load / app resume ───────────────────────────────────────────

export async function restoreSteps() {
  stepCount = DB.get('stepCount-' + today(), 0);

  const mode = state.settings.stepMode || 'active-only';

  // If foreground mode was active, try to sync count from running service
  if (mode === 'foreground' && isNative() && getPlatform() === 'android') {
    const serviceSteps = await getServiceStepCount();
    if (serviceSteps !== null && serviceSteps > stepCount) {
      stepCount = serviceSteps;
      DB.set('stepCount-' + today(), stepCount);
    }
    // Re-attach live listener in case it was lost
    if (stepEnabled && !fgUnsubscribe) {
      fgUnsubscribe = addStepUpdateListener((steps) => {
        stepCount = steps;
        DB.set('stepCount-' + today(), stepCount);
        updateStepUI();
      });
    }
  }
}

export function saveStepGoal() {
  const el = document.getElementById('stepGoalInput');
  const goal = parseInt(el && el.value, 10) || DEFAULT_STEP_GOAL;
  state.settings.stepGoal = goal;
  saveData();
  // Update live service notification if running
  if (state.settings.stepMode === 'foreground' && isNative() && getPlatform() === 'android') {
    startStepService(goal, t('st-notif-title'), t('st-notif-text')).catch(() => {});
  }
  updateStepUI();
}

export function getStepCount() {
  return stepCount;
}
