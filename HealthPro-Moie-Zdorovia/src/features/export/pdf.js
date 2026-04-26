// PDF generation via html2canvas + jsPDF (npm modules, bundled by Vite).

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { state, showToast, today } from '../../core/state.js';
import { PDF_LABELS } from '../../i18n/index.js';
import { getBPStatus } from '../pressure/index.js';
import { DRUG_DB, isPillDueToday, fmtPillDate } from '../meds/index.js';
import { calcHealthScore, calcBMI } from '../analytics/index.js';
import { LOGO } from './logo.js';

const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

let _showPage = null;
export function setShowPage(fn) { _showPage = fn; }

export async function exportPDF() {
  const isRu = state.lang === 'ru';
  showToast(isRu ? '⏳ Формирование отчёта для врача…' : '⏳ Формування звіту для лікаря…', 8000);

  const printEl = document.getElementById('printContent');
  const pagePrint = document.getElementById('page-print');
  const measurements = state.measurements;
  const pills = state.pills;
  const pillsTaken = state.pillsTaken;
  const settings = state.settings;
  const lang = state.lang;

  // 1. Capture chart BEFORE switching pages
  const prevTab = document.querySelector('.nav-tab.active')?.id?.replace('tab-', '');
  if (_showPage) _showPage('pressure');
  await new Promise((r) => setTimeout(r, 400));
  const chartCanvas = document.getElementById('bpChart');
  let chartImg = null;
  if (chartCanvas && measurements.length >= 2) {
    try {
      const tmp = document.createElement('canvas');
      tmp.width = chartCanvas.width; tmp.height = chartCanvas.height;
      const tctx = tmp.getContext('2d');
      tctx.fillStyle = '#ffffff'; tctx.fillRect(0, 0, tmp.width, tmp.height);
      tctx.drawImage(chartCanvas, 0, 0);
      chartImg = tmp.toDataURL('image/png');
    } catch (e) { console.warn('chart capture', e); }
  }

  // 2. Prepare data
  const last7 = measurements.filter((m) => new Date(m.time) > new Date(Date.now() - 7 * 864e5));
  const aS = last7.length ? avg(last7.map((m) => m.sys)) : '—';
  const aD = last7.length ? avg(last7.map((m) => m.dia)) : '—';
  const aPulse = last7.filter((m) => m.pulse).length ? avg(last7.filter((m) => m.pulse).map((m) => m.pulse)) : '—';
  const score = measurements.length ? calcHealthScore() : '—';
  const bmi = calcBMI();

  const isRuPdf = lang === 'ru';
  const PDF_L = (PDF_LABELS[isRuPdf ? 'ru' : 'uk']) || {};
  const PDF_LOCALE = isRuPdf ? 'ru-UA' : 'uk-UA';

  function pillDayLabel(p) {
    if (typeof p === 'string') p = { days: p };
    if (p.days === 'daily') return PDF_L.daily;
    if (p.days === 'date') return p.date ? fmtPillDate(p.date) : PDF_L.dateW;
    return PDF_L.dayMap[p.days] || p.days;
  }

  function bpColor(sys, dia) {
    if (sys >= 180 || dia >= 120) return '#dc2626';
    if (sys >= 160 || dia >= 100) return '#ea580c';
    if (sys >= 140 || dia >= 90) return '#d97706';
    if (sys < 90 || dia < 60) return '#2563eb';
    return '#16a34a';
  }

  const todayDate = today();
  const duePillsToday = pills.filter(isPillDueToday);
  const takenToday = duePillsToday.filter((p) => pillsTaken[todayDate]?.[p.id]).length;

  // 3. Build report HTML
  printEl.innerHTML = `
    <div id="pdf-wrapper" style="width:750px;padding:40px 40px 30px;background:#fff;color:#1a1a1a;font-family:Arial,sans-serif;line-height:1.5;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1e40af;padding-bottom:14px;margin-bottom:22px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="${LOGO}" style="width:52px;height:52px;border-radius:8px;">
          <div>
            <div style="font-size:24px;font-weight:800;color:#1e40af;line-height:1;">HealthPro</div>
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;letter-spacing:.5px;">${PDF_L.subtitle}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:20px;font-weight:800;letter-spacing:-0.3px;">${PDF_L.title}</div>
          <div style="font-size:12px;color:#64748b;">${PDF_L.date}: ${new Date().toLocaleDateString(PDF_LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:22px;border:1px solid #e2e8f0;">
        <div>
          <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:4px;letter-spacing:.5px;">${PDF_L.patient}</div>
          <div style="font-size:17px;font-weight:700;">${settings.name || PDF_L.notSet}</div>
          <div style="font-size:13px;color:#475569;margin-top:3px;">${PDF_L.age}: <b>${settings.age || '—'}</b> ${PDF_L.years} &nbsp;|&nbsp; ${PDF_L.sex}: <b>${settings.gender === 'm' ? PDF_L.male : settings.gender === 'f' ? PDF_L.female : '—'}</b></div>
          <div style="font-size:13px;color:#475569;">${PDF_L.height}: <b>${settings.height || '—'}</b> ${PDF_L.cm} &nbsp;|&nbsp; ${PDF_L.weight}: <b>${settings.weight || '—'}</b> ${PDF_L.kg} &nbsp;|&nbsp; ${PDF_L.bmi}: <b>${bmi || '—'}</b></div>
        </div>
        <div>
          <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:4px;letter-spacing:.5px;">${PDF_L.contacts}</div>
          <div style="font-size:13px;color:#475569;">${PDF_L.phoneShort}: <b>${settings.phone || '—'}</b></div>
          <div style="font-size:13px;color:#475569;">${PDF_L.email}: <b>${settings.email || '—'}</b></div>
          ${settings.emergencyName || settings.emergencyPhone ? `<div style="font-size:13px;color:#dc2626;margin-top:4px;">${PDF_L.emrg}: <b>${settings.emergencyName || ''} ${settings.emergencyPhone || ''}</b></div>` : ''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px;">
        <div style="background:#eff6ff;padding:12px;border-radius:8px;text-align:center;border:1px solid #bfdbfe;"><div style="font-size:10px;color:#1e40af;font-weight:700;text-transform:uppercase;margin-bottom:4px;">${PDF_L.bp7}</div><div style="font-size:20px;font-weight:800;color:#1e40af;">${aS}/${aD}</div></div>
        <div style="background:#f0fdf4;padding:12px;border-radius:8px;text-align:center;border:1px solid #bbf7d0;"><div style="font-size:10px;color:#166534;font-weight:700;text-transform:uppercase;margin-bottom:4px;">${PDF_L.pulse7}</div><div style="font-size:20px;font-weight:800;color:#166534;">${aPulse}</div></div>
        <div style="background:#fefce8;padding:12px;border-radius:8px;text-align:center;border:1px solid #fef08a;"><div style="font-size:10px;color:#854d0e;font-weight:700;text-transform:uppercase;margin-bottom:4px;">${PDF_L.hi}</div><div style="font-size:20px;font-weight:800;color:#854d0e;">${score}/100</div></div>
        <div style="background:#fff7ed;padding:12px;border-radius:8px;text-align:center;border:1px solid #fed7aa;"><div style="font-size:10px;color:#9a3412;font-weight:700;text-transform:uppercase;margin-bottom:4px;">${PDF_L.totalM}</div><div style="font-size:20px;font-weight:800;color:#9a3412;">${measurements.length}</div></div>
      </div>
      <div style="margin-bottom:22px;">
        <h3 style="font-size:14px;font-weight:700;border-left:4px solid #1e40af;padding-left:10px;margin-bottom:10px;color:#1e293b;">${PDF_L.bpDyn}</h3>
        ${chartImg ? `<img src="${chartImg}" style="width:100%;max-height:180px;object-fit:contain;border-radius:6px;border:1px solid #e2e8f0;">` : `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:20px;text-align:center;color:#94a3b8;font-size:12px;">${PDF_L.chartNeed}</div>`}
      </div>
      <h3 style="font-size:14px;font-weight:700;border-left:4px solid #1e40af;padding-left:10px;margin-bottom:10px;color:#1e293b;">${PDF_L.bpJournal}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:22px;">
        <thead><tr style="background:#1e40af;color:#fff;text-align:left;">
          <th style="padding:7px 10px;">${PDF_L.colDate}</th>
          <th style="padding:7px 10px;">${PDF_L.colBP}</th>
          <th style="padding:7px 10px;">${PDF_L.colPulse}</th>
          <th style="padding:7px 10px;">${PDF_L.colStatus}</th>
          <th style="padding:7px 10px;">${PDF_L.colNote}</th>
        </tr></thead>
        <tbody>${measurements.slice(0, 20).map((m, i) => {
          const color = bpColor(m.sys, m.dia);
          const isCrisis = m.sys >= 180 || m.dia >= 120;
          const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
          const rowBg = isCrisis ? '#fef2f2' : bg;
          const rowBorder = isCrisis ? '2px solid #dc2626' : '1px solid #e2e8f0';
          const st = getBPStatus(m.sys, m.dia).label.replace(/[^\wа-яёіїєА-ЯЁІЇЄ ]/g, '').trim();
          return `<tr style="background:${rowBg};">
            <td style="padding:6px 10px;border-bottom:${rowBorder};color:#475569;">${new Date(m.time).toLocaleString(PDF_LOCALE, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
            <td style="padding:6px 10px;border-bottom:${rowBorder};font-weight:800;color:${color};font-size:13px;">${m.sys}/${m.dia}${isCrisis ? ' ⚠' : ''}  </td>
            <td style="padding:6px 10px;border-bottom:${rowBorder};">${m.pulse || '—'}</td>
            <td style="padding:6px 10px;border-bottom:${rowBorder};color:${color};font-weight:600;">${st}</td>
            <td style="padding:6px 10px;border-bottom:${rowBorder};color:#94a3b8;">${m.note || ''}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      <h3 style="font-size:14px;font-weight:700;border-left:4px solid #7c3aed;padding-left:10px;margin-bottom:10px;color:#1e293b;">${PDF_L.therapy}</h3>
      ${pills.length === 0 ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px;color:#94a3b8;font-size:12px;margin-bottom:22px;">${PDF_L.noPills}</div>` : `
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:22px;">
        <thead><tr style="background:#7c3aed;color:#fff;text-align:left;">
          <th style="padding:7px 10px;">${PDF_L.drug}</th>
          <th style="padding:7px 10px;">${PDF_L.dose}</th>
          <th style="padding:7px 10px;">${PDF_L.timeT}</th>
          <th style="padding:7px 10px;">${PDF_L.schedule}</th>
          <th style="padding:7px 10px;">${PDF_L.todayStatus}</th>
        </tr></thead>
        <tbody>${pills.map((p, i) => {
          const takenToday2 = !!pillsTaken[todayDate]?.[p.id];
          const isDueToday = isPillDueToday(p);
          const statusBg = takenToday2 ? '#f0fdf4' : isDueToday ? '#fef2f2' : '#f8fafc';
          const statusColor = takenToday2 ? '#16a34a' : isDueToday ? '#dc2626' : '#94a3b8';
          const statusText = takenToday2 ? PDF_L.taken : isDueToday ? PDF_L.notTaken : PDF_L.notSched;
          const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
          const drugKey = Object.keys(DRUG_DB).find((k) => p.name.toLowerCase().includes(k));
          const maxDoseInfo = drugKey ? ` (макс: ${DRUG_DB[drugKey].max} ${DRUG_DB[drugKey].unit})` : '';
          return `<tr style="background:${bg};">
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;">${p.name}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${p.dose || '—'}${maxDoseInfo ? `<span style="font-size:10px;color:#94a3b8;">${maxDoseInfo}</span>` : ''}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e40af;">${p.time}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${pillDayLabel(p)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;background:${statusBg};color:${statusColor};font-weight:600;">${statusText}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      <div style="background:#f3f0ff;border:1px solid #ddd6fe;border-radius:6px;padding:10px 14px;font-size:11px;color:#5b21b6;margin-bottom:22px;">${PDF_L.takenToday}: <b>${takenToday}/${duePillsToday.length}</b> ${PDF_L.pillsOf}</div>`}
      <div style="border:1px dashed #cbd5e1;padding:16px;border-radius:8px;margin-bottom:20px;">
        <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:36px;">${PDF_L.docNotes}</div>
        <div style="border-top:1px solid #e2e8f0;padding-top:6px;display:flex;justify-content:space-between;align-items:flex-end;">
          <span style="font-size:10px;color:#94a3b8;">${PDF_L.examDate}: _____________</span>
          <span style="font-size:10px;color:#94a3b8;">${PDF_L.sigStamp}: _____________</span>
        </div>
      </div>
      <div style="background:#fef2f2;border:1px solid #fee2e2;padding:12px 16px;border-radius:8px;font-size:10px;color:#991b1b;line-height:1.6;">
        <b>${PDF_L.important}</b>${PDF_L.disclaimerTxt}<b>${PDF_L.notDiag}</b>${PDF_L.diagTail}
      </div>
    </div>`;

  // 4. Render & save
  pagePrint.style.display = 'block';
  pagePrint.style.position = 'fixed';
  pagePrint.style.left = '-9999px';
  pagePrint.style.top = '0';
  pagePrint.style.zIndex = '-1';

  try {
    await new Promise((r) => setTimeout(r, 300));
    const wrapper = document.getElementById('pdf-wrapper');
    const canvas = await html2canvas(wrapper, {
      scale: 2, useCORS: true, allowTaint: true,
      backgroundColor: '#ffffff', logging: false,
      width: 750, windowWidth: 830,
    });
    const doc = new jsPDF('p', 'mm', 'a4');
    const pdfW = doc.internal.pageSize.getWidth();
    const pdfH = doc.internal.pageSize.getHeight();
    const pageHeightPx = Math.floor((pdfH / pdfW) * canvas.width);
    let srcY = 0, pageNum = 0;
    while (srcY < canvas.height) {
      if (pageNum > 0) doc.addPage();
      const sliceH = Math.min(pageHeightPx, canvas.height - srcY);
      const slice = document.createElement('canvas');
      slice.width = canvas.width; slice.height = sliceH;
      slice.getContext('2d').drawImage(canvas, 0, -srcY);
      const sliceMmH = (sliceH / canvas.width) * pdfW;
      doc.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfW, sliceMmH);
      doc.setFontSize(7); doc.setTextColor(148, 163, 184);
      const pageLbl = isRu
        ? `HealthPro v4.0 · ${today()} · Стр. ${pageNum + 1} · Не является медицинским диагнозом`
        : `HealthPro v4.0 · ${today()} · Стор. ${pageNum + 1} · Не є медичним діагнозом`;
      doc.text(pageLbl, 10, pdfH - 3);
      srcY += pageHeightPx; pageNum++;
    }
    const fname = `HealthReport_${(settings.name || 'Patient').replace(/\s/g, '_')}_${today()}.pdf`;
    doc.save(fname);
    showToast((isRu ? 'Отчёт сохранён: ' : 'Звіт збережено: ') + fname);
  } catch (err) {
    console.error('[PDF]', err);
    showToast((isRu ? 'Ошибка генерации PDF: ' : 'Помилка генерації PDF: ') + err.message);
  } finally {
    pagePrint.style.display = 'none';
    printEl.innerHTML = '';
    if (prevTab && _showPage) _showPage(prevTab);
  }
}
