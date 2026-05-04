// HealthPro local persistence layer (ES module).
//
// Three-tier strategy:
//   1. SQLite (native only) — persistent file under app private storage.
//                              Survives WebView cache eviction. PRIMARY on Android.
//   2. IndexedDB (HealthProDB / store "state") — async store, PRIMARY on web/PWA.
//   3. localStorage           — synchronous mirror used for the very first
//                               render before bootstrapStorage() completes.
//
// Feature modules keep using loadState() / saveState() — no API change.
// The bootstrapStorage() function:
//   * opens SQLite if available;
//   * migrates IDB → SQLite once (when SQLite is empty but IDB has data);
//   * rehydrates the localStorage mirror from whichever store is primary,
//     so the next cold start of the app paints with up-to-date data.

import * as sql from './sqlite.js';

export const STORAGE_KEYS = {
  measurements: 'hp_measurements',
  pills: 'hp_pills',
  pillsTaken: 'hp_pills_taken',
  settings: 'hp_settings',
  theme: 'hp_theme',
  lang: 'hp_lang',
};

export const defaultSettings = {
  name: '', age: '', height: '', weight: '', gender: '',
  phone: '', email: '', viber: '', telegram: '', whatsapp: '',
  normalSys: '', normalDia: '', normalPulse: '',
  notif: false, measureReminder: false,
  emergencyPhone: '', emergencyName: '',
  morningTime: '08:00', eveningTime: '20:00',
  stepGoal: 10000, stepsEnabled: false, stepMode: 'active-only', // see DEFAULT_STEP_GOAL in core/constants.js
};

const DB_NAME = 'HealthProDB';
const DB_VERSION = 1;
const STORE = 'state';

const LS = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbGet(key) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } catch (e) { console.warn('[HealthProDB] read failed:', key, e); return undefined; }
}

async function idbSet(key, value) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('aborted'));
    });
  } catch (e) { console.error('[HealthProDB] write failed:', key, e); return false; }
}

// ─── Unified primary store ─────────────────────────────────────
// On native (when SQLite is ready) → SQLite is primary.
// Otherwise (web/PWA, or if SQLite init failed) → IndexedDB.
async function primaryGet(key) {
  if (sql.isReady()) {
    const v = await sql.get(key);
    if (v !== undefined) return v;
  }
  return idbGet(key);
}

async function primarySet(key, value) {
  // Always keep IDB as secondary backup on native too — protects against
  // the rare case where SQLite write fails after we've already returned.
  if (sql.isReady()) {
    await sql.set(key, value);
  }
  return idbSet(key, value);
}

async function primaryGetAll() {
  const keys = [
    STORAGE_KEYS.measurements,
    STORAGE_KEYS.pills,
    STORAGE_KEYS.pillsTaken,
    STORAGE_KEYS.settings,
    STORAGE_KEYS.theme,
  ];
  const entries = await Promise.all(keys.map(async (k) => [k, await primaryGet(k)]));
  return Object.fromEntries(entries);
}

async function requestPersistence() {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      const granted = await navigator.storage.persist();
      console.log('[HealthProDB] persistent storage:', granted ? 'granted' : 'denied');
    }
  } catch {}
}

// One-time migration of legacy localStorage entries into the primary store.
async function migrateFromLocalStorage() {
  try {
    const tryMigrate = async (key, legacyKey) => {
      const existing = await primaryGet(key);
      if (existing != null) return false;
      const v = LS.get(key, LS.get(legacyKey, null));
      if (v == null) return false;
      await primarySet(key, v);
      return true;
    };
    const flags = await Promise.all([
      tryMigrate(STORAGE_KEYS.measurements, 'measurements'),
      tryMigrate(STORAGE_KEYS.pills, 'pills'),
      tryMigrate(STORAGE_KEYS.pillsTaken, 'pillsTaken'),
      tryMigrate(STORAGE_KEYS.settings, 'settings'),
      tryMigrate(STORAGE_KEYS.theme, 'theme'),
    ]);
    const moved = flags.filter(Boolean).length;
    if (moved) console.log('[HealthProDB] migrated', moved, 'collections from localStorage');
  } catch (e) { console.warn('[HealthProDB] LS migration skipped:', e); }
}

