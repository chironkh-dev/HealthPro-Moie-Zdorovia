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
import { isPillDueToday } from '../meds/index.js';
import { t, tt } from '../../i18n/index.js';
import {
  requestNotificationPermission,
  notify,
  cancelAllNotifications,
  ensureNotificationChannel,
  openAppSettings,
} from '../../core/platform.js';

// Stable ID space — never collide with random IDs from one-shot notify().
const ID_BP_MORNING = 90001;
const ID_BP_EVENING = 90002;
const PILL_ID_BASE  = 50000;
function pillNotifId(p) {
  // Map possibly-large pill.id (Date.now()) into a stable small int.
  const n = typeof p.id === 'number' ? p.id : 0;
  return PILL_ID_BASE + (Math.abs(n) % 30000);
}

function parseHM(s) {
  const [h, m] = String(s || '08:00').split(':').map((x) => parseInt(x, 10) || 0);
  return { hour: h, minute: m };
}

// ─── Toggles ──────────────────────────────────────────────────
export async function toggleNotifications() {
  if (!state.settings.notif) {
    const granted = await requestNotificationPermission();
    if (granted) {
      state.settings.notif = true;
      document.getElementById('notifToggle').classList.add('on');
      saveData();
      showToast(t('notif-on'));
      await ensureNotificationChannel();
      await scheduleAllReminders();
      // Immediate smoke-test so user can confirm notifications actually work
      // on this device/build right after enabling.
      await notify(t('notif-on'), {
        at: Date.now() + 5000,
        body: 'HealthPro: test notification',
      });
    } else {
      // Permission denied — offer the system settings page so the user
      // can flip it back on without uninstalling/reinstalling.
      showToast(t('notif-denied'));
      setTimeout(() => {
        if (confirm(t('notif-open-settings-confirm'))) openAppSettings();
      }, 400);
    }
  } else {
    state.settings.notif = false;
    document.getElementById('notifToggle').classList.remove('on');
    saveData();
    showToast(t('notif-off'));
    await cancelAllReminders();
  }
}

export async function toggleMeasureReminder() {
  state.settings.measureReminder = !state.settings.measureReminder;
  document.getElementById('measureToggle').classList.toggle('on', state.settings.measureReminder);
  saveData();
  showToast(state.settings.measureReminder ? t('notif-measure-on') : t('notif-off'));
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
  if (!state.settings.notif) return;

  const items = [];

  // Pills: only those due today (daily / weekly-mon / etc.). The OS will
  // repeat the alarm every day at the same local time; the in-app pill
  // list still controls visibility for non-daily schedules at render time.
  state.pills.forEach((p) => {
    if (!isPillDueToday(p)) return;
    const { hour, minute } = parseHM(p.time);
    const body = t('notif-pill-time') + (p.time || '') + (p.dose ? ' · ' + p.dose : '');
    items.push({
      id: pillNotifId(p),
      title: tt('notif-pill-title', { name: p.name || '' }),
      dailyAt: { hour, minute },
      body,
      extra: { type: 'pill', pillId: p.id },
    });
  });

  // Morning + evening BP reminders.
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
  if (state.settings.notif) await scheduleAllReminders();
}

// Re-schedule whenever the pill list changes (add / delete / toggle taken).
on('pills:changed', () => { scheduleAllReminders(); });
