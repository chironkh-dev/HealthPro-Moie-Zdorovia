// PDF doctor report — PDF-1/2/3.
// Architecture: html2canvas → jsPDF (offline, no server).
// PDF-1: 8-block template (header, patient, stats, chart, journal, meds, adherence, doctor notes).
// PDF-2: configurable sections via modal checkboxes.
// PDF-3: platformDownload for Android Share sheet; fallback to pdf.save().

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { state, showToast } from '../../core/state.js';
import { getBPStatus } from '../pressure/index.js';
import { t } from '../../i18n/index.js';
import { getLocale } from '../../core/utils.js';
import { getDayName } from '../meds/index.js';
import { download as platformDownload } from '../../core/platform.js';
import { calcHealthScore } from '../analytics/health-score.js';

const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

function todayISO() { return new Date().toISOString().split('T')[0]; }

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
    const lbl = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({ date: lbl, pct });
  }
  return result;
}

// ── Block: BP Chart SVG ───────────────────────────────────────────────────────
function buildBPChartSVG(data) {
  if (!data || data.length < 2) {
    return `<div style="text-align:center;color:#94a3b8;font-size:12px;padding:20px;background:#f8fafc;border-radius:8px">Недостатньо даних для графіка (мін. 2 виміри)</div>`;
  }
  const W = 700, H = 170, ml = 40, mr = 12, mt = 14, mb = 34;
  const cw = W - ml - mr, ch = H - mt - mb;
  const vals = [...data.map((m) => m.sys), ...data.map((m) => m.dia)];
  const minV = Math.max(0, Math.min(...vals) - 12);
  const maxV = Math.max(...vals) + 12;
  const yS = (v) => mt + ch - ((v - minV) / (maxV - minV)) * ch;
  const xS = (i) => ml + (i / Math.max(data.length - 1, 1)) * cw;
  const sysPath = data.map((m, i) => `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(m.sys).toFixed(1)}`).join(' ');
  const diaPath = data.map((m, i) => `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(m.dia).toFixed(1)}`).join(' ');
  const step = Math.max(1, Math.floor(data.length / 7));
  const xLabels = data.map((m, i) => {
    if (i % step !== 0 && i !== data.length - 1) return '';
    const d = new Date(m.time);
    return `<text x="${xS(i).toFixed(1)}" y="${H - 5}" text-anchor="middle" font-size="9" fill="#94a3b8">${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}</text>`;
  }).join('');
  const normLines = [
    { v: 140, c: '#f97316', lbl: '140' },
    { v: 90,  c: '#22c55e', lbl: '90' },
  ];
  const nLinesHtml = normLines.map(({ v, c, lbl }) => {
    const y = yS(v);
    if (y < mt || y > H - mb) return '';
    return `<line x1="${ml}" y1="${y.toFixed(1)}" x2="${W - mr}" y2="${y.toFixed(1)}" stroke="${c}" stroke-width="1" stroke-dasharray="5,3" opacity=".45"/>
    <text x="${ml - 4}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="${c}">${lbl}</text>`;
  }).join('');
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <rect width="${W}" height="${H}" fill="#f8fafc" rx="8"/>
    ${nLinesHtml}
    <path d="${sysPath}" fill="none" stroke="#1e40af" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="${diaPath}" fill="none" stroke="#dc2626" stroke-width="2" stroke-linejoin="round"/>
    ${data.map((m, i) => `<circle cx="${xS(i).toFixed(1)}" cy="${yS(m.sys).toFixed(1)}" r="3.5" fill="#1e40af"/><circle cx="${xS(i).toFixed(1)}" cy="${yS(m.dia).toFixed(1)}" r="3" fill="#dc2626"/>`).join('')}
    ${xLabels}
    <circle cx="${ml + 16}" cy="${mt + 9}" r="5" fill="#1e40af"/>
    <text x="${ml + 26}" y="${mt + 13}" font-size="10" fill="#1e40af" font-weight="700">Систолічний</text>
    <circle cx="${ml + 130}" cy="${mt + 9}" r="5" fill="#dc2626"/>
    <text x="${ml + 140}" y="${mt + 13}" font-size="10" fill="#dc2626" font-weight="700">Діастолічний</text>
  </svg>`;
}

// ── Block: Adherence bar chart SVG ────────────────────────────────────────────
function buildAdherenceSVG(adhData) {
  if (!adhData || adhData.length < 3) {
    return `<div style="text-align:center;color:#94a3b8;font-size:12px;padding:12px">Недостатньо даних</div>`;
  }
  const W = 700, H = 110, ml = 0, mt = 8, mb = 24;
  const barW = Math.min(22, Math.floor((W - ml) / adhData.length) - 2);
  const step = Math.max(1, Math.floor(adhData.length / 10));
  const avgPct = adhData.reduce((s, d) => s + d.pct, 0) / adhData.length;
  const bars = adhData.map((d, i) => {
    const color = d.pct >= 80 ? '#22c55e' : d.pct >= 50 ? '#f97316' : '#ef4444';
    const barH = Math.max(2, ((H - mt - mb) * d.pct / 100));
    const x = ml + i * (W - ml) / adhData.length;
    const lbl = i % step === 0 ? `<text x="${(x + barW / 2).toFixed(1)}" y="${H - 5}" text-anchor="middle" font-size="8" fill="#94a3b8">${d.date}</text>` : '';
    return `<rect x="${x.toFixed(1)}" y="${(H - mb - barH).toFixed(1)}" width="${barW}" height="${barH.toFixed(1)}" fill="${color}" opacity=".8" rx="2"/>${lbl}`;
  }).join('');
  const y80 = H - mb - (H - mt - mb) * 80 / 100;
  const adhColor = avgPct >= 80 ? '#166534' : '#991b1b';
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <rect width="${W}" height="${H}" fill="#f8fafc" rx="8"/>
    ${bars}
    <line x1="0" y1="${y80.toFixed(1)}" x2="${W}" y2="${y80.toFixed(1)}" stroke="${adhColor}" stroke-dasharray="5,3" stroke-width="1.5"/>
    <text x="4" y="${(y80 - 4).toFixed(1)}" font-size="9" fill="${adhColor}" font-weight="700">80%</text>
  </svg>`;
}

