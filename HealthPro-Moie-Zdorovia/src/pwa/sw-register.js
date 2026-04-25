export function registerServiceWorker(platform) {
  if (platform?.isNative) return;
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Keep silent: legacy app already handles update UX.
  });
}
