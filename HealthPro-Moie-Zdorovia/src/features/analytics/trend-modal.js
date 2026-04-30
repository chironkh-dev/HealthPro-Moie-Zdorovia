// 14-day trend modal: chart + summary cards.

import { state } from '../../core/state.js';
import { getBPStatus } from '../pressure/index.js';
import { formatDate } from '../../core/utils.js';
import { t } from '../../i18n/index.js';

const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

export function openTrendModal() {
  const modal = document.getElementById('trendModal');
  if (!modal) return;
  modal.classList.add('show');
  const all = state.measurements;
  const statsEl = document.getElementById('trendModalStats');
  if (!all.length) {
    if (statsEl) statsEl.innerHTML = `<p style="color:var(--text2);font-size:13px">${t('a-score-no-data')}</p>`;
    return;
  }
  const last14 = all.slice(0, 14).reverse();
  const aS = avg(last14.map((m) => m.sys));
  const aD = avg(last14.map((m) => m.dia));
  if (statsEl) {
    statsEl.innerHTML = `<div class="bento" style="margin-bottom:0"><div class="bento-card bc-blue"><div class="b-lbl">${t('a-trend-avg-14')}</div><div class="b-val">${aS || '—'}/${aD || '—'}</div></div><div class="bento-card bc-${aS && aS < 140 ? 'green' : 'red'}"><div class="b-lbl">${t('a-trend-status')}</div><div class="b-val sm">${aS && aD ? getBPStatus(aS, aD).label.replace(/[🚨▲⚠✓⬇️]/g, '').trim() : '—'}</div></div></div>`;
  }
  setTimeout(() => {
    const canvas = document.getElementById('trendChart');
    if (!canvas || !all.length) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 300;
    const H = 180;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);
    const data = all.slice(0, 20).reverse();
    if (data.length < 2) return;
    const pad = { l: 36, r: 10, t: 10, b: 22 };
    const gW = W - pad.l - pad.r;
    const gH = H - pad.t - pad.b;
    const all2 = data.flatMap((d) => [d.sys, d.dia]);
    const minV = Math.max(40, Math.min(...all2) - 12);
    const maxV = Math.max(...all2) + 12;
    const xP = (i) => pad.l + (i / (data.length - 1)) * gW;
    const yP = (v) => pad.t + gH - ((v - minV) / (maxV - minV)) * gH;
    for (let i = 0; i <= 4; i++) {
      const yy = pad.t + (i / 4) * gH;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(99,140,255,.07)';
      ctx.lineWidth = 1;
      ctx.moveTo(pad.l, yy);
      ctx.lineTo(W - pad.r, yy);
      ctx.stroke();
      ctx.fillStyle = '#4a5568';
      ctx.font = '600 9px Inter,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxV - (i / 4) * (maxV - minV)), pad.l - 3, yy + 3);
    }
    function dL(color, get) {
      const pts = data.map((d, i) => ({ x: xP(i), y: yP(get(d)) }));
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    }
    dL('#ef4444', (d) => d.sys);
    dL('#3b82f6', (d) => d.dia);
    ctx.fillStyle = '#4a5568';
    ctx.font = '600 9px Inter,sans-serif';
    ctx.textAlign = 'center';
    data.forEach((d, i) => {
      if (i % 3 === 0 || i === data.length - 1) ctx.fillText(formatDate(d.time), xP(i), H - 4);
    });
  }, 100);
}

export function closeTrendModal(e) {
  const modal = document.getElementById('trendModal');
  if (!modal) return;
  if (e && e.target !== modal) return;
  modal.classList.remove('show');
}
