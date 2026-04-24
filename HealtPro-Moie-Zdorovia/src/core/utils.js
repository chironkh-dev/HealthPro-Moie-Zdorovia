import { state } from './state.js';

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function avg(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function localeFor() {
  return state.lang === 'ru' ? 'ru-UA' : 'uk-UA';
}

export function formatTime(s) {
  return new Date(s).toLocaleTimeString(localeFor(), { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(s) {
  return new Date(s).toLocaleDateString(localeFor(), { day: 'numeric', month: 'short' });
}
