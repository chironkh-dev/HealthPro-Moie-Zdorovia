// Email / SMS reminder helpers (Bug Fix Round 3 #11).
// Use mailto: / sms: schemes via platform.openUrl so native intent picker
// (Email / SMS apps) opens on Android. Targets are pulled from profile.

import { state, showToast } from '../../core/state.js';
import { t } from '../../i18n/index.js';
import { openUrl } from '../../core/platform.js';

function getEmail() {
  return (state.settings && (state.settings.email || state.settings.userEmail) || '').trim();
}

function getPhone() {
  return (state.settings && (state.settings.phone || state.settings.userPhone) || '').trim();
}

export async function sendEmailReminder() {
  const email = getEmail();
  if (!email) {
    showToast(t('notif-no-email'));
    return;
  }
  const subject = encodeURIComponent(t('notif-email-subject'));
  const body = encodeURIComponent(t('notif-email-body'));
  await openUrl(`mailto:${email}?subject=${subject}&body=${body}`);
}

export async function sendSmsReminder() {
  const phone = getPhone();
  if (!phone) {
    showToast(t('notif-no-phone'));
    return;
  }
  const body = encodeURIComponent(t('notif-sms-body'));
  await openUrl(`sms:${phone}?body=${body}`);
}

// Render the "current targets" line (Email / phone) inside the Email/SMS card.
// Called after profile save and on language change.
export function renderEmailSmsTargets() {
  const el = document.getElementById('emailSmsTargets');
  if (!el) return;
  const email = getEmail();
  const phone = getPhone();
  if (!email && !phone) {
    el.textContent = t('notif-targets-empty');
    return;
  }
  const parts = [];
  if (email) parts.push(`${t('notif-targets-email')} ${email}`);
  if (phone) parts.push(`${t('notif-targets-phone')} ${phone}`);
  el.textContent = parts.join(' • ');
}
