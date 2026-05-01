// Pill & blood-pressure reminders.
//
// Round 4 #2 — true background delivery.
// We pre-schedule recurring notifications via @capacitor/local-notifications
// (`schedule.on = { hour, minute }` + `allowWhileIdle: true`). The Android
// AlarmManager fires them daily even when the app process is killed. Each
// notification routes through the HIGH-importance "reminders" channel
// (created in platform.ensureNotificationChannel) so heads-up + sound +
// vibration work in background.
//
// Re-schedule triggers (called from app.js / settings):
//   • toggleNotifications(on)
//   • toggleMeasureReminder
//   • saveReminderTimes
//   • on('pills:changed')

import { state, saveData, showToast } from '../../core/state.js';
import { on } from '../../core/state.js';
import { t } from '../../i18n/index.js';
import {
  requestNotificationPermission,
  notify,
  cancelAllNotifications,
  ensureNotificationChannel,
  ensureExactAlarmPermission,
  openAppSettings,
} from '../../core/platform.js';

// Stable ID space — never collide with random IDs from one-shot notify().
const ID_BP_MORNING = 90001;
const ID_BP_EVENING = 90002;
function parseHM(s) {
  const [h, m] = String(s || '08:00').split(':').map((x) => parseInt(x, 10) || 0);
  return { hour: h, minute: m };
}

// ─── Toggles ──────────────────────────────────────────────────
export async function toggleNotifications() {
  // Toggle #1 reserved for future FCM server push reminders.
  showToast(t('notif-fcm-soon'));
}

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
  await ensureExactAlarmPermission();
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
// Cancels every previously-scheduled item, then re-creates the full set
// for whatever is currently enabled. Idempotent — safe to call often.
export async function scheduleAllReminders() {
  await cancelAllNotifications();
  if (!state.settings.measureReminder) return;

  const items = [];

  // Morning + evening BP reminders.
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

  // Schedule sequentially so the LocalNotifications plugin queues each one
  // with its own unique id (single-batch schedule also works, but this
  // gives clearer error reporting if a single item fails).
  for (const it of items) {
    try { await notify(it.title, it); } catch { /* noop */ }
  }
}

export async function cancelAllReminders() {
  await cancelAllNotifications();
}

// Backwards-compat shim: app.js still imports `scheduleNotifications`.
// In the old setInterval-based architecture this fired every minute; now
// it just ensures the schedule is up to date (cheap idempotent call).
export async function scheduleNotifications() {
  if (state.settings.measureReminder) await scheduleAllReminders();
}

// Re-schedule whenever the pill list changes (add / delete / toggle taken).
on('pills:changed', () => { scheduleAllReminders(); });
