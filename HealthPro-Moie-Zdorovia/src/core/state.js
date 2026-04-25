// Shared mutable application state used across features.
// All feature modules read/write through this single object so they
// stay in sync with src/app.js.

import {
  loadState,
  saveState,
  saveTheme as saveThemeStorage,
  defaultSettings,
  DB,
  STORAGE_KEYS,
} from './storage.js';

const init = loadState();

export const state = {
  measurements: init.measurements,
  pills: init.pills,
  pillsTaken: init.pillsTaken,
  settings: init.settings,
  isDark: init.isDark,
  lang: localStorage.getItem(STORAGE_KEYS.lang) || 'uk',
};

// ─── Persistence helpers ───
export function saveData() {
  saveState({
    measurements: state.measurements,
    pills: state.pills,
    pillsTaken: state.pillsTaken,
    settings: state.settings,
  });
}

export function persistTheme(isDark) {
  state.isDark = isDark;
  saveThemeStorage(isDark);
}

export function persistLang(l) {
  state.lang = l;
  try { localStorage.setItem(STORAGE_KEYS.lang, l); } catch {}
}

// ─── Toast registry (DOM-bound implementation lives in src/app.js) ───
let toastFn = (msg) => console.log('[toast]', msg);
export function setToast(fn) { toastFn = fn; }
export function showToast(msg, dur) { toastFn(msg, dur); }

// ─── Tiny event bus for cross-module notifications ───
const listeners = new Map();
export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(fn);
}
export function emit(event, ...args) {
  (listeners.get(event) || []).forEach((fn) => fn(...args));
}

// ─── Common helpers ───
export function today() { return new Date().toISOString().split('T')[0]; }

export { DB, defaultSettings };
