// Wipe all stored data and reload.

import { state, saveData } from '../../core/state.js';
import { defaultSettings } from '../../core/storage.js';

export function clearAllData() {
  if (!confirm('Видалити ВСІ дані? Незворотно!')) return;
  state.measurements.length = 0;
  state.pills.length = 0;
  Object.keys(state.pillsTaken).forEach((k) => delete state.pillsTaken[k]);
  Object.keys(state.settings).forEach((k) => delete state.settings[k]);
  Object.assign(state.settings, defaultSettings);
  saveData();
  location.reload();
}
