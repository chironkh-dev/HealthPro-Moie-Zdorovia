// History page: list, filter by period, delete, clear all.

import { state, saveData, showToast, emit } from '../../core/state.js';
import { getBPDotClass, getBPStatus, getPulseStatus } from '../pressure/index.js';
import { formatDate, formatTime } from '../../core/utils.js';

let historyPeriod = 'week';

export function setHistoryPeriod(p, btn) {
  historyPeriod = p;
  document.querySelectorAll('#page-history .period-tab').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderHistory();
}

export function renderHistory() {
  const isRu = state.lang === 'ru';
  let data = state.measurements;
  if (historyPeriod === 'week') data = data.filter((m) => new Date(m.time) > new Date(Date.now() - 7 * 864e5));
  else if (historyPeriod === 'month') data = data.filter((m) => new Date(m.time) > new Date(Date.now() - 30 * 864e5));
  const countEl = document.getElementById('historyCount');
  const listEl = document.getElementById('historyList');
  if (!listEl) return;
  if (countEl) countEl.textContent = data.length;
  if (!data.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg></div><p>${isRu ? 'Нет записей за этот период' : 'Немає записів за цей період'}</p></div>`;
    return;
  }
  listEl.innerHTML = data.slice(0, 100).map((m) => `
    <div class="history-item">
      <div class="history-dot ${getBPDotClass(m.sys)}"></div>
      <div class="history-data">
        <div class="history-main">${m.sys}/${m.dia} мм рт.ст.</div>
        <div class="history-sub">${getBPStatus(m.sys, m.dia).label.replace(/[🚨▲⚠✓⬇️]/g, '').trim()}${m.note ? ' · ' + m.note : ''}</div>
        ${m.pulse ? `<span class="badge ${getPulseStatus(m.pulse).cls}" style="font-size:11px;margin-top:3px;display:inline-block">${m.pulse} ${isRu ? 'уд/мин' : 'уд/хв'} — ${getPulseStatus(m.pulse).label}</span>` : ''}
      </div>
      <div class="history-time">${formatDate(m.time)}<br>${formatTime(m.time)}</div>
      <button class="history-delete" data-action="deleteMeasurement" data-time="${m.time}" aria-label="${isRu ? 'Удалить' : 'Видалити'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>`).join('');
}

export function deleteMeasurement(time) {
  if (!confirm(state.lang === 'ru' ? 'Удалить эту запись?' : 'Видалити цей запис?')) return;
  const idx = state.measurements.findIndex((m) => m.time === time);
  if (idx >= 0) state.measurements.splice(idx, 1);
  saveData();
  renderHistory();
  emit('measurement:deleted');
  showToast('🗑 Запис видалено');
}

export function clearHistory() {
  if (!confirm(state.lang === 'ru' ? 'Удалить все измерения?' : 'Видалити всі виміри?')) return;
  state.measurements.length = 0;
  saveData();
  renderHistory();
  emit('measurement:deleted');
  showToast('🗑 Очищено');
}
