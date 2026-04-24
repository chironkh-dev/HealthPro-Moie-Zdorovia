// Pure helpers for the BP/Pulse chart — no DOM access, no module-level state.

export const CHART_COLORS = {
  sys:        '#ef4444',
  sysGlow:    'rgba(239,68,68,.4)',
  dia:        '#3b82f6',
  diaGlow:    'rgba(59,130,246,.4)',
  pulse:      '#10b981',
  pulseGlow:  'rgba(16,185,129,.4)',
  grid:       'rgba(99,140,255,.07)',
  axisText:   '#4a5568',
};

export const CHART_PADDING = { l: 34, r: 8, t: 10, b: 22 };

export function computeScale(data, showPulse) {
  const values = data.flatMap((d) => [d.sys, d.dia, ...(showPulse && d.pulse ? [d.pulse] : [])]).filter(Boolean);
  return {
    min: Math.max(40, Math.min(...values) - 12),
    max: Math.max(...values) + 12,
  };
}

export function makeProjectors({ width, height, padding, count, scale }) {
  const gW = width - padding.l - padding.r;
  const gH = height - padding.t - padding.b;
  return {
    gW,
    gH,
    xP: (i) => padding.l + (count < 2 ? gW / 2 : (i / (count - 1)) * gW),
    yP: (v) => padding.t + gH - ((v - scale.min) / (scale.max - scale.min)) * gH,
  };
}

export function drawGrid(ctx, { width, height, padding, scale }) {
  ctx.setLineDash([]);
  for (let i = 0; i <= 4; i++) {
    const yy = padding.t + (i / 4) * (height - padding.t - padding.b);
    ctx.beginPath();
    ctx.strokeStyle = CHART_COLORS.grid;
    ctx.lineWidth = 1;
    ctx.moveTo(padding.l, yy);
    ctx.lineTo(width - padding.r, yy);
    ctx.stroke();
    ctx.fillStyle = CHART_COLORS.axisText;
    ctx.font = '600 9px Inter,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(scale.max - (i / 4) * (scale.max - scale.min)), padding.l - 3, yy + 3);
  }
}

export function drawSeries(ctx, { data, getValue, color, glow, xP, yP, isDark }) {
  const pts = data
    .map((d, i) => {
      const v = getValue(d);
      return v != null ? { x: xP(i), y: yP(v), v, i } : null;
    })
    .filter(Boolean);
  if (pts.length < 1) return pts;

  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();

  pts.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#080d1a' : '#ffffff';
    ctx.fill();
  });

  return pts;
}

export function drawXLabels(ctx, { data, height, xP, formatDate }) {
  ctx.fillStyle = CHART_COLORS.axisText;
  ctx.font = '600 9px Inter,sans-serif';
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(data.length / 5));
  data.forEach((d, i) => {
    if (i % step === 0 || i === data.length - 1) {
      ctx.fillText(formatDate(d.time), xP(i), height - 4);
    }
  });
}
