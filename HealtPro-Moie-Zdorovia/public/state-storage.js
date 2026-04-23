// HealthPro local persistence layer
// PRIMARY storage: IndexedDB (HealthProDB) — robust, structured, persistent across sessions.
// MIRROR: localStorage — kept as a synchronous read-cache so the app can boot without awaiting IDB.
// Future: when migrating to Capacitor, swap the IDB layer for @capacitor-community/sqlite
// while keeping the same loadState/saveState API.
(function initHealthProStateStorage(global) {
  const STORAGE_KEYS = global.__HP_STORAGE_KEYS || {
    measurements: 'measurements',
    pills: 'pills',
    pillsTaken: 'pillsTaken',
    settings: 'settings',
    theme: 'theme',
    lang: 'lang',
  };

  const defaultSettings = {
    name: '', age: '', height: '', weight: '', gender: '',
    phone: '', email: '', viber: '', telegram: '', whatsapp: '',
    normalSys: '', normalDia: '', normalPulse: '',
    notif: false, measureReminder: false,
    emergencyPhone: '', emergencyName: '',
    morningTime: '08:00', eveningTime: '20:00',
    stepGoal: 10000, stepsEnabled: false,
  };

  const DB_NAME = 'HealthProDB';
  const DB_VERSION = 1;
  const STORE = 'state';

  // ───────────── localStorage mirror (synchronous fallback / boot cache) ─────────────
  const LS = {
    get(key, fallbackValue) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallbackValue;
      } catch { return fallbackValue; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    },
  };

  // ───────────── IndexedDB layer ─────────────
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
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
    } catch (e) {
      console.warn('[HealthProDB] read failed:', key, e);
      return undefined;
    }
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
    } catch (e) {
      console.error('[HealthProDB] write failed:', key, e);
      return false;
    }
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

  // Request persistent storage so the OS does not evict our DB under storage pressure.
  async function requestPersistence() {
    try {
      if (navigator.storage && typeof navigator.storage.persist === 'function') {
        const granted = await navigator.storage.persist();
        console.log('[HealthProDB] persistent storage:', granted ? 'granted' : 'denied');
      }
    } catch {}
  }

  // One-time migration: copy localStorage data into IDB if IDB is empty.
  async function migrateFromLocalStorage() {
    try {
      const idb = await idbGetAll();
      const ops = [];
      if (idb.measurements == null) {
        const v = LS.get(STORAGE_KEYS.measurements, LS.get('measurements', null));
        if (v != null) ops.push(idbSet(STORAGE_KEYS.measurements, v));
      }
      if (idb.pills == null) {
        const v = LS.get(STORAGE_KEYS.pills, LS.get('pills', null));
        if (v != null) ops.push(idbSet(STORAGE_KEYS.pills, v));
      }
      if (idb.pillsTaken == null) {
        const v = LS.get(STORAGE_KEYS.pillsTaken, LS.get('pillsTaken', null));
        if (v != null) ops.push(idbSet(STORAGE_KEYS.pillsTaken, v));
      }
      if (idb.settings == null) {
        const v = LS.get(STORAGE_KEYS.settings, LS.get('settings', null));
        if (v != null) ops.push(idbSet(STORAGE_KEYS.settings, v));
      }
      if (idb.theme == null) {
        const v = LS.get(STORAGE_KEYS.theme, LS.get('theme', null));
        if (v != null) ops.push(idbSet(STORAGE_KEYS.theme, v));
      }
      if (ops.length) {
        await Promise.all(ops);
        console.log('[HealthProDB] migrated', ops.length, 'collections from localStorage');
      }
    } catch (e) {
      console.warn('[HealthProDB] migration skipped:', e);
    }
  }

  // After IDB hydrates, if it is newer/different than localStorage, refresh the LS mirror
  // so that next page load reads correct boot data. We do NOT reload the page here —
  // the app already booted with whatever LS had; IDB just guarantees persistence going forward.
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

  // ───────────── Public API (same shape as before) ─────────────
  // Synchronous loadState reads from localStorage mirror so app can boot immediately.
  function loadState() {
    return {
      measurements: LS.get(STORAGE_KEYS.measurements, LS.get('measurements', [])),
      pills: LS.get(STORAGE_KEYS.pills, LS.get('pills', [])),
      pillsTaken: LS.get(STORAGE_KEYS.pillsTaken, LS.get('pillsTaken', {})),
      settings: LS.get(STORAGE_KEYS.settings, LS.get('settings', { ...defaultSettings })),
      isDark: LS.get(STORAGE_KEYS.theme, LS.get('theme', 'dark')) === 'dark',
    };
  }

  // saveState writes to BOTH stores. localStorage write is synchronous for instant
  // re-reads; IndexedDB write is awaited in background and is the source of truth.
  function saveState(params) {
    LS.set(STORAGE_KEYS.measurements, params.measurements);
    LS.set(STORAGE_KEYS.pills, params.pills);
    LS.set(STORAGE_KEYS.pillsTaken, params.pillsTaken);
    LS.set(STORAGE_KEYS.settings, params.settings);
    // Fire-and-forget IDB writes
    idbSet(STORAGE_KEYS.measurements, params.measurements);
    idbSet(STORAGE_KEYS.pills, params.pills);
    idbSet(STORAGE_KEYS.pillsTaken, params.pillsTaken);
    idbSet(STORAGE_KEYS.settings, params.settings);
  }

  function saveTheme(isDark) {
    const v = isDark ? 'dark' : 'light';
    LS.set(STORAGE_KEYS.theme, v);
    idbSet(STORAGE_KEYS.theme, v);
  }

  // Backwards-compat shim used by legacy inline code: stateStorage.DB.get/set
  const DB = {
    get(key, fallbackValue) { return LS.get(key, fallbackValue); },
    set(key, value) {
      LS.set(key, value);
      idbSet(key, value);
    },
  };

  const api = {
    STORAGE_KEYS,
    DB,
    defaultSettings,
    loadState,
    saveState,
    saveTheme,
    // Async helpers
    idb: { get: idbGet, set: idbSet, getAll: idbGetAll, open: openDB },
    requestPersistence,
  };

  global.HealthProStateStorage = api;
  // Convenience alias used by legacy inline script
  global.stateStorage = api;

  // Async bootstrap: migrate LS → IDB, then rehydrate mirror from IDB.
  (async () => {
    await requestPersistence();
    await migrateFromLocalStorage();
    await rehydrateMirrorFromIdb();
    global.dispatchEvent(new CustomEvent('healthprodb:ready'));
  })();
})(window);
