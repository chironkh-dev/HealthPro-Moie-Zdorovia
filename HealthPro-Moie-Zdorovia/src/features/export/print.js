// Print-friendly HTML report opened in a new browser window for medical printing.
// On mobile devices the new-window + window.print() flow is unreliable, so we
// transparently fall back to the PDF exporter, which produces the same report.

import { state, showToast } from '../../core/state.js';
import { getBPStatus } from '../pressure/index.js';
import { getExportMeasurements, getExportPeriod } from './modal.js';
import { exportPDF } from './pdf.js';
import { t } from '../../i18n/index.js';
import { formatDate, formatTime } from '../../core/utils.js';
import { PRINT_T } from '../../i18n/print.i18n.js';

const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

const isMobile = () =>
  (typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod|Touch/i.test(navigator.userAgent || ''))
  || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 820px)').matches);

export function printReportPeriod() {
  // Mobile fallback: window.open / window.print are unreliable on iOS / Android browsers.
  if (isMobile()) {
    showToast(t('e-prep-pdf'));
    try { exportPDF(); } catch (e) { console.error('[print mobile fallback]', e); }
    return;
  }
  const filtered = getExportMeasurements();
  const settings = state.settings;
  const expPeriod = getExportPeriod();
  const L = PRINT_T[state.lang] || PRINT_T.uk;
  if (!filtered.length) { showToast(L.noData); return; }
  const loc = getLocale();
  const htmlLang = state.lang === 'ru' ? 'ru' : 'uk';
  const from = document.getElementById('expDateFrom').value;
  const to = document.getElementById('expDateTo').value;
  const name = settings.name || '—';
  const age = settings.age || '—';
  const aS = filtered.length ? avg(filtered.map((m) => m.sys)) : '—';
  const aD = filtered.length ? avg(filtered.map((m) => m.dia)) : '—';
  const pData = filtered.filter((m) => m.pulse);
  const aP = pData.length ? avg(pData.map((m) => m.pulse)) : '—';
  const periodLabel = expPeriod === 'week' ? L.week : expPeriod === '2weeks' ? L.w2 : expPeriod === 'month' ? L.month : `${from} — ${to}`;

  // SVG chart
  const chartData = filtered.slice().reverse();
  let svgChart = `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center;color:#94a3b8;font-size:12px;">${L.insufData}</div>`;
  if (chartData.length >= 2) {
    const W = 680, H = 160, ml = 36, mr = 12, mt = 12, mb = 32;
    const cw = W - ml - mr, ch = H - mt - mb;
    const vals = [...chartData.map((m) => m.sys), ...chartData.map((m) => m.dia)];
    const minV = Math.max(0, Math.min(...vals) - 10);
    const maxV = Math.max(...vals) + 10;
    const yScale = (v) => mt + ch - (((v - minV) / (maxV - minV)) * ch);
    const xScale = (i) => ml + (i / (chartData.length - 1)) * cw;
    const sysPath = chartData.map((m, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(m.sys).toFixed(1)}`).join(' ');
    const diaPath = chartData.map((m, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(m.dia).toFixed(1)}`).join(' ');
    const y120 = yScale(120), y80 = yScale(80);
    const step = Math.max(1, Math.floor(chartData.length / 6));
    const xLabels = chartData.map((m, i) => {
      if (i % step !== 0 && i !== chartData.length - 1) return '';
      const d = new Date(m.time);
      const lbl = `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      return `<text x="${xScale(i).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="9" fill="#94a3b8">${lbl}</text>`;
    }).join('');
    const yLabels = [minV, Math.round((minV + maxV) / 2), maxV].map((v) => `<text x="${ml - 4}" y="${(yScale(v) + 4).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8">${Math.round(v)}</text>`).join('');
    const sysDots = chartData.map((m, i) => `<circle cx="${xScale(i).toFixed(1)}" cy="${yScale(m.sys).toFixed(1)}" r="3" fill="#1e40af"/>`).join('');
    const diaDots = chartData.map((m, i) => `<circle cx="${xScale(i).toFixed(1)}" cy="${yScale(m.dia).toFixed(1)}" r="3" fill="#dc2626"/>`).join('');
    svgChart = `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="#f8fafc" rx="6"/>
      ${y120 > mt && y120 < H - mb ? `<line x1="${ml}" y1="${y120.toFixed(1)}" x2="${W - mr}" y2="${y120.toFixed(1)}" stroke="#1e40af" stroke-width="1" stroke-dasharray="4,3" opacity=".35"/>
      <text x="${ml - 4}" y="${(y120 + 4).toFixed(1)}" text-anchor="end" font-size="8" fill="#1e40af" opacity=".6">120</text>` : ''}
      ${y80 > mt && y80 < H - mb ? `<line x1="${ml}" y1="${y80.toFixed(1)}" x2="${W - mr}" y2="${y80.toFixed(1)}" stroke="#dc2626" stroke-width="1" stroke-dasharray="4,3" opacity=".35"/>
      <text x="${ml - 4}" y="${(y80 + 4).toFixed(1)}" text-anchor="end" font-size="8" fill="#dc2626" opacity=".6">80</text>` : ''}
      ${yLabels}
      ${xLabels}
      <path d="${sysPath}" fill="none" stroke="#1e40af" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${diaPath}" fill="none" stroke="#dc2626" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${sysDots}${diaDots}
      <circle cx="${ml + 16}" cy="${mt + 8}" r="4" fill="#1e40af"/>
      <text x="${ml + 24}" y="${mt + 12}" font-size="9" fill="#1e40af">${L.sys}</text>
      <circle cx="${ml + 100}" cy="${mt + 8}" r="4" fill="#dc2626"/>
      <text x="${ml + 108}" y="${mt + 12}" font-size="9" fill="#dc2626">${L.dia}</text>
    </svg>`;
  }

  const tableRows = filtered.map((m) => {
    const d = new Date(m.time);
    const st = getBPStatus(m.sys, m.dia);
    const statusColors = { 'Норма': '#166534', 'Підвищений': '#ca8a04', 'Гіпертензія 1': '#ea580c', 'Гіпертензія 2': '#dc2626', 'Криза': '#7f1d1d', 'Гіпотензія': '#1d4ed8' };
    const cleanLbl = st.label.replace(/[^\wа-яёіїєА-ЯЁІЇЄ ]/gi, '').trim();
    const col = statusColors[cleanLbl] || '#334155';
    const lbl = L.statusMap[cleanLbl] || cleanLbl;
    return `<tr>
      <td>${formatDate(m.time)}</td>
      <td>${formatTime(m.time)}</td>
      <td><b>${m.sys}/${m.dia}</b></td>
      <td>${m.pulse || '—'}</td>
      <td style="color:${col};font-weight:600">${lbl}</td>
      <td style="color:#64748b;font-size:11px">${m.note || ''}</td>
    </tr>`;
  }).join('');

  const infoCells = [
    { l: L.fio, v: name },
    { l: L.ageL, v: age + (age !== '—' ? L.yrs : '') },
    { l: L.gender, v: settings.gender === 'm' ? L.male : settings.gender === 'f' ? L.female : '—' },
    { l: L.height, v: settings.height ? settings.height + L.cm : '—' },
    { l: L.weight, v: settings.weight ? settings.weight + L.kg : '—' },
    { l: L.bmi, v: (settings.height && settings.weight) ? (settings.weight / Math.pow(settings.height / 100, 2)).toFixed(1) : '—' },
    { l: L.normalBP, v: (settings.normalSys && settings.normalDia) ? settings.normalSys + '/' + settings.normalDia : '—' },
    { l: L.normalP, v: settings.normalPulse ? settings.normalPulse + L.bpm : '—' },
    { l: L.period, v: periodLabel },
    { l: L.phoneL, v: settings.phone || '—' },
    { l: L.email, v: settings.email || '—' },
  ];
  if (settings.viber) infoCells.push({ l: 'Viber', v: settings.viber });
  if (settings.telegram) infoCells.push({ l: 'Telegram', v: settings.telegram });
  if (settings.whatsapp) infoCells.push({ l: 'WhatsApp', v: settings.whatsapp });
  if (settings.emergencyName || settings.emergencyPhone) infoCells.push({ l: L.emergency, v: `${settings.emergencyName || ''} ${settings.emergencyPhone || ''}`.trim(), emergency: true });
  const infoHtml = infoCells.map((c) => `<div class="info-box${c.emergency ? ' info-emerg' : ''}"><label>${c.l}</label><span>${c.v}</span></div>`).join('');

  const html = `<!DOCTYPE html><html lang="${htmlLang}"><head><meta charset="utf-8">
  <title>${L.repTitle} — ${name}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1e293b;background:#fff;padding:24px 32px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e40af;padding-bottom:14px;margin-bottom:18px}
    .logo{font-size:22px;font-weight:900;color:#1e40af;letter-spacing:-0.5px}
    .logo span{color:#dc2626}
    .subtitle{font-size:11px;color:#64748b;margin-top:2px}
    .info-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:14px}
    .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 9px;min-height:38px}
    .info-box label{font-size:8px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:2px;line-height:1.1}
    .info-box span{font-size:12px;font-weight:700;color:#1e293b;line-height:1.2;display:block;word-break:break-word}
    .info-box.info-emerg{background:#fef2f2;border-color:#fecaca}
    .info-box.info-emerg label{color:#b91c1c}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
    .stat-card{border-radius:8px;padding:10px;text-align:center}
    .stat-card.blue{background:#eff6ff;border:1px solid #bfdbfe}
    .stat-card.green{background:#f0fdf4;border:1px solid #bbf7d0}
    .stat-card.amber{background:#fefce8;border:1px solid #fef08a}
    .stat-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px}
    .stat-val{font-size:18px;font-weight:900}
    .blue .stat-lbl{color:#1e40af}.blue .stat-val{color:#1e40af}
    .green .stat-lbl{color:#166534}.green .stat-val{color:#166534}
    .amber .stat-lbl{color:#854d0e}.amber .stat-val{color:#854d0e}
    h2{font-size:13px;font-weight:700;border-left:4px solid #1e40af;padding-left:9px;margin-bottom:8px;color:#1e293b}
    table{width:100%;border-collapse:collapse;margin-bottom:18px;font-size:11px}
    thead{display:table-header-group}
    tfoot{display:table-row-group}
    tr{page-break-inside:avoid}
    th{background:#1e40af;color:#fff;padding:7px 8px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.3px}
    td{padding:6px 8px;border-bottom:1px solid #e2e8f0}
    tr:nth-child(even) td{background:#f8fafc}
    .notes-box{border:1px dashed #cbd5e1;padding:16px;border-radius:8px;margin-bottom:16px;page-break-inside:avoid}
    .notes-box label{font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.4px}
    .notes-line{border-top:1px solid #e2e8f0;margin-top:32px;padding-top:8px;display:flex;justify-content:space-between}
    .notes-line span{font-size:10px;color:#94a3b8}
    .disclaimer{background:#fef2f2;border:1px solid #fee2e2;padding:10px 14px;border-radius:8px;font-size:9px;color:#991b1b;line-height:1.6;margin-top:12px;page-break-inside:avoid}
    @media print{
      body{padding:10mm 12mm}
      button{display:none}
      thead{display:table-header-group}
      tr{page-break-inside:avoid}
      h2,.notes-box,.disclaimer,.stats{page-break-inside:avoid}
    }
    @page{margin:12mm}
  </style></head><body>
  <div class="header">
    <div><div class="logo">Health<span>Pro</span></div><div class="subtitle">${L.title} · ${L.generated}: ${formatDate(new Date())}</div></div>
    <div style="text-align:right;font-size:11px;color:#64748b"><div><b>${name}</b></div><div>${L.age}: ${age}</div><div>${L.phone}: ${settings.phone || '—'}</div></div>
  </div>
  <h2>${L.h_patient}</h2>
  <div class="info-grid">${infoHtml}</div>
  <div class="stats">
    <div class="stat-card blue"><div class="stat-lbl">${L.avgBP}</div><div class="stat-val">${aS}/${aD}</div></div>
    <div class="stat-card green"><div class="stat-lbl">${L.avgP}</div><div class="stat-val">${aP}</div></div>
    <div class="stat-card amber"><div class="stat-lbl">${L.totalM}</div><div class="stat-val">${filtered.length}</div></div>
  </div>
  <h2>${L.h_dyn}</h2>
  <div style="margin-bottom:18px">${svgChart}</div>
  <h2>${L.h_log}</h2>
  <table>
    <thead><tr><th>${L.cDate}</th><th>${L.cTime}</th><th>${L.cBP}</th><th>${L.cP}</th><th>${L.cStatus}</th><th>${L.cNote}</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="notes-box">
    <label>${L.notes}</label>
    <div class="notes-line">
      <span>${L.examDate} _____________</span>
      <span>${L.sign} _____________</span>
    </div>
  </div>
  <div class="disclaimer"><b>${L.important}</b> ${L.disclTxt}</div>
  <script>window.onload=function(){window.print()}<\/script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (w) { w.document.write(html); w.document.close(); }
  else {
    // Pop-up blocked — fall back to PDF so the user still gets a report.
    showToast(L.popup);
    try { exportPDF(); } catch (e) { console.error('[print popup fallback]', e); }
  }
}
