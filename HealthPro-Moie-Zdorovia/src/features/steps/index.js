// Step counter feature: device-motion based pedometer + daily goal tracking.
// Shares state with the rest of the app via src/core/state.js.

import { state, saveData, showToast, today, DB } from '../../core/state.js';
import { DEFAULT_STEP_GOAL, STEP_ACCEL_THRESHOLD, STEP_MIN_INTERVAL_MS } from '../../core/constants.js';
import { t } from '../../i18n/index.js';

const STEP_THRESHOLD = STEP_ACCEL_THRESHOLD;
const MIN_INTERVAL_MS = STEP_MIN_INTERVAL_MS;

let stepCount = 0;
let lastAcc = 0;
let lastStepTs = 0;
let stepEnabled = false;

export function saveStepGoal() {
  const el = document.getElementById('stepGoalInput');
  state.settings.stepGoal = parseInt(el && el.value, 10) || DEFAULT_STEP_GOAL;
  saveData();
  updateStepUI();
}

export function toggleStepCounter() {
  if (!stepEnabled) {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then((p) => {
        if (p === 'granted') enableSteps();
        else showToast(t('st-no-perm'));
      });
    } else enableSteps();
  } else {
    stepEnabled = false;
    state.settings.stepsEnabled = false;
    saveData();
    document.getElementById('stepToggle').classList.remove('on');
    document.getElementById('stepCard').style.display = 'none';
    window.removeEventListener('devicemotion', handleMotion);
    showToast(t('st-off'));
  }
}

export function enableSteps() {
  stepEnabled = true;
  state.settings.stepsEnabled = true;
  saveData();
  document.getElementById('stepToggle').classList.add('on');
  document.getElementById('stepCard').style.display = 'block';
  stepCount = DB.get('stepCount-' + today(), 0);
  updateStepUI();
  window.addEventListener('devicemotion', handleMotion);
  showToast(t('st-on'));
}

function handleMotion(e) {
  // Accept both DeviceMotion and @capacitor/motion-shaped events.
  const a = e.accelerationIncludingGravity || (e.acceleration && {
    x: (e.acceleration.x || 0), y: (e.acceleration.y || 0), z: ((e.acceleration.z || 0) + 9.81),
  });
  if (!a) return;
  const acc = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
  const now = Date.now();
  // Rising-edge detector around the walking-peak threshold + debounce.
  if (
    acc > STEP_THRESHOLD &&
    lastAcc <= STEP_THRESHOLD &&
    (now - lastStepTs) >= MIN_INTERVAL_MS
  ) {
    stepCount++;
    lastStepTs = now;
    DB.set('stepCount-' + today(), stepCount);
    updateStepUI();
  }
  lastAcc = acc;
}

export function updateStepUI() {
  const stepCountEl = document.getElementById('stepCount');
  const stepPctEl = document.getElementById('stepPct');
  const stepBarEl = document.getElementById('stepBar');
  const stepGoalEl = document.getElementById('t-step-goal');
  if (!stepCountEl || !stepPctEl || !stepBarEl) return;
  stepCountEl.textContent = stepCount.toLocaleString();
  const goal = state.settings.stepGoal || DEFAULT_STEP_GOAL;
  const pct = Math.min(100, Math.round(stepCount / goal * 100));
  stepPctEl.textContent = pct + '%';
  stepBarEl.style.width = pct + '%';
  if (stepGoalEl) stepGoalEl.textContent = `${t('st-goal-pref')} ${goal.toLocaleString()}`;
}

// Restore counter for today on load.
export function restoreSteps() {
  stepCount = DB.get('stepCount-' + today(), 0);
}

export function getStepCount() {
  return stepCount;
}