// One-time migration IDB → SQLite on the first native launch after the
// SQLite upgrade. Only runs when SQLite is the active primary AND it has
// no data yet AND IDB has data.
async function migrateIdbToSqlite() {
  if (!sql.isReady()) return;
  try {
    const keys = [
      STORAGE_KEYS.measurements,
      STORAGE_KEYS.pills,
      STORAGE_KEYS.pillsTaken,
      STORAGE_KEYS.settings,
      STORAGE_KEYS.theme,
    ];
    const ops = [];
    for (const k of keys) {
      const inSqlite = await sql.get(k);
      if (inSqlite !== undefined) continue;
      const inIdb = await idbGet(k);
      if (inIdb != null) ops.push(sql.set(k, inIdb));
    }
    if (ops.length) {
      await Promise.all(ops);
      console.log('[HealthProDB/SQLite] migrated', ops.length, 'collections from IndexedDB');
    }
  } catch (e) { console.warn('[HealthProDB/SQLite] IDB→SQLite migration skipped:', e); }
}

async function rehydrateMirrorFromPrimary() {
  try {
    const all = await primaryGetAll();
    if (all[STORAGE_KEYS.measurements] != null) LS.set(STORAGE_KEYS.measurements, all[STORAGE_KEYS.measurements]);
    if (all[STORAGE_KEYS.pills] != null) LS.set(STORAGE_KEYS.pills, all[STORAGE_KEYS.pills]);
    if (all[STORAGE_KEYS.pillsTaken] != null) LS.set(STORAGE_KEYS.pillsTaken, all[STORAGE_KEYS.pillsTaken]);
    if (all[STORAGE_KEYS.settings] != null) LS.set(STORAGE_KEYS.settings, all[STORAGE_KEYS.settings]);
    if (all[STORAGE_KEYS.theme] != null) LS.set(STORAGE_KEYS.theme, all[STORAGE_KEYS.theme]);
  } catch {}
}

export function loadState() {
  return {
    measurements: LS.get(STORAGE_KEYS.measurements, LS.get('measurements', [])),
    pills: LS.get(STORAGE_KEYS.pills, LS.get('pills', [])),
    pillsTaken: LS.get(STORAGE_KEYS.pillsTaken, LS.get('pillsTaken', {})),
    settings: LS.get(STORAGE_KEYS.settings, LS.get('settings', { ...defaultSettings })),
    isDark: LS.get(STORAGE_KEYS.theme, LS.get('theme', 'dark')) === 'dark',
  };
}

export function saveState({ measurements, pills, pillsTaken, settings }) {
  // Synchronous mirror first (so a hard kill mid-save still has fresh boot data).
  LS.set(STORAGE_KEYS.measurements, measurements);
  LS.set(STORAGE_KEYS.pills, pills);
  LS.set(STORAGE_KEYS.pillsTaken, pillsTaken);
  LS.set(STORAGE_KEYS.settings, settings);
  // Async primary writes (SQLite on native, IDB on web).
  primarySet(STORAGE_KEYS.measurements, measurements);
  primarySet(STORAGE_KEYS.pills, pills);
  primarySet(STORAGE_KEYS.pillsTaken, pillsTaken);
  primarySet(STORAGE_KEYS.settings, settings);
}

export function saveTheme(isDark) {
  const v = isDark ? 'dark' : 'light';
  LS.set(STORAGE_KEYS.theme, v);
  primarySet(STORAGE_KEYS.theme, v);
}

export const DB = {
  get(key, fallback) { return LS.get(key, fallback); },
  set(key, value) { LS.set(key, value); primarySet(key, value); },
};

export async function bootstrapStorage() {
  await requestPersistence();
  await sql.init();                  // no-op on web; opens HealthProDB.db on native
  await migrateFromLocalStorage();   // legacy LS → primary (one-time)
  await migrateIdbToSqlite();        // IDB → SQLite (one-time, native only)
  await rehydrateMirrorFromPrimary();
}
