// Meds feature: pill scheduling, validation, rendering, taken-toggling.
// Shares state with the rest of the app via src/core/state.js.

import { state, saveData, showToast, today, emit } from '../../core/state.js';
import { t, tt } from '../../i18n/index.js';
import { DRUG_DB } from './drug-db.js';

export { DRUG_DB };

// ─── Day helpers ───
export function fmtPillDate(iso) {
  if (!iso) return '';
  const [y, mo, da] = iso.split('-');
  return `${da}.${mo}.${y.slice(2)}`;
}

export function isPillDueToday(p) {
  if (!p || p.days == null) return false;
  if (p.days === 'daily') return true;
  if (p.days === 'date') return !!p.date && p.date === today();
  // legacy support for old saved pills (weekdays/mon..sun); also comma-separated like 'mon,wed'
  const d = new Date().getDay(); // 0=Sun
  const m = { weekdays: d >= 1 && d <= 5, mon: d === 1, tue: d === 2, wed: d === 3, thu: d === 4, fri: d === 5, sat: d === 6, sun: d === 0 };
  if (typeof p.days === 'string' && p.days.includes(',')) {
    return p.days.split(',').some((k) => m[k.trim()] === true);
  }
  return m[p.days] === true;
}

export function getDayName(p) {
  if (typeof p === 'string') p = { days: p };
  if (p.days === 'daily') return t('m-day-daily');
  if (p.days === 'date') return p.date ? fmtPillDate(p.date) : t('m-day-date');
  const key = `m-day-${p.days}`;
  const out = t(key);
  return out === key ? p.days : out;
}

export function onPillDaysChange() {
  const sel = document.getElementById('pillDays');
  const dt = document.getElementById('pillDate');
  if (!sel || !dt) return;
  if (sel.value === 'date') {
    dt.disabled = false;
    dt.min = today();
    if (!dt.value) dt.value = today();
  } else {
    dt.disabled = true;
    dt.value = '';
  }
}

// ─── Drug-name & dose validation ───
export function checkDrugName() {
  const name = document.getElementById('pillName').value.toLowerCase().trim();
  const warnEl = document.getElementById('pillNameWarn');
  if (!name || name.length < 3) { warnEl.style.display = 'none'; return; }
  const found = Object.keys(DRUG_DB).find((k) => name.includes(k));
  if (found) {
    const info = DRUG_DB[found];
    warnEl.innerHTML = `<div class="drug-warn">⚠️ <strong>${found.charAt(0).toUpperCase() + found.slice(1)}</strong>: ${tt('m-warn-max', { max: info.max, unit: info.unit, warn: info.warn })} <a href="https://tabletki.ua/search/?q=${encodeURIComponent(found)}" target="_blank" class="pill-link">${t('m-warn-ref')} →</a></div>`;
    warnEl.style.display = 'block';
  } else warnEl.style.display = 'none';
}

export function validateDosageAmount(dose, drug) {
  const num = parseFloat(dose.replace(/[^\d.]/g, ''));
  if (!num) return null;
  if (num > 5000) return { level: 'danger', msg: tt('m-validate-extreme', { num }) };
  if (!drug) return null;
  const info = DRUG_DB[drug];
  if (!info) return null;
  if (num > info.max * 3) return { level: 'danger', msg: tt('m-validate-danger', { num, unit: info.unit, max: info.max }) };
  if (num > info.max) return { level: 'warn', msg: tt('m-validate-warn', { num, max: info.max, unit: info.unit }) };
  return null;
}

// ─── CRUD ───
export function addPill() {
  const name = document.getElementById('pillName').value.trim();
  const dose = document.getElementById('pillDose').value.trim();
  const time = document.getElementById('pillTime').value;
  const days = document.getElementById('pillDays').value;
  const date = document.getElementById('pillDate').value;

  if (!name) { showToast(t('m-toast-need-name')); return; }
  if (!dose) { showToast(t('m-toast-need-dose')); return; }
  if (days === 'date') {
    if (!date) { showToast(t('m-toast-need-date')); return; }
    if (date < today()) { showToast(t('m-toast-past-date')); return; }
  }

  const foundDrug = Object.keys(DRUG_DB).find((k) => name.toLowerCase().includes(k));
  const validation = validateDosageAmount(dose, foundDrug || null);
  if (validation) {
    if (!confirm(`${validation.msg}\n\n${t('m-confirm-continue')}`)) return;
  }

  state.pills.push({ id: Date.now(), name, dose, time, days, date: days === 'date' ? date : '' });
  saveData();
  ['pillName', 'pillDose'].forEach((id) => { document.getElementById(id).value = ''; });
  document.getElementById('pillTime').value = '08:00';
  document.getElementById('pillDays').value = 'daily';
  document.getElementById('pillDate').value = '';
  document.getElementById('pillDate').disabled = true;
  document.getElementById('pillNameWarn').style.display = 'none';
  renderPills();
  showToast(tt('m-toast-added', { name }));
  emit('pills:changed');
}

