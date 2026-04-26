import { bootstrapStorage } from './core/storage.js';
import { bootApp } from './app.js';
import './features/meds/index.js';
import './features/steps/index.js';

// Kick off async storage migration (LS → IDB) in background.
bootstrapStorage();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}

window.addEventListener('resize', () => {
  // Chart re-render is handled inside app.js via its own resize listener.
});
