// Test setup. The app's core/state.js calls localStorage at import time,
// so provide a tiny in-memory stub for the Node test environment.

const store = new Map();
const ls = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
  clear: () => { store.clear(); },
  key: (i) => Array.from(store.keys())[i] ?? null,
  get length() { return store.size; },
};

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = ls;
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = { localStorage: ls };
}
if (typeof globalThis.document === 'undefined') {
  // Minimal stub — getElementById returns null so render functions no-op.
  globalThis.document = {
    getElementById: () => null,
    documentElement: { setAttribute: () => {} },
    addEventListener: () => {},
  };
}
// navigator — потрібен zrender (ECharts) при завантаженні модуля.
// Навіть якщо charts.js замокано через vitest.config.js alias,
// цей стаб слугує страховкою для будь-яких інших browser-globals.
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = { userAgent: 'node' };
}