export function searchPharmacy(site) {
  const name = document.getElementById('pillName').value.trim() || '';
  if (!name) { showToast(t('m-toast-need-name-search')); return false; }
  const q = encodeURIComponent(name);
  const urls = {
    apteka: `https://apteka.ua/search/?q=${q}`,
    liki: `https://liki.ua/search/?q=${q}`,
    tabletki: `https://tabletki.ua/search/?q=${q}`,
    nine11: `https://911.ua/search?q=${q}`,
  };
  if (urls[site]) window.open(urls[site], '_blank');
  return false;
}

export function renderPills() {
  const con = document.getElementById('todayPills');
  const td = today();
  if (!state.pillsTaken[td]) state.pillsTaken[td] = {};
  const due = state.pills.filter(isPillDueToday).sort((a, b) => a.time.localeCompare(b.time));
  document.getElementById('adherenceWrap').style.display = due.length ? 'block' : 'none';

  document.getElementById('cntTotal').textContent = state.pills.length;

  if (!due.length) {
    const nextDueName = state.pills.length > 0 ? tt('m-summary-no-today', { n: state.pills.length }) : '';
    const emptyText = state.pills.length ? t('m-empty-no-today') : t('m-empty-no-pills');
    con.innerHTML = `<div class="empty-state"><div class="em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div><p>${emptyText}</p>${nextDueName ? `<p style="font-size:11px;color:var(--blue2);margin-top:6px">${nextDueName}</p>` : ''}</div>`;
    document.getElementById('cntTaken').textContent = 0;
    document.getElementById('cntLeft').textContent = due.length;
  } else {
    const now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
    let tc = 0;
    con.innerHTML = due.map((p) => {
      const taken = !!state.pillsTaken[td][p.id]; if (taken) tc++;
      const [h, m] = p.time.split(':').map(Number);
      const ov = !taken && (h * 60 + m) < nm - 30;
      const foundDrug = Object.keys(DRUG_DB).find((k) => p.name.toLowerCase().includes(k) || k.includes(p.name.toLowerCase()));
      const dInfo = foundDrug ? DRUG_DB[foundDrug] : null;
      const warn = dInfo ? `<div class="drug-warn" style="margin-top:4px">⚠️ ${tt('m-pill-max', { max: dInfo.max, unit: dInfo.unit, warn: dInfo.warn })}</div>` : '';
      const overdueChip = ov ? ` · <svg class="pill-meta-ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${t('m-overdue')}` : '';
      return `<div class="pill-item ${taken ? 'taken' : ov ? 'overdue' : ''}" id="pill-${p.id}">
        <div class="pill-chk" data-action="togglePill" data-id="${p.id}"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="pill-info"><div class="pill-name">${p.name}</div><div class="pill-dose">${p.dose}${overdueChip}</div><div class="pill-schedule-badge"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${getDayName(p)}</div>${warn}</div>
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0"><div class="pill-time">${p.time}</div><button class="pill-del" data-action="deletePill" data-id="${p.id}">×</button></div>
      </div>`;
    }).join('');
    document.getElementById('cntTotal').textContent = due.length;
    document.getElementById('cntTaken').textContent = tc;
    document.getElementById('cntLeft').textContent = due.length - tc;
    const pct = Math.round(tc / due.length * 100);
    document.getElementById('adherencePct').textContent = pct + '%';
    document.getElementById('adherenceFill').style.width = pct + '%';
  }

  const allCard = document.getElementById('allPillsCard');
  const allList = document.getElementById('allPillsList');
  if (state.pills.length > 0) {
    allCard.style.display = 'block';
    const sortedAll = [...state.pills].sort((a, b) => {
      if (a.days === 'daily' && b.days !== 'daily') return -1;
      if (b.days === 'daily' && a.days !== 'daily') return 1;
      if (a.days === 'date' && b.days === 'date') return (a.date || '').localeCompare(b.date || '');
      return (a.time || '').localeCompare(b.time || '');
    });
    allList.innerHTML = sortedAll.map((p) => {
      const isPast = p.days === 'date' && p.date && p.date < today();
      const opacity = isPast ? 'opacity:.55' : '';
      const pastBadge = isPast ? `<span class="pill-past-badge"><svg viewBox="0 0 24 24"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>${t('m-past-badge')}</span>` : '';
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);${opacity}">
        <div style="flex:1"><div style="font-size:14px;font-weight:700">${p.name}</div><div style="font-size:11px;color:var(--text3);margin-top:2px">${p.dose} · ${p.time}${pastBadge}</div><div class="pill-schedule-badge"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${getDayName(p)}</div></div>
        <button class="pill-del" data-action="deletePill" data-id="${p.id}">×</button>
      </div>`;
    }).join('');
  } else allCard.style.display = 'none';
}

export function togglePill(id) {
  const td = today(); if (!state.pillsTaken[td]) state.pillsTaken[td] = {};
  state.pillsTaken[td][id] = !state.pillsTaken[td][id];
  saveData();
  renderPills();
  const p = state.pills.find((p) => p.id === id);
  if (p && state.pillsTaken[td][id]) showToast(tt('m-toast-taken', { name: p.name }));
}

export function deletePill(id) {
  if (!confirm(t('m-confirm-delete'))) return;
  const i = state.pills.findIndex((p) => p.id === id);
  if (i >= 0) state.pills.splice(i, 1);
  saveData();
  renderPills();
  showToast(t('m-toast-deleted'));
  emit('pills:changed');
}
