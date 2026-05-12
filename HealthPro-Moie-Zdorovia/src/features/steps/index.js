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
import { _setStepCount, getStepCount } from './api.js';
export { getStepCount };
import { saveStepLog as dbSaveStep, queryStepLog } from '../../core/db.js';
import { createChart, disposeChart } from '../../core/charts.js';
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

// ── Хелпер збереження кроків: LS дзеркало + SQLite steps_log ───────────────
function _persistSteps(count) {
  // Перевіряємо перехід опівночі. Якщо день змінився — stepCount вже скинуто,
  // count зі старого дня не зберігаємо (він вже збережений у _checkDayRollover).
  if (_checkDayRollover()) return;
  const d    = today();
  const goal = state.settings?.stepGoal || DEFAULT_STEP_GOAL;
  DB.set('stepCount-' + d, count);                           // localStorage mirror
  dbSaveStep({ date: d, steps: count, goal }).catch(() => {}); // SQLite steps_log
  _setStepCount(count);                                        // sync to api.js (no charts dep)
}

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

// ── Midnight day-rollover tracking ──────────────────────────────────────────
let _lastStepDate = '';

// Виявляє перехід опівночі. Синхронний (скидання stepCount) + async (запис у БД).
// Повертає true якщо день змінився.
function _checkDayRollover() {
  const todayStr = today();
  if (!_lastStepDate) {
    // Перший запуск — завантажуємо з localStorage
    _lastStepDate = DB.get('stepLastDate', '') || todayStr;
    DB.set('stepLastDate', _lastStepDate);
  }
  if (_lastStepDate === todayStr) return false; // той самий день

  // Опівніч пройшла: зберегти вчорашній підсумок (idempotent upsert)
  const goal = state.settings?.stepGoal || DEFAULT_STEP_GOAL;
  dbSaveStep({ date: _lastStepDate, steps: stepCount, goal }).catch(() => {});

  // Скидаємо лічильник (синхронно — важливо до будь-яких нових записів)
  _lastStepDate = todayStr;
  DB.set('stepLastDate', todayStr);
  stepCount = 0;
  _setStepCount(0);

  // Записуємо 0 для нового дня (щоб в аналітиці був запис навіть якщо 0 кроків)
  DB.set('stepCount-' + todayStr, '0');
  dbSaveStep({ date: todayStr, steps: 0, goal }).catch(() => {});

  // Перезапускаємо Foreground Service з initialSteps=0 — він скине свій лічильник
  if (state.settings?.stepMode === 'foreground' && isNative() && getPlatform() === 'android') {
    startStepService(goal, t('st-notif-title'), t('st-notif-text'), 0).catch(() => {});
  }

  updateStepUI();
  return true;
}

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
      _persistSteps(stepCount);

      if (!fgUnsubscribe) {
        fgUnsubscribe = addStepUpdateListener((steps, _goal) => {
          stepCount = steps;
          _persistSteps(stepCount);
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
            _persistSteps(stepCount);
            updateStepUI();
          });
        }

        // Sync якщо сервіс вже встиг нарахувати кроки до підключення listener-а
        const status = await getServiceStatus();
        if (status && status.running && status.steps > stepCount) {
          stepCount = status.steps;
          _persistSteps(stepCount);
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

  _setStepCount(stepCount);   // sync module-level stepCount → api.js (no charts dep)
  updateStepUI();
  refreshStepAvg().catch(() => {});
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
    // При поверненні в додаток — перевіряємо чи не пройшла опівніч
    _checkDayRollover();
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
          _persistSteps(stepCount);
          updateStepUI();
        });
        showToast(t('st-service-restored'));
      }
    } else {
      // Service running (може бути перезапущено AlarmManager після змахування)
      // Синхронізуємо кроки
      if (status.steps !== stepCount) {
        stepCount = status.steps;
        _persistSteps(stepCount);
        updateStepUI();
      }
      // Якщо listener не підключено — підключаємо (JS не знав що сервіс живий)
      if (!fgUnsubscribe) {
        fgUnsubscribe = addStepUpdateListener((steps) => {
          stepCount = steps;
          _persistSteps(stepCount);
          updateStepUI();
        });
      }
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
        _persistSteps(stepCount);
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
      _persistSteps(stepCount);
      updateStepUI();
    }
  }
}

// ── UI ─────────────────────────────────────────────────────────────────────

export function updateStepUI() {
  const stepCountEl  = document.getElementById('stepCount');
  const stepPctEl    = document.getElementById('stepPct');
  const stepGoalEl   = document.getElementById('t-step-goal');
  const stepCircle   = document.getElementById('stepCircleProg');

  if (!stepCountEl || !stepPctEl) return;

  const goal = state.settings.stepGoal || DEFAULT_STEP_GOAL;
  const pct  = Math.min(100, Math.round(stepCount / goal * 100));

  stepCountEl.textContent = stepCount.toLocaleString();
  stepPctEl.textContent   = pct + '%';

  // Кругова шкала: circumference = 2π×42 ≈ 263.9
  if (stepCircle) {
    const CIRC = 263.9;
    const offset = CIRC - (pct / 100) * CIRC;
    stepCircle.style.strokeDashoffset = offset.toFixed(1);
  }

  if (stepGoalEl) stepGoalEl.textContent = `${t('st-goal-pref')} ${goal.toLocaleString()}`;
  _renderStepAvg();
}

// ── Restore on load / app resume ───────────────────────────────────────────

