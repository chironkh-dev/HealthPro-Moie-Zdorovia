// JSON / CSV exports for measurements.

import { state, saveData, showToast, today } from '../../core/state.js';
import { getBPStatus } from '../pressure/index.js';
import { getDayName } from '../meds/index.js';
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

// ── Full-content report CSV (same data as PDF minus chart) ────────────────────
export function exportReportCSV(getExportMeasurements) {
  try {
    const filtered = typeof getExportMeasurements === 'function'
      ? getExportMeasurements()
      : (getExportMeasurements || []);
    if (!filtered.length) {
      showToast(t('e-toast-no-data-period'));
      return;
    }

    const s     = state.settings || {};
    const fromEl = document.getElementById('expDateFrom');
    const toEl   = document.getElementById('expDateTo');
    const from   = fromEl?.value || today();
    const to     = toEl?.value || today();

    const esc = (v) => {
      const str = String(v ?? '');
      return /[",\n;]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
    };

    const rows = [];

    // ── Секція 1: Дані пацієнта ──
    rows.push([t('e-csv-patient-lbl')]);
    rows.push([t('e-csv-col-name'),          esc(s.name || '—')]);
    rows.push([t('e-csv-col-age'),           esc(s.age  || '—')]);
    rows.push([t('e-csv-col-gender'),        esc(s.gender === 'm' ? t('e-csv-male') : s.gender === 'f' ? t('e-csv-female') : '—')]);
    rows.push([t('e-csv-col-height-weight'), esc(s.height ? `${s.height} ${t('e-csv-cm')} / ${s.weight} ${t('e-csv-kg')}` : '—')]);
    const bmiVal = (s.height && s.weight) ? (parseFloat(s.weight) / ((parseFloat(s.height) / 100) ** 2)).toFixed(1) : null;
    if (bmiVal) rows.push([t('e-csv-col-bmi'), esc(bmiVal)]);
    rows.push([t('e-csv-col-norm'),   esc(s.normalSys ? `${s.normalSys}/${s.normalDia || '—'} ${t('e-csv-mmhg')}` : '—')]);
    rows.push([t('e-csv-col-std'),    esc(s.bpStandard === 'AHA2017' ? 'AHA 2017' : 'ESC 2024')]);
    rows.push([t('e-csv-col-period'), esc(`${from} – ${to}`)]);
    rows.push([]);

    // ── Секція 2: Виміри тиску ──
    rows.push([t('e-csv-bp-lbl')]);
    rows.push([
      t('e-csv-col-date'), t('e-csv-col-time'),
      t('e-csv-col-sys'), t('e-csv-col-dia'), t('e-csv-col-pulse'),
      t('e-csv-col-status'), t('e-csv-col-note'),
    ]);
    const sorted = filtered.slice().sort((a, b) => new Date(a.time) - new Date(b.time));
    sorted.forEach((m) => {
      rows.push([
        formatDate(m.time),
        formatTime(m.time),
        m.sys, m.dia, m.pulse || '',
        getBPStatus(m.sys, m.dia).label.replace(/[^\wа-яёіїєА-ЯЁІЇЄ \.!]/gi, '').trim(),
        m.note || '',
      ]);
    });
    rows.push([]);

    // ── Секція 3: Ліки ──
    const activePills = (state.pills || []).filter(
      (p) => p.days !== 'date' || (p.date && p.date >= today())
    );
    if (activePills.length) {
      rows.push([t('e-csv-meds-lbl')]);
      rows.push([t('e-csv-col-drug'), t('e-csv-col-dose'), t('e-csv-col-time-med'), t('e-csv-col-sched')]);
      activePills.forEach((p) => {
        rows.push([p.name || '', p.dose || '', p.time || '', getDayName(p) || '']);
      });
      rows.push([]);
    }

    // ── Секція 4: Прийом ліків (30 днів) ──
    const adhRows = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayMap  = state.pillsTaken?.[dateStr] || {};
      const vals    = Object.values(dayMap);
      if (!vals.length) continue;
      const pct = Math.round(vals.filter((v) => v).length / vals.length * 100);
      adhRows.push([formatDate(dateStr), `${pct}%`]);
    }
    if (adhRows.length) {
      rows.push([t('e-csv-adher-lbl')]);
      rows.push([t('e-csv-col-date'), t('e-csv-col-adher-pct')]);
      rows.push(...adhRows);
    }

    const csv  = '\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const nameSafe = (s.name || '').replace(/[^a-zA-Zа-яА-ЯіІєЄїЇ0-9]/g, '_').slice(0, 20) || 'report';
    const filename = `HealthPro_${nameSafe}_${from}_${to}.csv`;
    platformDownload(filename, blob, 'text/csv;charset=utf-8');
    showToast(t('e-toast-csv-saved'));
  } catch (err) {
    console.error('[CSV report export]', err);
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
      const prevStepsEnabled = !!state.settings.stepsEnabled;
      state.measurements.length = 0;
      state.measurements.push(...(data.measurements || []));
      state.pills.length = 0;
      state.pills.push(...(data.pills || []));
      Object.keys(state.pillsTaken).forEach((k) => delete state.pillsTaken[k]);
      Object.assign(state.pillsTaken, data.pillsTaken || {});
      Object.assign(state.settings, data.settings || {});
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
