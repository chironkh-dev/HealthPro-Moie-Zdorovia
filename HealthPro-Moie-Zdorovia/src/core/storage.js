// HealthPro local persistence layer (ES module).
// PRIMARY: IndexedDB (HealthProDB). MIRROR: localStorage for synchronous boot reads.

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
  stepGoal: 10000, stepsEnabled: false, // see DEFAULT_STEP_GOAL in core/constants.js
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

async function idbGetAll() {
  const [measurements, pills, pillsTaken, settings, theme] = await Promise.all([
    idbGet(STORAGE_KEYS.measurements),
    idbGet(STORAGE_KEYS.pills),
    idbGet(STORAGE_KEYS.pillsTaken),
    idbGet(STORAGE_KEYS.settings),
    idbGet(STORAGE_KEYS.theme),
  ]);
  return { measurements, pills, pillsTaken, settings, theme };
}

async function requestPersistence() {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      const granted = await navigator.storage.persist();
      console.log('[HealthProDB] persistent storage:', granted ? 'granted' : 'denied');
    }
  } catch {}
}

async function migrateFromLocalStorage() {
  try {
    const idb = await idbGetAll();
    const ops = [];
    const tryMigrate = (idbVal, key, legacyKey) => {
      if (idbVal != null) return;
      const v = LS.get(key, LS.get(legacyKey, null));
      if (v != null) ops.push(idbSet(key, v));
    };
    tryMigrate(idb.measurements, STORAGE_KEYS.measurements, 'measurements');
    tryMigrate(idb.pills, STORAGE_KEYS.pills, 'pills');
    tryMigrate(idb.pillsTaken, STORAGE_KEYS.pillsTaken, 'pillsTaken');
    tryMigrate(idb.settings, STORAGE_KEYS.settings, 'settings');
    tryMigrate(idb.theme, STORAGE_KEYS.theme, 'theme');
    if (ops.length) {
      await Promise.all(ops);
      console.log('[HealthProDB] migrated', ops.length, 'collections from localStorage');
    }
  } catch (e) { console.warn('[HealthProDB] migration skipped:', e); }
}

async function rehydrateMirrorFromIdb() {
  try {
    const all = await idbGetAll();
    if (all.measurements != null) LS.set(STORAGE_KEYS.measurements, all.measurements);
    if (all.pills != null) LS.set(STORAGE_KEYS.pills, all.pills);
    if (all.pillsTaken != null) LS.set(STORAGE_KEYS.pillsTaken, all.pillsTaken);
    if (all.settings != null) LS.set(STORAGE_KEYS.settings, all.settings);
    if (all.theme != null) LS.set(STORAGE_KEYS.theme, all.theme);
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
  LS.set(STORAGE_KEYS.measurements, measurements);
  LS.set(STORAGE_KEYS.pills, pills);
  LS.set(STORAGE_KEYS.pillsTaken, pillsTaken);
  LS.set(STORAGE_KEYS.settings, settings);
  idbSet(STORAGE_KEYS.measurements, measurements);
  idbSet(STORAGE_KEYS.pills, pills);
  idbSet(STORAGE_KEYS.pillsTaken, pillsTaken);
  idbSet(STORAGE_KEYS.settings, settings);
}

export function saveTheme(isDark) {
  const v = isDark ? 'dark' : 'light';
  LS.set(STORAGE_KEYS.theme, v);
  idbSet(STORAGE_KEYS.theme, v);
}

export const DB = {
  get(key, fallback) { return LS.get(key, fallback); },
  set(key, value) { LS.set(key, value); idbSet(key, value); },
};

export async function bootstrapStorage() {
  await requestPersistence();
  await migrateFromLocalStorage();
  await rehydrateMirrorFromIdb();
}
