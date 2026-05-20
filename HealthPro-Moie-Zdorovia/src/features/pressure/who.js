import { state, showToast } from '../../core/state.js';
import { t } from '../../i18n/index.js';
import { WHO_INFO_T } from '../../i18n/who.i18n.js';

export function getWHOCategory(s, d) {
  const std = state.settings?.bpStandard || 'ESC2024';
  if (std === 'AHA2017') {
    if (s < 120 && d < 80)  return { label: t('w-cat-optimal'),     sub: '<120/80 мм рт.ст.',  c: 'var(--green)', key: 'optimal' };
    if (s < 130 && d < 80)  return { label: t('n-bp-aha-elevated'), sub: '120–129/<80',         c: 'var(--amber)', key: 'high-normal' };
    if (s < 140 && d < 90)  return { label: t('n-bp-aha-ht1'),      sub: '130–139/80–89',       c: 'var(--amber)', key: 'ht1' };
    if (s < 180 && d < 110) return { label: t('n-bp-aha-ht2'),      sub: '140–179/90–109',      c: 'var(--red)',   key: 'ht2' };
    return                         { label: t('w-cat-ht3'),          sub: '≥180/110',            c: 'var(--rose)',  key: 'ht3' };
  }
  if (s < 120 && d < 80) return { label: t('w-cat-optimal'),     sub: '<120/80 мм рт.ст.', c: 'var(--green)', key: 'optimal' };
  if (s < 130 && d < 85) return { label: t('w-cat-normal'),      sub: '120–129/80–84',     c: 'var(--green)', key: 'normal' };
  if (s < 140 && d < 90) return { label: t('w-cat-high-normal'), sub: '130–139/85–89',     c: 'var(--amber)', key: 'high-normal' };
  if (s < 160 && d < 100) return { label: t('w-cat-ht1'),         sub: '140–159/90–99',     c: 'var(--amber)', key: 'ht1' };
  if (s < 180 && d < 110) return { label: t('w-cat-ht2'),         sub: '160–179/100–109',   c: 'var(--red)',   key: 'ht2' };
  return                        { label: t('w-cat-ht3'),         sub: '≥180/110',           c: 'var(--rose)',  key: 'ht3' };
}

// Re-export for legacy imports (analytics/index.js may reference it).
export const WHO_INFO = WHO_INFO_T.uk;

export function openWHOInfo() {
  if (!state.measurements.length) {
    showToast(t('w-toast-no-data'));
    return;
  }
  const last = state.measurements[0];
  const who = getWHOCategory(last.sys, last.dia);
  const dict = WHO_INFO_T[state.lang] || WHO_INFO_T.uk;
  const std = state.settings?.bpStandard || 'ESC2024';
  const ahaKey = std === 'AHA2017' ? `aha_${who.key}` : null;
  const info = (ahaKey && dict[ahaKey]) ? dict[ahaKey] : dict[who.key];
  if (!info) return;
  // WHO-1: динамічний заголовок залежно від обраного стандарту
  const titleEl = document.getElementById('t-who-modal');
  if (titleEl) {
    titleEl.textContent = std === 'AHA2017'
      ? 'Класифікація тиску AHA 2017'
      : 'Класифікація тиску ESC 2024';
  }

  const el = document.getElementById('whoModalContent');
  if (!el) return;
  el.innerHTML = `
    <div style="padding:12px;border-radius:12px;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.2);margin-bottom:12px">
      <div style="font-size:16px;font-weight:800;color:${who.c};margin-bottom:4px">${info.title}</div>
      <div style="font-size:12px;color:var(--text2);line-height:1.6">${info.body}</div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">${t('w-recos')}</div>
    ${info.advice.map((a) => `<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:7px;font-size:12px;color:var(--text2);line-height:1.5"><span style="color:var(--blue2);font-size:14px;flex-shrink:0">›</span>${a}</div>`).join('')}
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin:12px 0 8px">${t('w-links')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${info.links.map((l) => `<a href="${l.u}" target="_blank" class="reco-link">${l.l}</a>`).join('')}</div>`;
  document.getElementById('whoModal').classList.add('show');
}
