// User profile fields (name, age, height, weight, contacts, normals).

import { state, saveData, showToast } from '../../core/state.js';
import { DEFAULT_STEP_GOAL } from '../../core/constants.js';
import { t } from '../../i18n/index.js';
import { renderEmailSmsTargets } from './email-sms.js';

export function saveProfile() {
  const settings = state.settings;
  const ids = [
    'userName', 'userAge', 'userHeight', 'userWeight', 'userGender',
    'userPhone', 'userEmail', 'userViber', 'userTelegram', 'userWhatsapp',
    'normalSys', 'normalDia', 'normalPulse', 'emergencyPhone', 'emergencyName',
  ];
  const map = {
    userName: 'name', userAge: 'age', userHeight: 'height', userWeight: 'weight', userGender: 'gender',
    userPhone: 'phone', userEmail: 'email', userViber: 'viber', userTelegram: 'telegram', userWhatsapp: 'whatsapp',
    normalSys: 'normalSys', normalDia: 'normalDia', normalPulse: 'normalPulse',
    emergencyPhone: 'emergencyPhone', emergencyName: 'emergencyName',
  };
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) settings[map[id]] = el.value;
  });
  saveData();
  showToast(t('profile-toast-saved'));
  updateHeader();
  try { renderEmailSmsTargets(); } catch { /* noop */ }
}

export function updateHeader() {
  if (state.settings.name) {
    const el = document.getElementById('headerUser');
    if (el) el.textContent = state.settings.name;
  }
}

export function loadProfileFields() {
  const settings = state.settings;
  const fields = {
    userName: 'name', userAge: 'age', userHeight: 'height', userWeight: 'weight', userGender: 'gender',
    userPhone: 'phone', userEmail: 'email', userViber: 'viber', userTelegram: 'telegram', userWhatsapp: 'whatsapp',
    normalSys: 'normalSys', normalDia: 'normalDia', normalPulse: 'normalPulse',
    emergencyPhone: 'emergencyPhone', emergencyName: 'emergencyName',
  };
  Object.entries(fields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.value = settings[key] || '';
  });
  const m = document.getElementById('morningTime');
  if (m) m.value = settings.morningTime || '08:00';
  const e = document.getElementById('eveningTime');
  if (e) e.value = settings.eveningTime || '20:00';
  const sg = document.getElementById('stepGoalInput');
  if (sg) sg.value = settings.stepGoal || DEFAULT_STEP_GOAL;
  try { renderEmailSmsTargets(); } catch { /* noop */ }
}
