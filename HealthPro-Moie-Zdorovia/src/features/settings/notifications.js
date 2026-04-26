// Push & in-app reminders for pills + measurements.

import { state, saveData, showToast, today } from '../../core/state.js';
import { isPillDueToday } from '../meds/index.js';

const _firedReminders = new Set();
const isRu = () => state.lang === 'ru';

export function toggleNotifications() {
  if (!state.settings.notif) {
    if (!('Notification' in window)) {
      showToast(isRu() ? '❌ Браузер не поддерживает уведомления' : '❌ Браузер не підтримує сповіщення');
      return;
    }
    Notification.requestPermission().then((p) => {
      if (p === 'granted') {
        state.settings.notif = true;
        document.getElementById('notifToggle').classList.add('on');
        saveData();
        showToast(isRu() ? '🔔 Уведомления включены!' : '🔔 Сповіщення увімкнено!');
        setTimeout(() => new Notification('✅ HealthPro', {
          body: isRu() ? 'Уведомления настроены!' : 'Сповіщення налаштовані!',
          icon: 'icons/icon-192.png',
        }), 800);
      } else showToast(isRu() ? '❌ Доступ отклонён' : '❌ Дозвіл відхилено');
    });
  } else {
    state.settings.notif = false;
    document.getElementById('notifToggle').classList.remove('on');
    saveData();
    showToast(isRu() ? '🔕 Выключено' : '🔕 Вимкнено');
  }
}

export function toggleMeasureReminder() {
  state.settings.measureReminder = !state.settings.measureReminder;
  document.getElementById('measureToggle').classList.toggle('on', state.settings.measureReminder);
  saveData();
  showToast(state.settings.measureReminder
    ? (isRu() ? '🔔 Напоминания об измерении включены!' : '🔔 Нагадування про вимір увімкнено!')
    : (isRu() ? '🔕 Выключено' : '🔕 Вимкнено'));
}

export function saveReminderTimes() {
  state.settings.morningTime = document.getElementById('morningTime').value;
  state.settings.eveningTime = document.getElementById('eveningTime').value;
  saveData();
  showToast(isRu() ? '✅ Время сохранено' : '✅ Час збережено');
}

function _firePillReminder(p) {
  const key = 'pill-' + p.id + '-' + today() + '-' + p.time;
  if (_firedReminders.has(key)) return;
  _firedReminders.add(key);
  const canPush = ('Notification' in window) && Notification.permission === 'granted' && state.settings.notif;
  if (canPush) {
    try {
      new Notification(`💊 ${p.name}`, {
        body: (isRu() ? 'Время приёма ' : 'Час прийому ') + p.time + (p.dose ? ' · ' + p.dose : ''),
        icon: 'icons/icon-192.png',
        tag: 'pill-' + p.id,
        vibrate: [200, 100, 200],
        requireInteraction: true,
      });
    } catch (e) { /* noop */ }
  }
  showToast((isRu() ? '💊 Время принять: ' : '💊 Час прийняти: ') + p.name + (p.dose ? ' (' + p.dose + ')' : ''));
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
        if ('Notification' in window && Notification.permission === 'granted' && state.settings.notif) {
          try {
            new Notification(isRu() ? '🩺 Измерение давления' : '🩺 Вимір тиску', {
              body: isRu() ? 'Время для ежедневного измерения давления' : 'Час для щоденного виміру тиску',
              icon: 'icons/icon-192.png',
              tag: 'bp-reminder',
            });
          } catch (e) { /* noop */ }
        }
        showToast(isRu() ? '🩺 Время измерить давление' : '🩺 Час для виміру тиску');
        if (navigator.vibrate) {
          try { navigator.vibrate([300, 100, 300]); } catch (e) { /* noop */ }
        }
      }
    }
  }
}
