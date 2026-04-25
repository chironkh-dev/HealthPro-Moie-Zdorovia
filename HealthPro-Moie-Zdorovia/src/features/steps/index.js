// Step counter feature: device-motion based pedometer + daily goal tracking.
// Shares state with the rest of the app via src/core/state.js.

import { state, saveData, showToast, today, DB } from '../../core/state.js';

const STEP_THRESHOLD = 1.5;

let stepCount = 0;
let lastAcc = 0;
let stepEnabled = false;

function isRu() { return state.lang === 'ru'; }

export function saveStepGoal() {
  const el = document.getElementById('stepGoalInput');
  state.settings.stepGoal = parseInt(el && el.value, 10) || 10000;
  saveData();
  updateStepUI();
}

export function toggleStepCounter() {
  if (!stepEnabled) {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then((p) => {
        if (p === 'granted') enableSteps();
        else showToast(isRu() ? '❌ Нет разрешения на акселерометр' : '❌ Немає дозволу на акселерометр');
      });
    } else enableSteps();
  } else {
    stepEnabled = false;
    state.settings.stepsEnabled = false;
    saveData();
    document.getElementById('stepToggle').classList.remove('on');
    document.getElementById('stepCard').style.display = 'none';
    window.removeEventListener('devicemotion', handleMotion);
    showToast(isRu() ? '🦶 Счётчик выключен' : '🦶 Лічильник вимкнено');
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
  showToast(isRu() ? '🦶 Счётчик шагов включён!' : '🦶 Лічильник кроків увімкнено!');
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
  const goal = state.settings.stepGoal || 10000;
  const pct = Math.min(100, Math.round(stepCount / goal * 100));
  stepPctEl.textContent = pct + '%';
  stepBarEl.style.width = pct + '%';
  if (stepGoalEl) stepGoalEl.textContent = `ціль: ${goal.toLocaleString()}`;
}

// Restore counter for today on load.
export function restoreSteps() {
  stepCount = DB.get('stepCount-' + today(), 0);
}

export function getStepCount() {
  return stepCount;
}
