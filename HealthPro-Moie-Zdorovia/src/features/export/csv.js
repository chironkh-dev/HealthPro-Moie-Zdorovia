// JSON / CSV exports for measurements.

import { state, saveData, showToast, today } from '../../core/state.js';
import { getBPStatus } from '../pressure/index.js';
import { t, tt } from '../../i18n/index.js';
import { formatDate, formatTime } from '../../core/utils.js';
import { download as platformDownload } from '../../core/platform.js';

export function exportData() {
  const blob = new Blob([JSON.stringify({
    version: '4.0',
    exportDate: new Date().toISOString(),
    measurements: state.measurements,
    pills: state.pills,
    pillsTaken: state.pillsTaken,
    settings: state.settings,
  }, null, 2)], { type: 'application/json' });
  platformDownload('healthpro-' + today() + '.json', blob, 'application/json');
  showToast(t('e-toast-json-saved'));
}

export function exportCSV() {
  const measurements = state.measurements;
  if (!measurements.length) {
    showToast(t('e-toast-no-data'));
    return;
  }
  const head = [t('e-csv-col-date'), t('e-csv-col-time'), t('e-csv-col-sys'), t('e-csv-col-dia'), t('e-csv-col-pulse'), t('e-csv-col-status'), t('e-csv-col-note')];
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = [head, ...measurements.map((m) => {
    return [
      formatDate(m.time),
      formatTime(m.time),
      m.sys, m.dia, m.pulse || '',
      getBPStatus(m.sys, m.dia).label.replace(/[^\wа-яёіїєА-ЯЁІЇЄ \.!]/gi, '').trim(),
      m.note || '',
    ];
  })];
  const blob = new Blob(['\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  platformDownload('pressure-' + today() + '.csv', blob, 'text/csv;charset=utf-8');
  showToast(t('e-toast-csv-saved'));
}

export function exportReportCSV(getExportMeasurements) {
  try {
    const filtered = getExportMeasurements();
    if (!filtered.length) {
      showToast(t('e-toast-no-data-period'));
      return;
    }
    const head = [t('e-csv-col-date'), t('e-csv-col-time'), t('e-csv-col-sys'), t('e-csv-col-dia'), t('e-csv-col-pulse'), t('e-csv-col-status'), t('e-csv-col-note')];
    const esc = (v) => {
      const s = String(v ?? '');
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const rows = [head, ...filtered.map((m) => {
      return [
        formatDate(m.time),
        formatTime(m.time),
        m.sys, m.dia, m.pulse || '',
        getBPStatus(m.sys, m.dia).label.replace(/[^\wа-яёіїєА-ЯЁІЇЄ \.!]/gi, '').trim(),
        m.note || '',
      ];
    })];
    const csv = '\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const fromEl = document.getElementById('expDateFrom');
    const toEl = document.getElementById('expDateTo');
    const from = fromEl?.value || today();
    const to = toEl?.value || today();
    const filename = `HealthPro_${from}_${to}.csv`;
    platformDownload(filename, blob, 'text/csv;charset=utf-8');
    showToast(t('e-toast-csv-saved'));
  } catch (err) {
    console.error('[CSV export]', err);
    showToast(t('e-toast-csv-error'));
  }
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
      // Зберігаємо стан кроковміра до імпорту — не запускаємо сервіс до ініціалізації плагіну
      const prevStepsEnabled = !!state.settings.stepsEnabled;
      state.measurements.length = 0;
      state.measurements.push(...(data.measurements || []));
      state.pills.length = 0;
      state.pills.push(...(data.pills || []));
      Object.keys(state.pillsTaken).forEach((k) => delete state.pillsTaken[k]);
      Object.assign(state.pillsTaken, data.pillsTaken || {});
      Object.assign(state.settings, data.settings || {});
      // Відновлюємо лише якщо кроковмір уже був активний до імпорту
      if (!prevStepsEnabled) state.settings.stepsEnabled = false;
      saveData();
      location.reload();
    } catch (err) {
      showToast(tt('e-toast-import-error', { msg: err.message }));
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
