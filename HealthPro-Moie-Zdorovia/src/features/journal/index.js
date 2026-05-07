// features/journal/index.js — Розширений журнал вимірів
// Date-range picker (від/до) + фільтр-вкладки + відображення нотаток.
// Використовує db.queryMeasurements({from, to}) — асинхронний SQLite-запит.

import * as db from '../../core/db.js';
import { getBPDotClass, getBPStatus, getPulseStatus } from '../pressure/index.js';
import { formatDate, formatTime } from '../../core/utils.js';
import { t } from '../../i18n/index.js';
import { showToast, on } from '../../core/state.js';

// ── Стан фільтра ─────────────────────────────────────────────────────────────
let _fromDate = '';
let _toDate   = '';
let _typeFilter = 'all'; // 'all' | 'pressure'

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ── Init дефолтного діапазону (тиждень) ──────────────────────────────────────
function initDefaultRange() {
  _fromDate = daysAgoStr(7);
  _toDate   = todayStr();
}

// ── Рендер списку ────────────────────────────────────────────────────────────
async function renderJournalList() {
  const listEl = document.getElementById('journalList');
  const countEl = document.getElementById('journalCount');
  if (!listEl) return;

  listEl.innerHTML = `<div class="empty-state"><p style="color:var(--text3);font-size:12px">⏳ Завантаження…</p></div>`;

  const rows = await db.queryMeasurements({ from: _fromDate, to: _toDate, limit: 300, order: 'DESC' });

  // Тип-фільтр (поки лише pressure — майбутні типи можна розширити)
  const filtered = _typeFilter === 'all' ? rows : rows; // розширити при появі інших типів

  if (countEl) countEl.textContent = filtered.length;

  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg></div><p>${t('j-no-data')}</p></div>`;
    return;
  }

  listEl.innerHTML = filtered.map(m => {
    const dotCls = getBPDotClass(m.sys);
    const st = getBPStatus(m.sys, m.dia);
    const borderCls = dotCls === 'd-crit' ? 'hi-crit' : dotCls === 'd-bad' ? 'hi-bad' : dotCls === 'd-hypo' ? 'hi-hypo' : '';
    return `
    <div class="history-item ${borderCls}">
      <div class="history-dot ${dotCls}"></div>
      <div class="history-data">
        <div class="history-main">${m.sys}/${m.dia} ${t('pr-mmhg')}</div>
        <div class="history-sub">${st.label.replace(/[🚨▲⚠✓⬇️]/g, '').trim()}</div>
        ${m.pulse ? `<span class="badge ${getPulseStatus(m.pulse).cls}" style="font-size:11px;margin-top:3px;display:inline-block">${m.pulse} ${t('pr-bpm-short')} — ${getPulseStatus(m.pulse).label}</span>` : ''}
        ${m.note ? `<div class="history-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="12" height="12"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> ${m.note}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
        <div class="history-time">${formatDate(m.time)}<br>${formatTime(m.time)}</div>
        <button class="h-del-btn" data-action="deleteMeasurement" data-time="${m.time}" title="${t('j-delete')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </div>
    </div>`;
  }).join('');
}

// ── Синхронізація дат з input-полями ─────────────────────────────────────────
function syncDateInputs() {
  const fromEl = document.getElementById('journalFrom');
  const toEl   = document.getElementById('journalTo');
  if (fromEl) fromEl.value = _fromDate;
  if (toEl)   toEl.value   = _toDate;
}

// ── Синхронізація активної tab ────────────────────────────────────────────────
function syncTypeTabs() {
  document.querySelectorAll('.journal-type-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.jtype === _typeFilter);
  });
}

// ── Публічний API ─────────────────────────────────────────────────────────────

export function renderJournal() {
  initDefaultRange();
  syncDateInputs();
  syncTypeTabs();
  renderJournalList();
}

export function setJournalFrom(val) {
  if (!val) return;
  _fromDate = val;
  renderJournalList();
}

export function setJournalTo(val) {
  if (!val) return;
  _toDate = val;
  renderJournalList();
}

export function setJournalType(type) {
  _typeFilter = type || 'all';
  syncTypeTabs();
  renderJournalList();
}

// Слухаємо оновлення вимірів (видалення з history → оновити журнал)
on('measurement:deleted', () => {
  if (document.getElementById('page-history')?.classList.contains('active')) {
    renderJournalList();
  }
});
