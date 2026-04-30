// Push & in-app reminders for pills + measurements.

import { state, saveData, showToast, today } from '../../core/state.js';
import { isPillDueToday } from '../meds/index.js';
import { t } from '../../i18n/index.js';
import { requestNotificationPermission, notify } from '../../core/platform.js';

const _firedReminders = new Set();

export function toggleNotifications() {
  if (!state.settings.notif) {
    requestNotificationPermission().then((granted) => {
      if (granted) {
        state.settings.notif = true;
        document.getElementById('notifToggle').classList.add('on');
        saveData();
        showToast(t('notif-on'));
        setTimeout(() => notify(t('notif-confirm-title'), {
          body: t('notif-confirm-body'),
          icon: 'icons/icon-192.png',
        }), 800);
      } else {
        showToast(t('notif-denied'));
      }
    });
  } else {
    state.settings.notif = false;
    document.getElementById('notifToggle').classList.remove('on');
    saveData();
    showToast(t('notif-off'));
  }
}

export function toggleMeasureReminder() {
  state.settings.measureReminder = !state.settings.measureReminder;
  document.getElementById('measureToggle').classList.toggle('on', state.settings.measureReminder);
  saveData();
  showToast(state.settings.measureReminder ? t('notif-measure-on') : t('notif-off'));
}

export function saveReminderTimes() {
  state.settings.morningTime = document.getElementById('morningTime').value;
  state.settings.eveningTime = document.getElementById('eveningTime').value;
  saveData();
  showToast(t('notif-time-saved'));
}

function _firePillReminder(p) {
  const key = 'pill-' + p.id + '-' + today() + '-' + p.time;
  if (_firedReminders.has(key)) return;
  _firedReminders.add(key);
  if (state.settings.notif) {
    try {
      notify(`💊 ${p.name}`, {
        body: t('notif-pill-time') + p.time + (p.dose ? ' · ' + p.dose : ''),
        icon: 'icons/icon-192.png',
        tag: 'pill-' + p.id,
        vibrate: [200, 100, 200],
        requireInteraction: true,
      });
    } catch (e) { /* noop */ }
  }
  showToast(t('notif-pill-toast') + p.name + (p.dose ? ' (' + p.dose + ')' : ''));
  if (navigator.vibrate) {
    try { navigator.vibrate([200, 100, 200, 100, 200]); } catch (e) { /* noop */ }
  }
}

export function scheduleNotifications() {
  const now = new Date();
  const ns = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  const td = today();
  if (!state.pillsTaken[td]) state.pillsTaken[td] = {};
  state.pills
    .filter((p) => isPillDueToday(p) && p.time === ns && !state.pillsTaken[td][p.id])
    .forEach(_firePillReminder);
  if (state.settings.measureReminder) {
    const h = now.getHours();
    const m = now.getMinutes();
    const [mh, mm] = (state.settings.morningTime || '08:00').split(':').map(Number);
    const [eh, em] = (state.settings.eveningTime || '20:00').split(':').map(Number);
    if ((h === mh && m === mm) || (h === eh && m === em)) {
      const key = 'bp-' + td + '-' + ns;
      if (!_firedReminders.has(key)) {
        _firedReminders.add(key);
        if (state.settings.notif) {
          try {
            notify(t('notif-bp-title'), {
              body: t('notif-bp-body'),
              icon: 'icons/icon-192.png',
              tag: 'bp-reminder',
            });
          } catch (e) { /* noop */ }
        }
        showToast(t('notif-bp-toast'));
        if (navigator.vibrate) {
          try { navigator.vibrate([300, 100, 300]); } catch (e) { /* noop */ }
        }
      }
    }
  }
}
