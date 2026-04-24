// JSON / CSV exports for measurements.

import { state, saveData, showToast, today } from '../../core/state.js';
import { getBPStatus } from '../pressure/index.js';

export function exportData() {
  const blob = new Blob([JSON.stringify({
    version: '4.0',
    exportDate: new Date().toISOString(),
    measurements: state.measurements,
    pills: state.pills,
    pillsTaken: state.pillsTaken,
    settings: state.settings,
  }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'healthpro-' + today() + '.json';
  a.click();
  showToast('✅ JSON збережено');
}

export function exportCSV() {
  const isRu = state.lang === 'ru';
  const measurements = state.measurements;
  if (!measurements.length) {
    showToast(isRu ? '⚠️ Нет данных' : '⚠️ Немає даних');
    return;
  }
  const loc = isRu ? 'ru-UA' : 'uk-UA';
  const head = isRu
    ? ['Дата', 'Время', 'Систол.', 'Диастол.', 'Пульс', 'Статус', 'Заметка']
    : ['Дата', 'Час', 'Систол.', 'Діастол.', 'Пульс', 'Статус', 'Нотатка'];
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = [head, ...measurements.map((m) => {
    const d = new Date(m.time);
    return [
      d.toLocaleDateString(loc),
      d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }),
      m.sys, m.dia, m.pulse || '',
      getBPStatus(m.sys, m.dia).label.replace(/[^\wа-яёіїєА-ЯЁІЇЄ \.!]/gi, '').trim(),
      m.note || '',
    ];
  })];
  const blob = new Blob(['\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pressure-' + today() + '.csv';
  a.click();
  showToast(isRu ? '📊 CSV сохранён' : '📊 CSV збережено');
}

export function exportReportCSV(getExportMeasurements) {
  const isRu = state.lang === 'ru';
  const loc = isRu ? 'ru-UA' : 'uk-UA';
  const filtered = getExportMeasurements();
  if (!filtered.length) {
    showToast(isRu ? '⚠️ Нет данных за выбранный период' : '⚠️ Немає даних за вибраний період');
    return;
  }
  const head = isRu
    ? ['Дата', 'Время', 'Систол.', 'Диастол.', 'Пульс', 'Статус', 'Заметка']
    : ['Дата', 'Час', 'Систол.', 'Діастол.', 'Пульс', 'Статус', 'Нотатка'];
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = [head, ...filtered.map((m) => {
    const d = new Date(m.time);
    return [
      d.toLocaleDateString(loc),
      d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }),
      m.sys, m.dia, m.pulse || '',
      getBPStatus(m.sys, m.dia).label.replace(/[^\wа-яёіїєА-ЯЁІЇЄ \.!]/gi, '').trim(),
      m.note || '',
    ];
  })];
  const blob = new Blob(['\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const from = document.getElementById('expDateFrom').value;
  const to = document.getElementById('expDateTo').value;
  a.download = `HealthPro_${from}_${to}.csv`;
  a.click();
  showToast(isRu ? '📊 CSV сохранён' : '📊 CSV збережено');
}

export function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.measurements && !data.pills) throw new Error('Невірний формат');
      if (!confirm(`Відновити?\nВиміри: ${data.measurements?.length || 0}, Ліки: ${data.pills?.length || 0}`)) return;
      state.measurements.length = 0;
      state.measurements.push(...(data.measurements || []));
      state.pills.length = 0;
      state.pills.push(...(data.pills || []));
      Object.keys(state.pillsTaken).forEach((k) => delete state.pillsTaken[k]);
      Object.assign(state.pillsTaken, data.pillsTaken || {});
      Object.assign(state.settings, data.settings || {});
      saveData();
      location.reload();
    } catch (err) {
      showToast('❌ Помилка: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
