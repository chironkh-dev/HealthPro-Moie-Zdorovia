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
// On native (Android) — uses @capacitor/local-notifications via ESM import.
// On web — falls back to Notification API.
async function _ln() {
  if (!isNative()) return null;
  try {
    const mod = await import('@capacitor/local-notifications');
    return mod.LocalNotifications || null;
  } catch { return null; }
}

export async function requestNotificationPermission() {
  const ln = await _ln();
  if (ln && typeof ln.requestPermissions === 'function') {
    try {
      const r = await ln.requestPermissions();
      return !!(r && (r.display === 'granted' || r.granted === true));
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

export async function checkNotificationPermission() {
  const ln = await _ln();
  if (ln && typeof ln.checkPermissions === 'function') {
    try {
      const r = await ln.checkPermissions();
      return !!(r && (r.display === 'granted' || r.granted === true));
    } catch { return false; }
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission === 'granted';
  }
  return false;
}

// Schedule a notification. options.at = Date for future schedule (native only).
export async function notify(title, options = {}) {
  const ln = await _ln();
  if (ln && typeof ln.schedule === 'function') {
    try {
      const id = options.id != null ? options.id : Math.floor(Math.random() * 1e9);
      await ln.schedule({
        notifications: [{
          id,
          title,
          body: options.body || '',
          schedule: options.at ? { at: options.at } : undefined,
          smallIcon: 'ic_stat_icon_config_sample',
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

// Cancel previously-scheduled notification(s) by id(s).
export async function cancelNotifications(ids) {
  const ln = await _ln();
  if (!ln || typeof ln.cancel !== 'function' || !ids || !ids.length) return false;
  try {
    await ln.cancel({ notifications: ids.map((id) => ({ id })) });
    return true;
  } catch { return false; }
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

// ─── File download / share ─────────────────────────────────────
// On web: anchor click fallback.
// On native: writes to Documents via @capacitor/filesystem and opens
// a Share sheet via @capacitor/share. Returns a promise-resolves-bool.
function _blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = String(r.result || '');
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function _nativeDownload(filename, blob, mime) {
  try {
    const fsMod = await import('@capacitor/filesystem');
    const Filesystem = fsMod.Filesystem;
    const Directory = fsMod.Directory;
    const Encoding = fsMod.Encoding;
    if (!Filesystem) return false;

    const isText = /^text\/|json|csv|xml/i.test(mime);
    let data;
    let encoding;
    if (isText && typeof blob.text === 'function') {
      data = await blob.text();
      encoding = Encoding ? Encoding.UTF8 : 'utf8';
    } else {
      data = await _blobToBase64(blob);
      encoding = undefined; // base64
    }

    const writeRes = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory ? Directory.Documents : 'DOCUMENTS',
      ...(encoding ? { encoding } : {}),
      recursive: true,
    });

    try {
      const shMod = await import('@capacitor/share');
      const Share = shMod.Share;
      if (Share && typeof Share.share === 'function' && writeRes && writeRes.uri) {
        await Share.share({
          title: filename,
          url: writeRes.uri,
          dialogTitle: filename,
        });
      }
    } catch { /* sharing optional */ }
    return true;
  } catch (e) {
    return false;
  }
}

export async function download(filename, blobOrText, mime = 'application/octet-stream') {
  const blob = blobOrText instanceof Blob
    ? blobOrText
    : new Blob([blobOrText], { type: mime });
  if (isNative()) {
    const ok = await _nativeDownload(filename, blob, mime);
    if (ok) return true;
    // fall through to web fallback if native write/share failed
  }
  try {
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

// ─── Hardware back button (Android) ────────────────────────────
// Returns an unsubscribe fn. Web is a no-op (browser handles its own back).
export function onBackButton(handler) {
  if (typeof handler !== 'function') return () => {};
  const app = getPlugin('App');
  if (!app || typeof app.addListener !== 'function') return () => {};
  try {
    const h = app.addListener('backButton', (ev) => {
      try { handler(ev || { canGoBack: false }); } catch { /* noop */ }
    });
    return () => { try { h.remove && h.remove(); } catch {} };
  } catch { return () => {}; }
}

// Minimize app (Android only — sends app to background instead of closing).
export async function minimizeApp() {
  const app = getPlugin('App');
  if (app && typeof app.minimizeApp === 'function') {
    try { await app.minimizeApp(); return true; } catch { return false; }
  }
  return false;
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