export async function restoreSteps() {
  // Ініціалізуємо date-tracking та перевіряємо перехід опівночі при старті
  if (!_lastStepDate) {
    _lastStepDate = DB.get('stepLastDate', '') || today();
    DB.set('stepLastDate', _lastStepDate);
  }
  _checkDayRollover();

  const mode = state.settings.stepMode || 'active-only';

  if (mode === 'foreground' && isNative() && getPlatform() === 'android') {
    const status = await getServiceStatus();
    if (status) {
      if (status.running) {
        // Сервіс живий — його дані мають пріоритет над БД.
        stepCount = status.steps;
        _persistSteps(stepCount);
        stepEnabled = true;
        state.settings.stepsEnabled = true;

        if (!fgUnsubscribe) {
          fgUnsubscribe = addStepUpdateListener((steps) => {
            stepCount = steps;
            _persistSteps(stepCount);
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
              _persistSteps(stepCount);
              updateStepUI();
            });
          }
          _setupResumeHealthCheck();
        }
      }
    }
  } else {
    // Відновлюємо з SQLite (пріоритет) або localStorage
    try {
      const rows = await queryStepLog({ days: 1 });
      const todayRow = rows.find(r => r.date === today());
      stepCount = todayRow ? todayRow.steps : DB.get('stepCount-' + today(), 0);
    } catch {
      stepCount = DB.get('stepCount-' + today(), 0);
    }
  }
  _setStepCount(stepCount);
  refreshStepAvg().catch(() => {});
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

// ── Step averages cache ─────────────────────────────────────────────────────
let _weekAvg = null;
let _monthAvg = null;
let _avgLastRefresh = 0;

/** Refresh weekly/monthly step averages from DB (max once per 5 min). */
export async function refreshStepAvg() {
  const now = Date.now();
  if (now - _avgLastRefresh < 5 * 60 * 1000) { _renderStepAvg(); return; }
  _avgLastRefresh = now;
  try {
    const rows = await queryStepLog({ days: 30 });
    const todayStr = today();
    const cutWeek  = new Date(now - 7  * 86400000).toISOString().slice(0, 10);
    const cutMonth = new Date(now - 30 * 86400000).toISOString().slice(0, 10);
    const wRows = rows.filter(r => r.date >= cutWeek  && r.date < todayStr);
    const mRows = rows.filter(r => r.date >= cutMonth && r.date < todayStr);
    _weekAvg  = wRows.length ? Math.round(wRows.reduce( (s, r) => s + r.steps, 0) / wRows.length)  : null;
    _monthAvg = mRows.length ? Math.round(mRows.reduce((s, r) => s + r.steps, 0) / mRows.length) : null;
  } catch { /* noop */ }
  _renderStepAvg();
}

function _renderStepAvg() {
  const wEl = document.getElementById('stepWeekAvg');
  const mEl = document.getElementById('stepMonthAvg');
  if (wEl) wEl.textContent = _weekAvg  !== null ? `${t('st-week-avg')}: ${_weekAvg.toLocaleString()}` : '';
  if (mEl) mEl.textContent = _monthAvg !== null ? `${t('st-month-avg')}: ${_monthAvg.toLocaleString()}` : '';
}

// ── Steps-by-day bar chart ──────────────────────────────────────────────────

export async function renderStepsDayChart(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  disposeChart(el);

  const rows = await queryStepLog({ days: 30 }).catch(() => []);

  if (rows.length < 2) {
    el.style.height = '';
    el.innerHTML = `<div class="chart-empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>${t('t-steps-day-empty')}</p></div>`;
    return;
  }

  el.innerHTML = '';
  el.style.height = '260px';

  const goal = state.settings?.stepGoal || DEFAULT_STEP_GOAL;
  const chart = createChart(el, 'svg');
  if (!chart) return;

  const dates  = rows.map(r => r.date.slice(5));   // MM-DD
  const values = rows.map(r => r.steps);
  const barData = rows.map((r, i) => ({
    value: r.steps,
    itemStyle: {
      color: r.steps >= (r.goal || goal) ? '#22c55e' : '#06b6d4',
      borderRadius: [3, 3, 0, 0],
    },
  }));

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 52, right: 12, top: 20, bottom: 50 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: '#64748b', fontSize: 9, rotate: 45, interval: 0 },
      axisLine: { lineStyle: { color: '#475569' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(99,140,255,0.07)' } },
      axisLine: { lineStyle: { color: '#475569' } },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(99,140,255,0.18)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params) => {
        const p = params[0];
        return `${rows[p.dataIndex].date}<br><b>${Number(p.value).toLocaleString()}</b> ${t('t-steps')}`;
      },
    },
    series: [{
      type: 'bar',
      data: barData,
      barMaxWidth: 18,
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 },
        data: [{
          yAxis: goal,
          label: {
            formatter: () => goal.toLocaleString(),
            color: '#f59e0b',
            fontSize: 10,
            position: 'end',
          },
        }],
      },
    }],
  });
}

export function disposeStepsDayChart(containerId) {
  const el = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;
  disposeChart(el);
}

export function openStepsDayModal() {
  const m = document.getElementById('stepsDayModal');
  if (!m) return;
  m.classList.add('show');
  document.body.style.overflow = 'hidden';
  renderStepsDayChart('stepsDayChart').catch(() => {});
}

export function closeStepsDayModal() {
  disposeStepsDayChart('stepsDayChart');
  const m = document.getElementById('stepsDayModal');
  if (!m) return;
  m.classList.remove('show');
  document.body.style.overflow = '';
}
