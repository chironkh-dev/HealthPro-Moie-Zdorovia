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
  STEP_MIN_PEAK_SAMPLES,
} from '../../core/constants.js';
import { t } from '../../i18n/index.js';
import {
  isNative, getPlatform,
  requestActivityPermission, checkActivityPermission,
  startStepService, stopStepService,
  getServiceStatus, getServiceStepCount, addStepUpdateListener,
  getBatteryOptStatus, requestBatteryOptExemption,
  openAppSettings, onResume,
} from '../../core/platform.js';

const MIN_INTERVAL_MS  = STEP_MIN_INTERVAL_MS;
const LINEAR_THRESH    = STEP_LINEAR_THRESHOLD;
const GRAVITY_THRESH   = STEP_ACCEL_THRESHOLD;
const LP_ALPHA         = STEP_GRAVITY_FILTER_ALPHA;
const MIN_PEAK_SAMPLES = STEP_MIN_PEAK_SAMPLES;

// ── Module-level state ──────────────────────────────────────────────────────
let stepCount     = 0;
let lastStepTs    = 0;
let stepEnabled   = false;
let fgUnsubscribe = null;   // cleanup fn for addStepUpdateListener

// DeviceMotion peak-detection state
let _inPeak       = false;  // currently inside an acceleration peak
let _peakSamples  = 0;      // consecutive samples above threshold (tap filter)
let _gx = 0, _gy = 0, _gz = 0;  // gravity low-pass filter state (LP)

// Accelerometer availability detection
let _motionDetected   = false;
let _motionCheckTimer = null;

// onResume handler cleanup (avoid duplicate registration)
let _resumeUnsubscribe = null;

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
  if (!m) { _startPermFlow(); return; }
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
      setTimeout(() => {
        if (window.confirm(t('st-open-settings-confirm'))) openAppSettings();
      }, 400);
      return;
    }
    _showStepFgModal();
  } else {
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
  if (!m) { enableSteps('foreground'); return; }
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

  // Reset all motion-detection state for a clean new session.
  _inPeak      = false;
  _peakSamples = 0;
  lastStepTs   = 0;
  _gx = 0; _gy = 0; _gz = 0;

  const toggle = document.getElementById('stepToggle');
  const card   = document.getElementById('stepCard');
  if (toggle) toggle.classList.add('on');
  if (card)   card.style.display = 'block';

  const goal = state.settings.stepGoal || DEFAULT_STEP_GOAL;

  if (mode === 'foreground' && isNative() && getPlatform() === 'android') {
    // ── Native Foreground Service path ──
    // КРОК 1: перевіряємо, чи сервіс вже запущений (наприклад, після BootReceiver).
    // Дані сервісу мають пріоритет над локальною БД.
    const existingStatus = await getServiceStatus();

    if (existingStatus && existingStatus.running) {
      // Сервіс вже активний — беремо кроки З СЕРВІСУ, оновлюємо БД.
      // НЕ перезапускаємо сервіс, щоб не скинути нараховані кроки.
      stepCount = existingStatus.steps;
      DB.set('stepCount-' + today(), stepCount);

      if (!fgUnsubscribe) {
        fgUnsubscribe = addStepUpdateListener((steps, _goal) => {
          stepCount = steps;
          DB.set('stepCount-' + today(), stepCount);
          updateStepUI();
        });
      }

      showToast(t('st-mode-fg'));
      _setupResumeHealthCheck();
      _checkBatteryOptOnce();
    } else {
      // Сервіс не запущений — стартуємо з поточним значенням з БД.
      stepCount = DB.get('stepCount-' + today(), 0);

      const ok = await startStepService(
        goal,
        t('st-notif-title'),
        t('st-notif-text'),
        stepCount,
      );
      if (ok) {
        if (!fgUnsubscribe) {
          fgUnsubscribe = addStepUpdateListener((steps, _goal) => {
            stepCount = steps;
            DB.set('stepCount-' + today(), stepCount);
            updateStepUI();
          });
        }

        // Sync якщо сервіс вже встиг нарахувати кроки до підключення listener-а
        const status = await getServiceStatus();
        if (status && status.running && status.steps > stepCount) {
          stepCount = status.steps;
          DB.set('stepCount-' + today(), stepCount);
        }

        showToast(t('st-mode-fg'));
        _setupResumeHealthCheck();
        _checkBatteryOptOnce();
      } else {
        // Сервіс не вдалося запустити → fallback на active-only
        state.settings.stepMode = 'active-only';
        saveData();
        _attachDeviceMotion();
        showToast(t('st-mode-active'));
      }
    }
  } else {
    // ── DeviceMotion (active-only) path ──
    stepCount = DB.get('stepCount-' + today(), 0);
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

  if (fgUnsubscribe) { fgUnsubscribe(); fgUnsubscribe = null; }
  if (isNative() && getPlatform() === 'android') {
    stopStepService().catch(() => {});
  }

  if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
    window.removeEventListener('devicemotion', _handleMotion);
  }

  if (_motionCheckTimer !== null) {
    clearTimeout(_motionCheckTimer);
    _motionCheckTimer = null;
  }
  _motionDetected = false;

  // Clear onResume handler
  if (_resumeUnsubscribe) { _resumeUnsubscribe(); _resumeUnsubscribe = null; }

  // Reset debounce & peak state so re-enable starts clean.
  _inPeak      = false;
  _peakSamples = 0;
  lastStepTs   = 0;

  showToast(t('st-off'));
}

