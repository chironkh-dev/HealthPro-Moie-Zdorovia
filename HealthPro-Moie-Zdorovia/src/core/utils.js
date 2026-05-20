// Generic, framework-free helpers used across feature modules.
// Keep this file pure: no DOM, no side effects, only utilities.

import { state } from './state.js';

// ─── Date / time ───
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function nowISO() {
  return new Date().toISOString();
}

function localeFor() {
  return state.lang === 'ru' ? 'ru-UA' : 'uk-UA';
}

// Public re-export for feature modules that need a UI locale.
export function getLocale() {
  return localeFor();
}

// ДД.ММ.РРРР
export function formatDate(s) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

// ДД.ММ (скорочено, для графіків/осей)
export function formatDateShort(s) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
}

// ГГ:ХХ (24-годинний)
export function formatTime(s) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ДД.ММ.РРРР (зворотна сумісність)
export function formatDateLong(s) {
  return formatDate(s);
}

// ДД.ММ.РРРР ГГ:ХХ
export function formatDateTime(s) {
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return `${formatDate(s)} ${formatTime(s)}`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysBetween(aISO, bISO) {
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.floor(Math.abs(a - b) / MS_PER_DAY);
}

export function hoursAgo(iso) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / (60 * 60 * 1000)));
}

// ─── Number / math helpers ───
export function safeNum(v, fallback = 0) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function safeInt(v, fallback = 0) {
  const n = typeof v === 'number' ? v : parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}

export function pct(part, total) {
  if (!total) return 0;
  return clamp(Math.round((part / total) * 100), 0, 100);
}

// ─── Array / aggregation ───
export function avg(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + safeNum(value, 0), 0) / values.length;
}

export function sum(values) {
  if (!Array.isArray(values)) return 0;
  return values.reduce((s, v) => s + safeNum(v, 0), 0);
}

export function lastN(arr, n) {
  if (!Array.isArray(arr) || n <= 0) return [];
  return arr.slice(-n);
}

export function groupByDate(items, dateKey = 'ts') {
  const out = new Map();
  for (const it of items || []) {
    const ts = it && it[dateKey];
    if (!ts) continue;
    const day = String(ts).slice(0, 10);
    if (!out.has(day)) out.set(day, []);
    out.get(day).push(it);
  }
  return out;
}

// ─── Strings ───
export function padNum(n, len = 2) {
  return String(n).padStart(len, '0');
}
