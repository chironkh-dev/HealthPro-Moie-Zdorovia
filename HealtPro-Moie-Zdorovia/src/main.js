import { createAppState } from './core/state.js';
import { createStorage } from './core/storage.js';
import { createPlatform } from './core/platform.js';
import { registerServiceWorker } from './pwa/sw-register.js';
import { getDictionaries } from './i18n/index.js';

const appState = createAppState();
const storage = createStorage();
const platform = createPlatform();
const dictionaries = getDictionaries();

window.__HP_STORAGE_KEYS = storage.keys;

// Temporary bridge: keep legacy inline-script app untouched
// while exposing modular primitives for incremental migration.
window.HealthProModules = {
  appState,
  storage,
  platform,
  dictionaries,
};

registerServiceWorker(platform);
