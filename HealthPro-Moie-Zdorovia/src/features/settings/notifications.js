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
  addNotificationReceivedListener
} from '../../core/platform.js';

// Stable ID space — never collide with random IDs from one-shot notify().
const ID_BP_MORNING = 90001;
const ID_BP_EVENING = 90002;
// Pill IDs: 91000–99999 (deterministic hash від pill.id)
const PILL_ID_BASE = 91000;

function parseHM(s) {
  const [h, m] = String(s || '08:00').split(':').map((x) => parseInt(x, 10) || 0);
  return { hour: h, minute: m };
}

// djb2-variant: pill.id (string) → стабільний int у діапазоні [0, 8999]
function pillIdHash(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 9000;
}

// ─── Toggles ──────────────────────────────────────────────────
export async function toggleNotifications() {
  const next = !state.settings.pillReminder;

  // ── Вимкнення ─────────────────────────────────────────────
  if (!next) {
    state.settings.pillReminder = false;
    document.getElementById('notifToggle')?.classList.remove('on');
    saveData();
    showToast(t('notif-off'));
    await scheduleAllReminders();
    return;
  }

  // ── Вмикання ──────────────────────────────────────────────
  // Крок 1: дозвіл на сповіщення
  const granted = await requestNotificationPermission();
  if (!granted) {
    showToast(t('notif-denied'));
    setTimeout(() => {
      if (confirm(t('notif-open-settings-confirm'))) openAppSettings();
    }, 400);
    return;
  }

  await ensureNotificationChannel();

  // Крок 2: Android 12+ — SCHEDULE_EXACT_ALARM
  const exactOk = await ensureExactAlarmPermission();
  if (!exactOk) {
    // Система відкрила налаштування; користувач має надати дозвіл і натиснути тогл ще раз.
    showToast(t('notif-exact-alarm-needed'), 6000);
    return;
  }

  state.settings.pillReminder = true;
  document.getElementById('notifToggle')?.classList.add('on');
  saveData();
  showToast(t('notif-pill-on'));
  await scheduleAllReminders();
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

  // ── BP: ранок + вечір (тільки якщо measureReminder увімкнено) ─
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

  // ── Пігулки (тільки якщо pillReminder увімкнено) ──────────
  if (state.settings.pillReminder) {
    const pills = Array.isArray(state.pills) ? state.pills : [];
    for (const p of pills) {
      if (!p || !p.time) continue;
      const { hour, minute } = parseHM(p.time);
      items.push({
        id: PILL_ID_BASE + pillIdHash(String(p.id)),
        title: t('notif-pill-title').replace('{{name}}', p.name || ''),
        dailyAt: { hour, minute },
        body: t('notif-pill-body'),
        extra: { type: 'pill', pillId: p.id },
      });
    }
  }

  // Плануємо послідовно — краще відстежувати помилки по кожному елементу.
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

// Re-schedule whenever pill list changes (kept for compatibility hooks).
on('pills:changed', () => { scheduleAllReminders(); });

// Після спрацювання — перепланувати наступне на завтра
addNotificationReceivedListener((notification) => {
  if (notification.extra?.type === 'bp') {
    scheduleAllReminders();
  }
});