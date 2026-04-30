// Step counter feature: device-motion based pedometer + daily goal tracking.
// Shares state with the rest of the app via src/core/state.js.

import { state, saveData, showToast, today, DB } from '../../core/state.js';
import { DEFAULT_STEP_GOAL, STEP_ACCEL_THRESHOLD } from '../../core/constants.js';
import { t } from '../../i18n/index.js';

const STEP_THRESHOLD = STEP_ACCEL_THRESHOLD;

let stepCount = 0;
let lastAcc = 0;
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
  if (!e.accelerationIncludingGravity) return;
  const { x, y, z } = e.accelerationIncludingGravity;
  const acc = Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2);
  if (acc > STEP_THRESHOLD * 1.3 && lastAcc <= STEP_THRESHOLD) {
    stepCount++;
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
