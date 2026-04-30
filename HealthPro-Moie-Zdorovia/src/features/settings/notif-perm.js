// One-shot notification permission modal shown after the user accepts the
// medical disclaimer. Uses platform.prefs to remember whether we have already
// asked, so we never prompt twice.

import { state, saveData, showToast } from '../../core/state.js';
import { t } from '../../i18n/index.js';
import { prefs, requestNotificationPermission } from '../../core/platform.js';

const PREF_KEY = 'notif_permission_asked';

function _show() {
  const m = document.getElementById('notifPermModal');
  if (!m) return false;
  m.classList.add('show');
  document.body.style.overflow = 'hidden';
  return true;
}

function _hide() {
  const m = document.getElementById('notifPermModal');
  if (!m) return;
  m.classList.remove('show');
  document.body.style.overflow = '';
}

// Open the modal once (only if we haven't asked before).
export async function maybeShowNotifPermModal() {
  try {
    const asked = await prefs.get(PREF_KEY);
    if (asked != null) return;
    // Defer so the welcome screen has time to fade out.
    setTimeout(() => { _show(); }, 450);
  } catch { /* noop */ }
}

export async function acceptNotifPerm() {
  _hide();
  try { await prefs.set(PREF_KEY, 'true'); } catch {}
  try {
    const granted = await requestNotificationPermission();
    if (granted) {
      state.settings.notif = true;
      const tg = document.getElementById('notifToggle');
      if (tg) tg.classList.add('on');
      saveData();
      showToast(t('notif-on'));
    } else {
      showToast(t('notif-denied'));
    }
  } catch {
    showToast(t('notif-denied'));
  }
}

export async function declineNotifPerm() {
  _hide();
  try { await prefs.set(PREF_KEY, 'false'); } catch {}
  showToast(t('notif-perm-warn'));
}