// ── Foreground service health check (onResume) ─────────────────────────────

/**
 * Register a single onResume handler that checks whether the foreground
 * service is still alive. If Samsung / Doze killed it, restart automatically.
 * Safe to call multiple times — previous handler is cleaned up first.
 */
function _setupResumeHealthCheck() {
  if (_resumeUnsubscribe) { _resumeUnsubscribe(); _resumeUnsubscribe = null; }

  _resumeUnsubscribe = onResume(async () => {
    if (!stepEnabled || state.settings.stepMode !== 'foreground') return;

    const status = await getServiceStatus();
    if (!status) return;  // plugin not available (web)

    if (!status.running) {
      // Service was killed — restart it transparently
      const goal = state.settings.stepGoal || DEFAULT_STEP_GOAL;
      const ok = await startStepService(
        goal,
        t('st-notif-title'),
        t('st-notif-text'),
        stepCount,
      );
      if (ok && !fgUnsubscribe) {
        fgUnsubscribe = addStepUpdateListener((steps) => {
          stepCount = steps;
          DB.set('stepCount-' + today(), stepCount);
          updateStepUI();
        });
        showToast(t('st-service-restored'));
      }
    } else if (status.steps > stepCount) {
      // Service has more steps than our JS variable (counted while backgrounded)
      stepCount = status.steps;
      DB.set('stepCount-' + today(), stepCount);
      updateStepUI();
    }
  });
}

/**
 * After starting the foreground service, check battery optimisation once
 * and prompt the user if the app is still being optimised.
 * Shown only once per app session (not on every enable).
 */
let _batteryOptChecked = false;
async function _checkBatteryOptOnce() {
  if (_batteryOptChecked) return;
  _batteryOptChecked = true;

  const ignored = await getBatteryOptStatus();
  if (!ignored) {
    // Delay so the mode toast is read first
    setTimeout(async () => {
      showToast(t('st-battery-opt'));
      await new Promise(r => setTimeout(r, 2600));
      await requestBatteryOptExemption();
    }, 2800);
  }
}

// ── DeviceMotion handler ───────────────────────────────────────────────────

function _attachDeviceMotion() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  window.removeEventListener('devicemotion', _handleMotion);
  window.addEventListener('devicemotion', _handleMotion);

  if (_motionCheckTimer !== null) clearTimeout(_motionCheckTimer);
  _motionDetected = false;
  _motionCheckTimer = setTimeout(() => {
    _motionCheckTimer = null;
    if (!_motionDetected && stepEnabled) {
      showToast(t('st-no-sensor'));
    }
  }, 3000);
}