// ── Helper: section heading ───────────────────────────────────────────────────
function sectionTitle(label, color = '#1e40af') {
  return `<div style="font-size:13px;font-weight:700;border-left:4px solid ${color};padding-left:10px;margin:18px 0 8px">${label}</div>`;
}

// ── Helper: stat card ─────────────────────────────────────────────────────────
function statCard(title, value, subtitle, bg, border, textColor) {
  return `<div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:12px;text-align:center;flex:1">
    <div style="font-size:9px;font-weight:700;color:${textColor};text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${title}</div>
    <div style="font-size:22px;font-weight:900;color:${textColor};line-height:1.1">${value}</div>
    ${subtitle ? `<div style="font-size:9px;color:${textColor};opacity:.7;margin-top:3px">${subtitle}</div>` : ''}
  </div>`;
}

// ── Build full 8-block HTML report ───────────────────────────────────────────
function buildReportHTML({ measurements, sections, settings, dateStr, periodLabel, loc, izScore }) {
  const name   = settings.name   || '—';
  const age    = settings.age    || '—';
  const phone  = settings.phone  || '';
  const email  = settings.email  || '';
  const ePhone = settings.emergencyPhone || '';
  const eName  = settings.emergencyName  || '';
  const std    = (settings.bpStandard === 'AHA2017') ? 'AHA 2017' : 'ESC 2024';

  // Patient data
  const h = parseFloat(settings.height) || 0;
  const w = parseFloat(settings.weight) || 0;
  let bmiStr = '—';
  if (h > 0 && w > 0) {
    const bmiVal = (w / ((h / 100) ** 2)).toFixed(1);
    let bmiCat = bmiVal < 18.5 ? 'Недовага' : bmiVal < 25 ? 'Норма' : bmiVal < 30 ? 'Надлишок' : 'Ожиріння';
    bmiStr = `${bmiVal} (${bmiCat})`;
  }
  const genderMap = { male: 'Чоловіча', female: 'Жіноча' };
  const gender = genderMap[settings.gender] || '—';

  const normalSys = settings.normalSys ? `${settings.normalSys}/${settings.normalDia || '—'}` : '—';

  // Stats from measurements
  const sysList  = measurements.map((m) => m.sys).filter(Boolean);
  const diaList  = measurements.map((m) => m.dia).filter(Boolean);
  const pulList  = measurements.map((m) => m.pulse).filter(Boolean);
  const aS = avg(sysList)  ?? '—';
  const aD = avg(diaList)  ?? '—';
  const aP = avg(pulList)  ?? '—';
  const maxSys = sysList.length ? Math.max(...sysList) : '—';
  const minSys = sysList.length ? Math.min(...sysList) : '—';

  // Chart data — chronological order
  const chartData = measurements.slice().sort((a, b) => new Date(a.time) - new Date(b.time));

  // Journal rows (last 30, newest first)
  const tableRows = measurements.slice().sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 30).map((m, idx) => {
    const d = new Date(m.time);
    const st = getBPStatus(m.sys, m.dia);
    const cleanLbl = st.label.replace(/[^\wа-яёіїєА-ЯЁІЇЄ ]/gi, '').trim();
    const bg = idx % 2 === 0 ? '#fff' : '#f8fafc';
    return `<tr style="background:${bg}">
      <td style="padding:5px 7px">${d.toLocaleDateString(loc)}</td>
      <td style="padding:5px 7px">${d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}</td>
      <td style="padding:5px 7px;font-weight:700">${m.sys}/${m.dia}</td>
      <td style="padding:5px 7px">${m.pulse || '—'}</td>
      <td style="padding:5px 7px;font-size:10px">${cleanLbl}</td>
      <td style="padding:5px 7px;color:#64748b;font-size:10px">${m.note || ''}</td>
    </tr>`;
  }).join('');

  // Medications
  const activePills = (state.pills || []).filter((p) => p.days !== 'date' || (p.date && p.date >= todayISO()));
  const pillRows = activePills.map((p, idx) => {
    const bg = idx % 2 === 0 ? '#fff' : '#f5f3ff';
    return `<tr style="background:${bg}">
      <td style="padding:5px 7px;font-weight:600">${p.name}</td>
      <td style="padding:5px 7px">${p.dose}</td>
      <td style="padding:5px 7px">${p.time || '—'}</td>
      <td style="padding:5px 7px;font-size:10px">${getDayName(p)}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" style="padding:10px;color:#94a3b8;text-align:center;font-size:11px">Немає активних призначень</td></tr>`;

  // Adherence
  const adhData = computeDailyAdherence(30);
  const avgAdh  = adhData.length ? Math.round(adhData.reduce((s, d) => s + d.pct, 0) / adhData.length) : null;
  const adhColor = (avgAdh ?? 0) >= 80 ? '#166534' : '#991b1b';
  const adhBg    = (avgAdh ?? 0) >= 80 ? '#f0fdf4' : '#fef2f2';

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1e293b;background:#fff;padding:28px 32px;width:794px;box-sizing:border-box">

  <!-- БЛОК 1: Шапка -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e40af;padding-bottom:14px;margin-bottom:20px">
    <div>
      <div style="font-size:24px;font-weight:900;color:#1e40af;letter-spacing:-.5px">Health<span style="color:#dc2626">Pro</span></div>
      <div style="font-size:13px;font-weight:700;color:#374151;margin-top:2px">Звіт для лікаря</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">Стандарт: ${std} · Сформовано: ${dateStr}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#64748b;background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0">
      <div style="font-weight:900;font-size:14px;color:#1e293b;margin-bottom:2px">${name}</div>
      <div>Вік: ${age}${age !== '—' ? ' р.' : ''} · Стать: ${gender}</div>
      ${phone ? `<div>${phone}</div>` : ''}
      ${email ? `<div style="color:#6366f1">${email}</div>` : ''}
      <div style="margin-top:4px;font-size:10px;color:#94a3b8">Період: ${periodLabel}</div>
    </div>
  </div>

  <!-- БЛОК 2: Пацієнт -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px">
      <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Дані пацієнта</div>
      <table style="width:100%;font-size:11px;border-collapse:collapse">
        <tr><td style="color:#64748b;padding:2px 0;width:50%">Зріст / Вага:</td><td><b>${h ? h + ' см / ' + w + ' кг' : '—'}</b></td></tr>
        <tr><td style="color:#64748b;padding:2px 0">ІМТ:</td><td><b>${bmiStr}</b></td></tr>
        <tr><td style="color:#64748b;padding:2px 0">Особиста норма:</td><td><b>${normalSys} мм рт. ст.</b></td></tr>
      </table>
    </div>
    <div style="background:#fef2f2;border:1px solid #fee2e2;border-radius:10px;padding:12px">
      <div style="font-size:10px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Екстрений контакт</div>
      ${ePhone || eName ? `
        <div style="font-size:13px;font-weight:700;color:#1e293b">${eName || '—'}</div>
        <div style="font-size:12px;color:#dc2626;margin-top:2px">${ePhone || '—'}</div>
        <div style="font-size:10px;color:#64748b;margin-top:4px">Сповіщення при тиску ≥ 180/120</div>
      ` : `<div style="font-size:11px;color:#94a3b8">Не вказано в профілі</div>`}
    </div>
  </div>

  <!-- БЛОК 3: Статистика -->
  <div style="display:flex;gap:10px;margin-bottom:20px">
    ${statCard('Середній тиск', `${aS}/${aD}`, 'мм рт. ст.', '#eff6ff', '#bfdbfe', '#1e40af')}
    ${statCard('Середній пульс', `${aP}`, 'уд/хв', '#f0fdf4', '#bbf7d0', '#166534')}
    ${statCard('Індекс здоров\'я', izScore !== null ? izScore : '—', 'ІЗ (0–100)', '#faf5ff', '#ddd6fe', '#6d28d9')}
    ${statCard('Макс./Мін. сист.', `${maxSys}/${minSys}`, `(${measurements.length} вим.)`, '#fefce8', '#fef08a', '#854d0e')}
  </div>

  ${sections.chart !== false ? `
  <!-- БЛОК 4: Графік -->
  ${sectionTitle('Динаміка тиску — графік по вимірах')}
  <div style="margin-bottom:18px">${buildBPChartSVG(chartData)}</div>
  ` : ''}

  ${sections.journal !== false && tableRows ? `
  <!-- БЛОК 5: Журнал вимірів -->
  ${sectionTitle('Журнал вимірів (останні 30)')}
  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:18px">
    <thead><tr style="background:#1e40af;color:#fff">
      <th style="padding:6px 7px;text-align:left;font-weight:700">Дата</th>
      <th style="padding:6px 7px;text-align:left;font-weight:700">Час</th>
      <th style="padding:6px 7px;text-align:left;font-weight:700">Тиск</th>
      <th style="padding:6px 7px;text-align:left;font-weight:700">Пульс</th>
      <th style="padding:6px 7px;text-align:left;font-weight:700">Категорія</th>
      <th style="padding:6px 7px;text-align:left;font-weight:700">Нотатка</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  ` : ''}

  ${sections.meds !== false ? `
  <!-- БЛОК 6: Ліки -->
  ${sectionTitle('Ліки — активні призначення', '#7c3aed')}
  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:18px">
    <thead><tr style="background:#7c3aed;color:#fff">
      <th style="padding:6px 7px;text-align:left;font-weight:700">Препарат</th>
      <th style="padding:6px 7px;text-align:left;font-weight:700">Дозування</th>
      <th style="padding:6px 7px;text-align:left;font-weight:700">Час</th>
      <th style="padding:6px 7px;text-align:left;font-weight:700">Розклад</th>
    </tr></thead>
    <tbody>${pillRows}</tbody>
  </table>
  ` : ''}

  ${sections.adherence !== false && adhData.length >= 3 ? `
  <!-- БЛОК 7: Прийом ліків -->
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
    ${sectionTitle('Прийом ліків — 30 днів', '#7c3aed')}
    <div style="background:${adhBg};border-radius:6px;padding:3px 12px;font-size:14px;font-weight:900;color:${adhColor};border:1px solid ${adhColor}33;margin-top:14px">${avgAdh}%</div>
  </div>
  <div style="margin-bottom:18px">${buildAdherenceSVG(adhData)}</div>
  ` : ''}

  ${sections.doctor !== false ? `
  <!-- БЛОК 8: Блок лікаря -->
  ${sectionTitle('Блок лікаря', '#0f766e')}
  <div style="border:1.5px dashed #cbd5e1;border-radius:10px;padding:16px;margin-bottom:18px;background:#f8fafc">
    <div style="font-size:10px;color:#94a3b8;margin-bottom:8px">Нотатки та висновки лікаря:</div>
    <div style="height:60px"></div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0">
      <div style="font-size:10px;color:#94a3b8">Лікар: _________________________</div>
      <div style="font-size:10px;color:#94a3b8">Підпис: ________________ Дата: _________</div>
    </div>
  </div>
  ` : ''}

  <!-- Дисклеймер — завжди -->
  <div style="background:#fef2f2;border:1px solid #fee2e2;padding:10px 14px;border-radius:8px;font-size:9px;color:#991b1b;line-height:1.7;margin-top:8px">
    <b>Важливо:</b> Цей звіт має виключно інформаційний характер і не є медичним висновком. Для діагностики та лікування зверніться до лікаря. Показники тиску оцінені відповідно до стандарту ${std}.
  </div>
</div>`;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateDoctorReport(measurements, sections = {}) {
  if (!measurements || !measurements.length) {
    showToast(t('j-no-data') || 'Немає даних за вибраний період');
    return;
  }

  showToast(t('e-doctor-pdf-prep') || 'Генерація PDF...', 6000);

  const loc      = getLocale();
  const settings = state.settings || {};

  // Period label from date range
  const sorted = measurements.slice().sort((a, b) => new Date(a.time) - new Date(b.time));
  const dateFrom = new Date(sorted[0].time);
  const dateTo   = new Date(sorted[sorted.length - 1].time);
  const fmt = (d) => `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  const periodLabel = `${fmt(dateFrom)} – ${fmt(dateTo)}`;

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr  = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
  const fileName = `HealthPro_Doctor_${todayISO()}.pdf`;

  // IZ score — re-use current calcHealthScore (uses state.measurements)
  let izScore = null;
  try {
    const hs = calcHealthScore();
    izScore = hs?.score ?? null;
  } catch { /* noop */ }

  const html = buildReportHTML({ measurements, sections, settings, dateStr, periodLabel, loc, izScore });

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    await new Promise((r) => setTimeout(r, 350));

    const canvas = await html2canvas(container.firstElementChild, {
      scale: 1.6,
      useCORS: false,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.93);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH  = (canvas.height / canvas.width) * pageW;

    let position  = 0;
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
