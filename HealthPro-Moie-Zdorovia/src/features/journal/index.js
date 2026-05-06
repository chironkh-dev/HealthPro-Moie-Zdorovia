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

  listEl.innerHTML = filtered.map(m => `
    <div class="history-item">
      <div class="history-dot ${getBPDotClass(m.sys)}"></div>
      <div class="history-data">
        <div class="history-main">${m.sys}/${m.dia} ${t('pr-mmhg')}</div>
        <div class="history-sub">${getBPStatus(m.sys, m.dia).label.replace(/[🚨▲⚠✓⬇️]/g, '').trim()}</div>
        ${m.pulse ? `<span class="badge ${getPulseStatus(m.pulse).cls}" style="font-size:11px;margin-top:3px;display:inline-block">${m.pulse} ${t('pr-bpm-short')} — ${getPulseStatus(m.pulse).label}</span>` : ''}
        ${m.note ? `<div class="history-note">📝 ${m.note}</div>` : ''}
      </div>
      <div class="history-time">${formatDate(m.time)}<br>${formatTime(m.time)}</div>
    </div>
  `).join('');
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
