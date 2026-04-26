// Meds feature: pill scheduling, validation, rendering, taken-toggling.
// Shares state with the rest of the app via src/core/state.js.

import { state, saveData, showToast, today, emit } from '../../core/state.js';
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
  const isRu = state.lang === 'ru';
  if (typeof p === 'string') p = { days: p };
  if (p.days === 'daily') return isRu ? 'Ежедневно' : 'Щодня';
  if (p.days === 'date') return p.date ? fmtPillDate(p.date) : (isRu ? 'Дата' : 'Дата');
  const map = isRu
    ? { weekdays: 'Пн–Пт', mon: 'Понедельник', tue: 'Вторник', wed: 'Среда', thu: 'Четверг', fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье' }
    : { weekdays: 'Пн–Пт', mon: 'Понеділок', tue: 'Вівторок', wed: 'Середа', thu: 'Четвер', fri: 'П\'ятниця', sat: 'Субота', sun: 'Неділя' };
  return map[p.days] || p.days;
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
    warnEl.innerHTML = `<div class="drug-warn">⚠️ <strong>${found.charAt(0).toUpperCase() + found.slice(1)}</strong>: Добова доза — макс. <strong>${info.max} ${info.unit}</strong>. ${info.warn}. <a href="https://tabletki.ua/search/?q=${encodeURIComponent(found)}" target="_blank" class="pill-link">Довідник →</a></div>`;
    warnEl.style.display = 'block';
  } else warnEl.style.display = 'none';
}

export function validateDosageAmount(dose, drug) {
  const num = parseFloat(dose.replace(/[^\d.]/g, ''));
  if (!num) return null;
  if (num > 5000) return { level: 'danger', msg: `⛔ Введена доза ${num} мг здається помилкою. Перевірте: 5000+ мг будь-якого препарату є небезпечним!` };
  if (!drug) return null;
  const info = DRUG_DB[drug];
  if (!info) return null;
  if (num > info.max * 3) return { level: 'danger', msg: `⛔ НЕБЕЗПЕЧНА доза! Введено ${num} ${info.unit} — максимум ${info.max} ${info.unit}/добу! Це може призвести до отруєння.` };
  if (num > info.max) return { level: 'warn', msg: `⚠️ Введена доза (${num}) перевищує максимальну добову (${info.max} ${info.unit}). Уточніть у лікаря.` };
  return null;
}

// ─── CRUD ───
export function addPill() {
  const isRu = state.lang === 'ru';
  const name = document.getElementById('pillName').value.trim();
  const dose = document.getElementById('pillDose').value.trim();
  const time = document.getElementById('pillTime').value;
  const days = document.getElementById('pillDays').value;
  const date = document.getElementById('pillDate').value;

  if (!name) { showToast(isRu ? '⚠️ Введите название препарата' : '⚠️ Введіть назву препарату'); return; }
  if (!dose) { showToast(isRu ? '⚠️ Введите дозировку (обязательно)' : '⚠️ Введіть дозування (обов\'язково)'); return; }
  if (days === 'date') {
    if (!date) { showToast(isRu ? '⚠️ Выберите дату приёма' : '⚠️ Виберіть дату прийому'); return; }
    if (date < today()) { showToast(isRu ? '⚠️ Дата не может быть в прошлом' : '⚠️ Дата не може бути в минулому'); return; }
  }

  const foundDrug = Object.keys(DRUG_DB).find((k) => name.toLowerCase().includes(k));
  const validation = validateDosageAmount(dose, foundDrug || null);
  if (validation) {
    if (!confirm(`${validation.msg}\n\nПродовжити все одно?`)) return;
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
  showToast((state.lang === 'ru' ? '💊 ' : '💊 ') + name + (state.lang === 'ru' ? ' добавлен!' : ' додано!'));
  emit('pills:changed');
}

export function searchPharmacy(site) {
  const isRu = state.lang === 'ru';
  const name = document.getElementById('pillName').value.trim() || '';
  if (!name) { showToast(isRu ? '⚠️ Введите название препарата для поиска' : '⚠️ Введіть назву препарату для пошуку'); return false; }
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
  const isRu = state.lang === 'ru';
  const con = document.getElementById('todayPills');
  const td = today();
  if (!state.pillsTaken[td]) state.pillsTaken[td] = {};
  const due = state.pills.filter(isPillDueToday).sort((a, b) => a.time.localeCompare(b.time));
  document.getElementById('adherenceWrap').style.display = due.length ? 'block' : 'none';

  document.getElementById('cntTotal').textContent = state.pills.length;

  if (!due.length) {
    const nextDueName = state.pills.length > 0 ? `Всього препаратів: ${state.pills.length}. На сьогодні немає.` : '';
    con.innerHTML = `<div class="empty-state"><div class="em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div><p>${state.pills.length ? (isRu ? 'Лекарств на сегодня нет' : 'Ліків на сьогодні немає') : (isRu ? 'Нет добавленных лекарств' : 'Немає доданих ліків')}</p>${nextDueName ? `<p style="font-size:11px;color:var(--blue2);margin-top:6px">${nextDueName}</p>` : ''}</div>`;
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
      const warn = dInfo ? `<div class="drug-warn" style="margin-top:4px">⚠️ Макс: ${dInfo.max} ${dInfo.unit}/добу · ${dInfo.warn}</div>` : '';
      const overdueChip = ov ? ` · <svg class="pill-meta-ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Пропущено` : '';
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
      const pastBadge = isPast ? '<span class="pill-past-badge"><svg viewBox="0 0 24 24"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>минула</span>' : '';
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
  if (p && state.pillsTaken[td][id]) showToast('✅ ' + p.name + (state.lang === 'ru' ? ' принято!' : ' прийнято!'));
}

export function deletePill(id) {
  const isRu = state.lang === 'ru';
  if (!confirm(isRu ? 'Удалить препарат?' : 'Видалити препарат?')) return;
  const i = state.pills.findIndex((p) => p.id === id);
  if (i >= 0) state.pills.splice(i, 1);
  saveData();
  renderPills();
  showToast(isRu ? '🗑 Удалено' : '🗑 Видалено');
  emit('pills:changed');
}
