// Platform abstraction layer.
// Provides one API surface for web (PWA) and native Capacitor builds.
// Each function falls back to a web implementation when running in the
// browser, and switches to a Capacitor plugin on native builds (when the
// plugin module is present). Feature modules MUST go through this file
// rather than calling browser/native APIs directly.

// ─── Detection ─────────────────────────────────────────────────
export function isNative() {
  return !!(typeof window !== 'undefined' && window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
}

export function getPlatform() {
  if (isNative() && typeof window.Capacitor.getPlatform === 'function') {
    return window.Capacitor.getPlatform(); // 'ios' | 'android'
  }
  return 'web';
}

export function isWeb() { return !isNative(); }

// Resolve a registered Capacitor plugin without throwing if missing.
function getPlugin(name) {
  try {
    if (!isNative()) return null;
    const reg = window.Capacitor && window.Capacitor.Plugins;
    return (reg && reg[name]) || null;
  } catch { return null; }
}

// ─── Notifications ─────────────────────────────────────────────
export async function requestNotificationPermission() {
  const ln = getPlugin('LocalNotifications');
  if (ln && typeof ln.requestPermissions === 'function') {
    try {
      const r = await ln.requestPermissions();
      return r && (r.display === 'granted' || r.granted === true);
    } catch { return false; }
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
      const p = await Notification.requestPermission();
      return p === 'granted';
    } catch { return false; }
  }
  return false;
}

export async function notify(title, options = {}) {
  const ln = getPlugin('LocalNotifications');
  if (ln && typeof ln.schedule === 'function') {
    try {
      await ln.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 1e9),
          title,
          body: options.body || '',
          schedule: options.at ? { at: options.at } : undefined,
        }],
      });
      return true;
    } catch { /* fall through */ }
  }
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, options);
      return true;
    } catch { return false; }
  }
  return false;
}

// ─── Vibration ─────────────────────────────────────────────────
export function vibrate(pattern = 200) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      return navigator.vibrate(pattern);
    }
  } catch { /* noop */ }
  return false;
}

// ─── Sharing ───────────────────────────────────────────────────
export async function share(data) {
  const sh = getPlugin('Share');
  if (sh && typeof sh.share === 'function') {
    try { await sh.share(data); return true; } catch { return false; }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try { await navigator.share(data); return true; } catch { return false; }
  }
  return false;
}

// ─── File download (web). On native, callers should use Filesystem plugin. ──
export function download(filename, blobOrText, mime = 'application/octet-stream') {
  try {
    const blob = blobOrText instanceof Blob
      ? blobOrText
      : new Blob([blobOrText], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch { return false; }
}

// ─── Preferences (key/value persistence) ───────────────────────
// Native uses Capacitor Preferences; web uses localStorage.
export const prefs = {
  async get(key, fallback = null) {
    const p = getPlugin('Preferences');
    if (p && typeof p.get === 'function') {
      try {
        const r = await p.get({ key });
        return r && r.value != null ? r.value : fallback;
      } catch { /* fall through */ }
    }
    try {
      const v = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      return v != null ? v : fallback;
    } catch { return fallback; }
  },
  async set(key, value) {
    const p = getPlugin('Preferences');
    if (p && typeof p.set === 'function') {
      try { await p.set({ key, value: String(value) }); return true; } catch { /* fall through */ }
    }
    try { localStorage.setItem(key, String(value)); return true; } catch { return false; }
  },
  async remove(key) {
    const p = getPlugin('Preferences');
    if (p && typeof p.remove === 'function') {
      try { await p.remove({ key }); return true; } catch { /* fall through */ }
    }
    try { localStorage.removeItem(key); return true; } catch { return false; }
  },
};

// ─── App lifecycle ─────────────────────────────────────────────
// Fires the handler when the app returns to foreground.
export function onResume(handler) {
  if (typeof handler !== 'function') return () => {};
  const app = getPlugin('App');
  if (app && typeof app.addListener === 'function') {
    try {
      const h = app.addListener('appStateChange', (s) => { if (s && s.isActive) handler(); });
      return () => { try { h.remove && h.remove(); } catch {} };
    } catch { /* fall through */ }
  }
  const onVisibility = () => { if (document.visibilityState === 'visible') handler(); };
  document.addEventListener('visibilitychange', onVisibility);
  return () => document.removeEventListener('visibilitychange', onVisibility);
}

// ─── Online status ─────────────────────────────────────────────
export function isOnline() {
  try { return typeof navigator === 'undefined' ? true : navigator.onLine !== false; }
  catch { return true; }
}

export function onConnectivityChange(handler) {
  if (typeof handler !== 'function') return () => {};
  const on = () => handler(true);
  const off = () => handler(false);
  window.addEventListener('online', on);
  window.addEventListener('offline', off);
  return () => {
    window.removeEventListener('online', on);
    window.removeEventListener('offline', off);
  };
}
