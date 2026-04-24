// Export modal: period chooser + filtered measurement count.

import { state } from '../../core/state.js';

let _expPeriod = 'month';

export function getExportPeriod() {
  return _expPeriod;
}

export function openExportModal() {
  const modal = document.getElementById('exportModal');
  if (!modal) return;
  modal.classList.add('show');
  selectExportPeriod('month', document.getElementById('expP-month'));
  const now = new Date();
  const toStr = now.toISOString().slice(0, 10);
  const fromStr = new Date(now - 30 * 864e5).toISOString().slice(0, 10);
  document.getElementById('expDateFrom').value = fromStr;
  document.getElementById('expDateTo').value = toStr;
  updateExportCount();
}

export function closeExportModal() {
  const modal = document.getElementById('exportModal');
  if (modal) modal.classList.remove('show');
}

export function selectExportPeriod(period, el) {
  _expPeriod = period;
  document.querySelectorAll('.exp-period-btn').forEach((b) => b.classList.remove('active'));
  if (el) el.classList.add('active');
  const customRange = document.getElementById('expCustomRange');
  if (period === 'custom') {
    customRange.classList.add('show');
  } else {
    customRange.classList.remove('show');
    const now = new Date();
    const days = period === 'week' ? 7 : period === '2weeks' ? 14 : 30;
    const fromStr = new Date(now - days * 864e5).toISOString().slice(0, 10);
    const toStr = now.toISOString().slice(0, 10);
    document.getElementById('expDateFrom').value = fromStr;
    document.getElementById('expDateTo').value = toStr;
  }
  updateExportCount();
}

export function getExportMeasurements() {
  const fromEl = document.getElementById('expDateFrom');
  const toEl = document.getElementById('expDateTo');
  if (!fromEl || !toEl) return state.measurements.slice();
  const from = new Date(fromEl.value + 'T00:00:00');
  const to = new Date(toEl.value + 'T23:59:59');
  if (isNaN(from) || isNaN(to)) return state.measurements.slice();
  return state.measurements.filter((m) => {
    const t = new Date(m.time);
    return t >= from && t <= to;
  });
}

export function updateExportCount() {
  const isRu = state.lang === 'ru';
  const filtered = getExportMeasurements();
  const el = document.getElementById('expCount');
  if (!el) return;
  if (!filtered.length) {
    el.textContent = isRu ? 'Нет измерений за выбранный период' : 'Немає вимірів за вибраний період';
  } else {
    el.textContent = `${filtered.length} ${filtered.length === 1 ? 'вимір' : filtered.length < 5 ? 'виміри' : 'вимірів'} за вибраний період`;
  }
}
