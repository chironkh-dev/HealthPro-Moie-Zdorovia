(function initCloudSync(global) {
  const API_BASE = '/api';
  const DEBOUNCE_MS = 1500;
  const STATUS_EL_ID = 'cloudSyncStatus';

  let pendingTimer = null;
  let inFlight = false;
  let lastSyncedAt = null;
  let lastError = null;
  let onlineListeners = false;

  function setStatus(state, info) {
    const el = document.getElementById(STATUS_EL_ID);
    if (!el) return;
    const map = {
      idle: { txt: '☁️ Готово', cls: 'sync-idle' },
      saving: { txt: '☁️ Зберігаю...', cls: 'sync-saving' },
      saved: { txt: '✅ Збережено в хмарі', cls: 'sync-ok' },
      offline: { txt: '⚠️ Офлайн (локально)', cls: 'sync-offline' },
      error: { txt: '⚠️ Помилка хмари', cls: 'sync-err' },
    };
    const e = map[state] || map.idle;
    el.textContent = info ? `${e.txt} · ${info}` : e.txt;
    el.className = 'cloud-sync-status ' + e.cls;
  }

  async function fetchJson(url, opts) {
    const r = await fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts && opts.headers) },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  function getCurrentState() {
    const ss = global.stateStorage;
    if (ss && typeof ss.loadState === 'function') {
      return ss.loadState();
    }
    // Fallback: read directly from localStorage with default keys
    const keys = global.__HP_STORAGE_KEYS || {
      measurements: 'measurements', pills: 'pills',
      pillsTaken: 'pillsTaken', settings: 'settings',
    };
    const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
    return {
      measurements: get(keys.measurements, []),
      pills: get(keys.pills, []),
      pillsTaken: get(keys.pillsTaken, {}),
      settings: get(keys.settings, {}),
    };
  }

  function applyState(state) {
    const ss = global.stateStorage;
    if (ss && typeof ss.saveState === 'function') {
      ss.saveState(state);
    } else {
      const keys = global.__HP_STORAGE_KEYS || {
        measurements: 'measurements', pills: 'pills',
        pillsTaken: 'pillsTaken', settings: 'settings',
      };
      try { localStorage.setItem(keys.measurements, JSON.stringify(state.measurements || [])); } catch {}
      try { localStorage.setItem(keys.pills, JSON.stringify(state.pills || [])); } catch {}
      try { localStorage.setItem(keys.pillsTaken, JSON.stringify(state.pillsTaken || {})); } catch {}
      try { localStorage.setItem(keys.settings, JSON.stringify(state.settings || {})); } catch {}
    }
  }

  async function pushNow() {
    if (inFlight) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    inFlight = true;
    setStatus('saving');
    try {
      const state = getCurrentState();
      const res = await fetchJson(API_BASE + '/backup', {
        method: 'PUT',
        body: JSON.stringify({ state }),
      });
      lastSyncedAt = new Date();
      lastError = null;
      setStatus('saved', 'v' + res.version);
    } catch (e) {
      lastError = e;
      console.warn('[cloud-sync] push failed:', e);
      setStatus('error');
    } finally {
      inFlight = false;
    }
  }

  function scheduleSync() {
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => { pendingTimer = null; pushNow(); }, DEBOUNCE_MS);
  }

  async function pullAndMerge() {
    try {
      const r = await fetchJson(API_BASE + '/backup', { method: 'GET' });
      if (!r || !r.state || r.version === 0) return false;
      const local = getCurrentState();
      const localCount = (local.measurements || []).length + (local.pills || []).length;
      const remoteCount = (r.state.measurements || []).length + (r.state.pills || []).length;
      // If local is empty but remote has data — restore from cloud
      if (localCount === 0 && remoteCount > 0) {
        applyState(r.state);
        console.log('[cloud-sync] restored from cloud', r.version);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[cloud-sync] pull failed:', e);
      return false;
    }
  }

  function attachToSaveData() {
    // Hook into stateStorage.saveState by wrapping it
    const ss = global.stateStorage;
    if (!ss || typeof ss.saveState !== 'function') {
      console.warn('[cloud-sync] stateStorage.saveState not found, retrying...');
      return false;
    }
    if (ss.__cloudSyncWrapped) return true;
    const orig = ss.saveState.bind(ss);
    ss.saveState = function (state) {
      const r = orig(state);
      scheduleSync();
      return r;
    };
    ss.__cloudSyncWrapped = true;
    return true;
  }

  function setupOnlineListeners() {
    if (onlineListeners) return;
    onlineListeners = true;
    window.addEventListener('online', () => { setStatus('idle'); scheduleSync(); });
    window.addEventListener('offline', () => setStatus('offline'));
  }

  async function init() {
    setupOnlineListeners();
    if (!attachToSaveData()) {
      // stateStorage not loaded yet — wait
      const wait = setInterval(() => {
        if (attachToSaveData()) {
          clearInterval(wait);
          finishInit();
        }
      }, 200);
      setTimeout(() => clearInterval(wait), 5000);
      return;
    }
    finishInit();
  }

  async function finishInit() {
    setStatus('idle');
    const restored = await pullAndMerge();
    if (restored) {
      // Trigger UI refresh by reloading data references
      try {
        if (typeof global.location !== 'undefined') {
          // Show toast first then reload
          if (typeof global.showToast === 'function') global.showToast('☁️ Дані відновлено з хмари');
          setTimeout(() => global.location.reload(), 1200);
        }
      } catch {}
    } else {
      // Initial backup of any existing local data
      const s = getCurrentState();
      if ((s.measurements || []).length || (s.pills || []).length || Object.keys(s.settings || {}).length) {
        scheduleSync();
      }
    }
  }

  global.cloudSync = {
    pushNow,
    pullAndMerge,
    getStatus() { return { lastSyncedAt, lastError, inFlight }; },
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})(window);
