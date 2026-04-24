// PWA install banner, service worker registration, online/offline indicator.

let deferredPrompt = null;
let newWorker = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.add('show');
});

export function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.remove('show');
  });
}

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  // Skip SW in dev: prevents stale cache of HMR-wrapped modules.
  const host = location.hostname;
  const isDev = host === 'localhost' || host === '127.0.0.1'
    || host.endsWith('.replit.dev') || host.endsWith('.replit.co') || host.endsWith('.repl.co');
  if (isDev) {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
    return;
  }
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          const banner = document.getElementById('updateBanner');
          if (banner) banner.classList.add('show');
        }
      });
    });
  }).catch((e) => console.warn('[SW]', e));
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
}

export function applyUpdate() {
  if (newWorker) newWorker.postMessage({ type: 'SKIP_WAITING' });
  const banner = document.getElementById('updateBanner');
  if (banner) banner.classList.remove('show');
}

export function setupOnlineIndicator() {
  const bar = () => document.getElementById('offlineBar');
  window.addEventListener('online', () => bar()?.classList.remove('show'));
  window.addEventListener('offline', () => bar()?.classList.add('show'));
  if (!navigator.onLine) bar()?.classList.add('show');
}