function _handleMotion(e) {
  const now = Date.now();

  if (!_motionDetected) {
    _motionDetected = true;
    if (_motionCheckTimer !== null) {
      clearTimeout(_motionCheckTimer);
      _motionCheckTimer = null;
    }
  }

  let mag = 0;

  // Path 1: pure linear acceleration (no gravity) — preferred, more accurate.
  const la = e.acceleration;
  if (la && (la.x !== null || la.y !== null || la.z !== null)) {
    mag = Math.sqrt((la.x || 0) ** 2 + (la.y || 0) ** 2 + (la.z || 0) ** 2);

    if (!_inPeak) {
      if (mag >= LINEAR_THRESH) {
        // Accumulate consecutive samples above threshold.
        // MIN_PEAK_SAMPLES consecutive events are required before declaring a peak.
        // This rejects brief tap / vibration spikes (< ~40 ms) while accepting
        // genuine walking steps (≥ 80 ms above threshold at 50 Hz).
        _peakSamples++;
        if (_peakSamples >= MIN_PEAK_SAMPLES) {
          _inPeak = true;
          _peakSamples = 0;
        }
      } else {
        _peakSamples = 0;  // reset accumulator when signal drops below threshold
      }
    } else if (mag < LINEAR_THRESH) {
      _inPeak = false;
      if (now - lastStepTs >= MIN_INTERVAL_MS) {
        stepCount++;
        lastStepTs = now;
        DB.set('stepCount-' + today(), stepCount);
        updateStepUI();
      }
    }
    return;
  }

  // Path 2: accelerationIncludingGravity — fallback (older devices / iOS).
  const ag = e.accelerationIncludingGravity;
  if (!ag) return;

  _gx = LP_ALPHA * _gx + (1 - LP_ALPHA) * (ag.x || 0);
  _gy = LP_ALPHA * _gy + (1 - LP_ALPHA) * (ag.y || 0);
  _gz = LP_ALPHA * _gz + (1 - LP_ALPHA) * (ag.z || 0);

  const lx = (ag.x || 0) - _gx;
  const ly = (ag.y || 0) - _gy;
  const lz = (ag.z || 0) - _gz;
  mag = Math.sqrt(lx ** 2 + ly ** 2 + lz ** 2);

  if (!_inPeak) {
    if (mag >= LINEAR_THRESH) {
      _peakSamples++;
      if (_peakSamples >= MIN_PEAK_SAMPLES) {
        _inPeak = true;
        _peakSamples = 0;
      }
    } else {
      _peakSamples = 0;
    }
  } else if (mag < LINEAR_THRESH) {
    _inPeak = false;
    if (now - lastStepTs >= MIN_INTERVAL_MS) {
      stepCount++;
      lastStepTs = now;
      DB.set('stepCount-' + today(), stepCount);
      updateStepUI();
    }
  }
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
  const mode = state.settings.stepMode || 'active-only';

  if (mode === 'foreground' && isNative() && getPlatform() === 'android') {
    const status = await getServiceStatus();
    if (status) {
      if (status.running) {
        // Сервіс живий — його дані мають пріоритет над БД.
        stepCount = status.steps;
        DB.set('stepCount-' + today(), stepCount);
        stepEnabled = true;
        state.settings.stepsEnabled = true;

        if (!fgUnsubscribe) {
          fgUnsubscribe = addStepUpdateListener((steps) => {
            stepCount = steps;
            DB.set('stepCount-' + today(), stepCount);
            updateStepUI();
          });
        }
        _setupResumeHealthCheck();
      } else {
        // Сервіс мертвий (Doze / kill) — перезапускаємо з даними БД.
        stepCount = DB.get('stepCount-' + today(), 0);
        const goal = state.settings.stepGoal || DEFAULT_STEP_GOAL;
        const ok = await startStepService(
          goal,
          t('st-notif-title'),
          t('st-notif-text'),
          stepCount,
        );
        if (ok) {
          stepEnabled = true;
          state.settings.stepsEnabled = true;
          if (!fgUnsubscribe) {
            fgUnsubscribe = addStepUpdateListener((steps) => {
              stepCount = steps;
              DB.set('stepCount-' + today(), stepCount);
              updateStepUI();
            });
          }
          _setupResumeHealthCheck();
        }
      }
    }
  } else {
    stepCount = DB.get('stepCount-' + today(), 0);
  }
}

export function saveStepGoal() {
  const el = document.getElementById('stepGoalInput');
  const goal = parseInt(el && el.value, 10) || DEFAULT_STEP_GOAL;
  state.settings.stepGoal = goal;
  saveData();
  if (state.settings.stepMode === 'foreground' && isNative() && getPlatform() === 'android') {
    startStepService(goal, t('st-notif-title'), t('st-notif-text'), stepCount).catch(() => {});
  }
  updateStepUI();
}

export function getStepCount() {
  return stepCount;
}
