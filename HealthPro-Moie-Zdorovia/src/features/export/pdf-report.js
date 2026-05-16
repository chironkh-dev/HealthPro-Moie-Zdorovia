// PDF doctor report — Task 5.
// Architecture: html2canvas → jsPDF (Variant A).
// Full offline, no server needed.
// Includes: patient info, BP stats, BP chart (SVG inline), medications, adherence, disclaimer.

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { state, showToast } from '../../core/state.js';
import { getBPStatus } from '../pressure/index.js';
import { t } from '../../i18n/index.js';
import { getLocale } from '../../core/utils.js';
import { isPillDueToday, getDayName } from '../meds/index.js';
import { download as platformDownload } from '../../core/platform.js';

const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

function todayISO() { return new Date().toISOString().split('T')[0]; }

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function computeDailyAdherence(days = 30) {
  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayMap = state.pillsTaken?.[dateStr] || {};
    const vals = Object.values(dayMap);
    if (vals.length === 0) continue;
    const pct = Math.round(vals.filter((v) => v).length / vals.length * 100);
    const lbl = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
    result.push({ date: lbl, pct });
  }
  return result;
}

// ── Inline SVG BP chart (safe, no ECharts dependency) ────────────────────────
function buildBPChartSVG(data) {
  if (!data || data.length < 2) return `<div style="text-align:center;color:#94a3b8;font-size:12px;padding:16px">Недостатньо даних для графіка</div>`;
  const W = 680, H = 160, ml = 38, mr = 12, mt = 12, mb = 32;
  const cw = W - ml - mr, ch = H - mt - mb;
  const vals = [...data.map((m) => m.sys), ...data.map((m) => m.dia)];
  const minV = Math.max(0, Math.min(...vals) - 10);
  const maxV = Math.max(...vals) + 10;
  const yS = (v) => mt + ch - ((v - minV) / (maxV - minV)) * ch;
  const xS = (i) => ml + (i / (data.length - 1)) * cw;
  const sysPath = data.map((m, i) => `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(m.sys).toFixed(1)}`).join(' ');
  const diaPath = data.map((m, i) => `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(m.dia).toFixed(1)}`).join(' ');
  const step = Math.max(1, Math.floor(data.length / 6));
  const xLabels = data.map((m, i) => {
    if (i % step !== 0 && i !== data.length - 1) return '';
    const d = new Date(m.time);
    return `<text x="${xS(i).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="9" fill="#94a3b8">${d.getDate()}.${String(d.getMonth()+1).padStart(2,'0')}</text>`;
  }).join('');
  const y120 = yS(120), y80 = yS(80);
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <rect width="${W}" height="${H}" fill="#f8fafc" rx="6"/>
    ${y120 > mt && y120 < H-mb ? `<line x1="${ml}" y1="${y120.toFixed(1)}" x2="${W-mr}" y2="${y120.toFixed(1)}" stroke="#1e40af" stroke-width="1" stroke-dasharray="4,3" opacity=".3"/>` : ''}
    ${y80 > mt && y80 < H-mb ? `<line x1="${ml}" y1="${y80.toFixed(1)}" x2="${W-mr}" y2="${y80.toFixed(1)}" stroke="#dc2626" stroke-width="1" stroke-dasharray="4,3" opacity=".3"/>` : ''}
    <path d="${sysPath}" fill="none" stroke="#1e40af" stroke-width="2"/>
    <path d="${diaPath}" fill="none" stroke="#dc2626" stroke-width="2"/>
    ${data.map((m, i) => `<circle cx="${xS(i).toFixed(1)}" cy="${yS(m.sys).toFixed(1)}" r="3" fill="#1e40af"/><circle cx="${xS(i).toFixed(1)}" cy="${yS(m.dia).toFixed(1)}" r="3" fill="#dc2626"/>`).join('')}
    ${xLabels}
    <circle cx="${ml+16}" cy="${mt+8}" r="4" fill="#1e40af"/><text x="${ml+24}" y="${mt+12}" font-size="9" fill="#1e40af">Сист.</text>
    <circle cx="${ml+80}" cy="${mt+8}" r="4" fill="#dc2626"/><text x="${ml+88}" y="${mt+12}" font-size="9" fill="#dc2626">Діаст.</text>
  </svg>`;
}

// ── Adherence bar chart SVG ───────────────────────────────────────────────────
function buildAdherenceSVG(adhData) {
  if (!adhData || adhData.length < 3) return `<div style="text-align:center;color:#94a3b8;font-size:12px;padding:12px">Недостатньо даних</div>`;
  const W = 680, H = 100, ml = 0, mt = 8, mb = 22, barW = Math.min(20, Math.floor((W - ml) / adhData.length) - 2);
  const step = Math.max(1, Math.floor(adhData.length / 8));
  const avgPct = adhData.reduce((s, d) => s + d.pct, 0) / adhData.length;
  const color = avgPct >= 80 ? '#22c55e' : '#ef4444';
  const bars = adhData.map((d, i) => {
    const barH = ((H - mt - mb) * d.pct / 100);
    const x = ml + i * (W - ml) / adhData.length;
    const lbl = i % step === 0 ? `<text x="${(x + barW/2).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="8" fill="#94a3b8">${d.date}</text>` : '';
    return `<rect x="${x.toFixed(1)}" y="${(H - mb - barH).toFixed(1)}" width="${barW}" height="${barH.toFixed(1)}" fill="${color}" opacity=".7" rx="2"/>${lbl}`;
  }).join('');
  const y80 = H - mb - (H - mt - mb) * 80 / 100;
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <rect width="${W}" height="${H}" fill="#f8fafc" rx="6"/>
    ${bars}
    <line x1="0" y1="${y80.toFixed(1)}" x2="${W}" y2="${y80.toFixed(1)}" stroke="#64748b" stroke-dasharray="4,3" stroke-width="1"/>
    <text x="4" y="${(y80-3).toFixed(1)}" font-size="8" fill="#64748b">80%</text>
  </svg>`;
}

// ── Build full HTML report ────────────────────────────────────────────────────
function buildReportHTML({ settings, chartData, aS, aD, aP, maxSys, minSys, activePills, adhData, avgAdh, dateStr, loc }) {
  const name = settings.name || '—';
  const age  = settings.age  || '—';
  const bpChartSVG = buildBPChartSVG(chartData);
  const adhSVG = buildAdherenceSVG(adhData);
  const adhColor = (avgAdh ?? 0) >= 80 ? '#166534' : '#991b1b';
  const adhBg = (avgAdh ?? 0) >= 80 ? '#f0fdf4' : '#fef2f2';

  const tableRows = chartData.slice(-30).reverse().map((m) => {
    const d = new Date(m.time);
    const st = getBPStatus(m.sys, m.dia);
    const cleanLbl = st.label.replace(/[^\wа-яёіїєА-ЯЁІЇЄ ]/gi, '').trim();
    return `<tr>
      <td>${d.toLocaleDateString(loc)}</td>
      <td>${d.toLocaleTimeString(loc, { hour:'2-digit', minute:'2-digit' })}</td>
      <td><b>${m.sys}/${m.dia}</b></td>
      <td>${m.pulse || '—'}</td>
      <td style="font-size:11px">${cleanLbl}</td>
      <td style="color:#64748b;font-size:10px">${m.note || ''}</td>
    </tr>`;
  }).join('');

  const pillRows = activePills.map((p) => `<tr>
    <td>${p.name}</td><td>${p.dose}</td><td>${p.time}</td><td>${getDayName(p)}</td>
  </tr>`).join('') || `<tr><td colspan="4" style="color:#94a3b8;text-align:center">Немає активних призначень</td></tr>`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1e293b;background:#fff;padding:28px 32px;width:794px;box-sizing:border-box">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e40af;padding-bottom:14px;margin-bottom:18px">
      <div>
        <div style="font-size:22px;font-weight:900;color:#1e40af;letter-spacing:-.5px">Health<span style="color:#dc2626">Pro</span></div>
        <div style="font-size:11px;color:#64748b;margin-top:2px">Звіт для лікаря · ${dateStr}</div>
      </div>
      <div style="text-align:right;font-size:11px;color:#64748b">
        <div><b>${name}</b></div>
        <div>Вік: ${age}${age !== '—' ? ' р.' : ''}</div>
        <div>${settings.phone || ''}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:9px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">Середній тиск (30 д.)</div>
        <div style="font-size:20px;font-weight:900;color:#1e40af">${aS}/${aD}</div>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:9px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">Середній пульс</div>
        <div style="font-size:20px;font-weight:900;color:#166534">${aP}</div>
      </div>
      <div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:9px;font-weight:700;color:#854d0e;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px">Макс./Мін. сист.</div>
        <div style="font-size:20px;font-weight:900;color:#854d0e">${maxSys}/${minSys}</div>
      </div>
    </div>

    <div style="font-size:13px;font-weight:700;border-left:4px solid #1e40af;padding-left:9px;margin-bottom:8px">Динаміка тиску — 30 днів</div>
    <div style="margin-bottom:18px">${bpChartSVG}</div>

    <div style="font-size:13px;font-weight:700;border-left:4px solid #1e40af;padding-left:9px;margin-bottom:8px">Журнал вимірів (останні 30)</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:18px">
      <thead><tr style="background:#1e40af;color:#fff">
        <th style="padding:6px 7px;text-align:left">Дата</th>
        <th style="padding:6px 7px;text-align:left">Час</th>
        <th style="padding:6px 7px;text-align:left">Тиск</th>
        <th style="padding:6px 7px;text-align:left">Пульс</th>
        <th style="padding:6px 7px;text-align:left">Категорія</th>
        <th style="padding:6px 7px;text-align:left">Нотатка</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>

    <div style="font-size:13px;font-weight:700;border-left:4px solid #7c3aed;padding-left:9px;margin-bottom:8px">Ліки — активні призначення</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px">
      <thead><tr style="background:#7c3aed;color:#fff">
        <th style="padding:6px 7px;text-align:left">Препарат</th>
        <th style="padding:6px 7px;text-align:left">Дозування</th>
        <th style="padding:6px 7px;text-align:left">Час</th>
        <th style="padding:6px 7px;text-align:left">Розклад</th>
      </tr></thead>
      <tbody>${pillRows}</tbody>
    </table>

    ${adhData.length >= 3 ? `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
      <div style="font-size:13px;font-weight:700;border-left:4px solid #7c3aed;padding-left:9px">Прийом ліків — 30 днів</div>
      <div style="background:${adhBg};border-radius:6px;padding:3px 10px;font-size:13px;font-weight:900;color:${adhColor}">${avgAdh}%</div>
    </div>
    <div style="margin-bottom:18px">${adhSVG}</div>
    ` : ''}

    <div style="background:#fef2f2;border:1px solid #fee2e2;padding:10px 14px;border-radius:8px;font-size:9px;color:#991b1b;line-height:1.6;margin-top:8px">
      <b>Важливо:</b> Цей звіт має виключно інформаційний характер і не є медичним висновком. Для діагностики та лікування зверніться до лікаря.
    </div>
  </div>`;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateDoctorReport() {
  const measurements = state.measurements;
  if (!measurements.length) {
    showToast(t('j-no-data') || 'Немає даних');
    return;
  }

  showToast(t('e-doctor-pdf-prep') || 'Генерація PDF...', 6000);

  const loc = getLocale();
  const settings = state.settings || {};
  const from = daysAgoISO(30);
  const chartData = measurements.filter((m) => {
    const d = new Date(m.time).toISOString().split('T')[0];
    return d >= from;
  }).slice().reverse();

  const sysList = chartData.map((m) => m.sys);
  const aS = avg(sysList) ?? '—';
  const aD = avg(chartData.map((m) => m.dia)) ?? '—';
  const aP = avg(chartData.filter((m) => m.pulse).map((m) => m.pulse)) ?? '—';
  const maxSys = sysList.length ? Math.max(...sysList) : '—';
  const minSys = sysList.length ? Math.min(...sysList) : '—';

  const activePills = (state.pills || []).filter((p) => p.days !== 'date' || (p.date && p.date >= todayISO()));
  const adhData = computeDailyAdherence(30);
  const avgAdh = adhData.length ? Math.round(adhData.reduce((s, d) => s + d.pct, 0) / adhData.length) : null;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${pad(now.getDate())}.${pad(now.getMonth()+1)}.${now.getFullYear()}`;
  const fileName = `HealthPro_Doctor_${todayISO()}.pdf`;

  const html = buildReportHTML({ settings, chartData, aS, aD, aP, maxSys, minSys, activePills, adhData, avgAdh, dateStr, loc });

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    await new Promise((r) => setTimeout(r, 300));

    const canvas = await html2canvas(container.firstElementChild, {
      scale: 1.5,
      useCORS: false,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height / canvas.width) * pageW;

    let position = 0;
    let heightLeft = imgH;

    pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH);
    heightLeft -= pageH;

    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH);
      heightLeft -= pageH;
    }

    const blob = pdf.output('blob');
    try {
      await platformDownload(fileName, blob, 'application/pdf');
    } catch {
      pdf.save(fileName);
    }

    showToast(t('e-doctor-pdf-done') || 'Звіт готовий!');
  } catch (e) {
    console.error('[pdf-report]', e);
    showToast(t('e-doctor-pdf-error') || 'Помилка генерації PDF');
  } finally {
    document.body.removeChild(container);
  }
}
