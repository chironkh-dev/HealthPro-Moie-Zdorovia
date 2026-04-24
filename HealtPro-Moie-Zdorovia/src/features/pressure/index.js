import { state, saveData, showToast, emit } from '../../core/state.js';
import { formatTime } from '../../core/utils.js';
import { getBPStatus } from './norm.js';
import { checkCritical } from './critical.js';

export function saveMeasurement() {
  const isRu = state.lang === 'ru';
  const sysEl   = document.getElementById('sys');
  const diaEl   = document.getElementById('dia');
  const pulseEl = document.getElementById('pulse');
  const noteEl  = document.getElementById('note');

  const s = parseInt(sysEl?.value);
  const d = parseInt(diaEl?.value);
  const p = parseInt(pulseEl?.value);
  const note = (noteEl?.value || '').trim();

  if (!s || !d) {
    showToast(isRu ? 'Введите систолическое и диастолическое давление' : 'Введіть систолічний та діастолічний тиск');
    return;
  }
  if (s < 60 || s > 300) {
    showToast(isRu ? 'Проверьте значение систолического давления' : 'Перевірте значення систолічного тиску');
    return;
  }
  if (d < 40 || d > 200) {
    showToast(isRu ? 'Проверьте значение диастолического давления' : 'Перевірте значення діастолічного тиску');
    return;
  }
  if (p && (p < 30 || p > 250)) {
    showToast(isRu
      ? 'Недопустимое значение пульса (допустимо от 30 до 250)'
      : 'Неприпустиме значення пульсу (допустимо від 30 до 250)');
    return;
  }

  state.measurements.unshift({
    sys: s,
    dia: d,
    pulse: p || null,
    note: note || null,
    time: new Date().toISOString(),
  });
  if (state.measurements.length > 500) state.measurements.pop();
  saveData();

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

  showToast(isRu ? 'Измерение сохранено!' : 'Вимір збережено!');
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
  const isRu = state.lang === 'ru';
  const hdrBP    = document.getElementById('hdrBP');
  const hdrPulse = document.getElementById('hdrPulse');
  if (!state.measurements.length) {
    if (hdrBP)    hdrBP.textContent    = '—';
    if (hdrPulse) hdrPulse.textContent = '';
    return;
  }
  const last = state.measurements[0];
  if (hdrBP)    hdrBP.textContent    = last.sys + '/' + last.dia;
  if (hdrPulse) hdrPulse.textContent = last.pulse ? last.pulse + (isRu ? ' уд/мин' : ' уд/хв') : '';
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
