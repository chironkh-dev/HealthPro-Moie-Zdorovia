import { state, saveData, showToast, emit } from '../../core/state.js';
import { formatTime } from '../../core/utils.js';
import { t } from '../../i18n/index.js';
import { getBPStatus } from './norm.js';
import { checkCritical } from './critical.js';
import { insertMeasurement as dbInsert } from '../../core/db.js';

export function saveMeasurement() {
  const sysEl   = document.getElementById('sys');
  const diaEl   = document.getElementById('dia');
  const pulseEl = document.getElementById('pulse');
  const noteEl  = document.getElementById('note');

  const s = parseInt(sysEl?.value);
  const d = parseInt(diaEl?.value);
  const p = parseInt(pulseEl?.value);
  const note = (noteEl?.value || '').trim();

  if (!s || !d) { showToast(t('pr-toast-need-bp')); return; }
  if (s < 60 || s > 300) { showToast(t('pr-toast-bad-sys')); return; }
  if (d < 40 || d > 200) { showToast(t('pr-toast-bad-dia')); return; }
  if (p && (p < 30 || p > 250)) { showToast(t('pr-toast-bad-pulse')); return; }

  const newMeasurement = {
    sys: s, dia: d, pulse: p || null,
    note: note || null, time: new Date().toISOString(),
  };
  state.measurements.unshift(newMeasurement);
  if (state.measurements.length > 500) state.measurements.pop();
  saveData();

  // Write-through: записуємо в реляційну таблицю SQLite (no-op на вебі)
  dbInsert(newMeasurement).catch(() => {});

  ['sys', 'dia', 'pulse', 'note'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const status = document.getElementById('bpStatus');
  if (status) status.innerHTML = '';

  updateLastReading();
  updateHeaderStatus();
  checkCritical(s, d);

  emit('measurement:saved', { sys: s, dia: d, pulse: p });

  showToast(t('pr-toast-saved'));
}

export function updateLastReading() {
  if (!state.measurements.length) return;
  const last = state.measurements[0];
  const wrap = document.getElementById('lastReadingDisplay');
  if (wrap) wrap.style.display = 'flex';
  const lastBP    = document.getElementById('lastBP');
  const lastBPT   = document.getElementById('lastBPTime');
  const lastPulse = document.getElementById('lastPulse');
  if (lastBP)    lastBP.textContent    = last.sys + '/' + last.dia;
  if (lastBPT)   lastBPT.textContent   = formatTime(last.time);
  if (lastPulse) lastPulse.textContent = last.pulse || '—';
}

export function updateHeaderStatus() {
  const hdrBP    = document.getElementById('hdrBP');
  const hdrPulse = document.getElementById('hdrPulse');
  if (!state.measurements.length) {
    if (hdrBP)    hdrBP.textContent    = '—';
    if (hdrPulse) hdrPulse.textContent = '';
    return;
  }
  const last = state.measurements[0];
  if (hdrBP)    hdrBP.textContent    = last.sys + '/' + last.dia;
  if (hdrPulse) hdrPulse.textContent = last.pulse ? last.pulse + ' ' + t('pr-bpm-short') : '';
}

export function previewBP() {
  const sysEl = document.getElementById('sys');
  const diaEl = document.getElementById('dia');
  const el    = document.getElementById('bpStatus');
  if (!el) return;
  const s = parseInt(sysEl?.value);
  const d = parseInt(diaEl?.value);
  if (s && d) {
    const st = getBPStatus(s, d);
    el.innerHTML = `<div class="status-badge ${st.cls}">${st.label}</div>`;
  } else {
    el.innerHTML = '';
  }
}

export function attachPressureListeners() {
  const sysEl = document.getElementById('sys');
  const diaEl = document.getElementById('dia');
  if (sysEl) sysEl.addEventListener('input', previewBP);
  if (diaEl) diaEl.addEventListener('input', previewBP);
}

// Re-export so app.js (and future feature modules) have a single import surface.
export { getBPNorm, getBPStatus, getBPDotClass, getPulseStatus } from './norm.js';
export { WHO_INFO, getWHOCategory, openWHOInfo } from './who.js';
export { checkCritical, sendCriticalSMS, testEmergency } from './critical.js';
