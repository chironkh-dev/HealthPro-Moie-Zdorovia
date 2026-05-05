// Pill & blood-pressure reminders.
//
// Round 5 — спрощена логіка тоглу пігулок (без ExactAlarm перевірки).
// Нагадування плануються через @capacitor/local-notifications з dailyAt
// (AlarmManager, щоденно). Тригери перепланування:
//   • toggleNotifications()
//   • toggleMeasureReminder()
//   • saveReminderTimes()
//   • on('pills:changed')

import { state, saveData, showToast } from '../../core/state.js';
import { on } from '../../core/state.js';
import { t, tt } from '../../i18n/index.js';
import { isPillDueToday } from '../meds/index.js';
import {
  requestNotificationPermission,
  notify,
  cancelAllNotifications,
  ensureNotificationChannel,
  openAppSettings,
  addNotificationReceivedListener
} from '../../core/platform.js';

// Stable ID space — never collide with random IDs from one-shot notify().
const ID_BP_MORNING = 90001;
const ID_BP_EVENING = 90002;
const PILL_ID_BASE  = 91000;

function parseHM(s) {
  const [h, m] = String(s || '08:00').split(':').map((x) => parseInt(x, 10) || 0);
  return { hour: h, minute: m };
}

// ─── Тогл 1: Нагадування про ліки ─────────────────────────────
export async function toggleNotifications() {
  const next = !state.settings.pillReminder;

  if (!next) {
    state.settings.pillReminder = false;
    document.getElementById('notifToggle')?.classList.remove('on');
    saveData();
    showToast(t('notif-off'));
    await scheduleAllReminders();
    return;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    showToast(t('notif-denied'));
    setTimeout(() => {
      if (confirm(t('notif-open-settings-confirm'))) openAppSettings();
    }, 400);
    return;
  }

  state.settings.pillReminder = true;
  document.getElementById('notifToggle')?.classList.add('on');
  saveData();
  showToast(t('notif-pill-on'));
  await ensureNotificationChannel();
  await scheduleAllReminders();
}

// ─── Тогл 2: Нагадування про вимір тиску ──────────────────────
export async function toggleMeasureReminder() {
  const next = !state.settings.measureReminder;
  if (!next) {
    state.settings.measureReminder = false;
    document.getElementById('measureToggle').classList.remove('on');
    saveData();
    showToast(t('notif-off'));
    await scheduleAllReminders();
    return;
  }

  const morning = document.getElementById('morningTime')?.value || state.settings.morningTime || '';
  const evening = document.getElementById('eveningTime')?.value || state.settings.eveningTime || '';
  if (!morning || !evening) {
    showToast(t('notif-set-times-first'));
    return;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    showToast(t('notif-denied'));
    setTimeout(() => {
      if (confirm(t('notif-open-settings-confirm'))) openAppSettings();
    }, 400);
    return;
  }

  state.settings.measureReminder = true;
  document.getElementById('measureToggle').classList.add('on');
  saveData();
  showToast(t('notif-measure-on'));
  await ensureNotificationChannel();
  await scheduleAllReminders();
}

export async function saveReminderTimes() {
  state.settings.morningTime = document.getElementById('morningTime').value;
  state.settings.eveningTime = document.getElementById('eveningTime').value;
  saveData();
  showToast(t('notif-time-saved'));
  await scheduleAllReminders();
}

// ─── Core re-scheduler ────────────────────────────────────────
export async function scheduleAllReminders() {
  await cancelAllNotifications();
  if (!state.settings.measureReminder && !state.settings.pillReminder) return;

  const items = [];

  // ── BP: ранок + вечір ─────────────────────────────────────
  if (state.settings.measureReminder) {
    const m = parseHM(state.settings.morningTime || '08:00');
    const e = parseHM(state.settings.eveningTime || '20:00');
    items.push({
      id: ID_BP_MORNING,
      title: t('notif-bp-title'),
      dailyAt: m,
      body: t('notif-bp-body'),
      extra: { type: 'bp', slot: 'morning' },
    });
    items.push({
      id: ID_BP_EVENING,
      title: t('notif-bp-title'),
      dailyAt: e,
      body: t('notif-bp-body'),
      extra: { type: 'bp', slot: 'evening' },
    });
  }

  // ── Пігулки — лише ті, що заплановані на сьогодні ────────
  if (state.settings.pillReminder) {
    (state.pills || []).forEach((p) => {
      if (!isPillDueToday(p)) return;
      const { hour, minute } = parseHM(p.time);
      items.push({
        id: PILL_ID_BASE + (Math.abs(p.id || 0) % 30000),
        title: tt('notif-pill-title', { name: p.name || '' }),
        dailyAt: { hour, minute },
        body: p.dose ? p.dose : t('notif-pill-body'),
        extra: { type: 'pill', pillId: p.id },
      });
    });
  }

  for (const it of items) {
    try { await notify(it.title, it); } catch { /* noop */ }
  }
}

export async function cancelAllReminders() {
  await cancelAllNotifications();
}

// Backwards-compat shim: app.js still imports `scheduleNotifications`.
export async function scheduleNotifications() {
  if (state.settings.measureReminder) await scheduleAllReminders();
}

// Перепланувати при зміні списку ліків.
on('pills:changed', () => { scheduleAllReminders(); });

// Після спрацювання BP-нагадування — перепланувати (dailyAt сам по собі
// повторюється, але shim залишений для сумісності).
addNotificationReceivedListener((notification) => {
  if (notification.extra?.type === 'bp') {
    scheduleAllReminders();
  }
});
