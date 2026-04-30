import { state, showToast } from '../../core/state.js';
import { EMERGENCY_PHONE_UA } from '../../core/constants.js';
import { t, tt } from '../../i18n/index.js';
import { getLocale } from '../../core/utils.js';
import { notify } from '../../core/platform.js';

export function checkCritical(s, d) {
  if (s >= 180 || d >= 120) {
    const txt = document.getElementById('criticalText');
    const wrap = document.getElementById('criticalAlert');
    if (txt) {
      txt.textContent = tt('cr-text', { sys: s, dia: d, phone: EMERGENCY_PHONE_UA });
    }
    if (wrap) wrap.classList.add('show');
    if (state.settings.notif) {
      notify(t('cr-notify-title'), tt('cr-notify-body', { sys: s, dia: d, phone: EMERGENCY_PHONE_UA }));
    }
  }
}

export function sendCriticalSMS() {
  const phone = state.settings.emergencyPhone;
  if (!phone) {
    showToast(t('cr-toast-no-phone'));
    return;
  }
  const last = state.measurements[0];
  const msg = encodeURIComponent(
    `${state.settings.emergencyName || 'Увага'}! Критичний тиск ${last?.sys || ''}/${last?.dia || ''} о ${new Date().toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}. HealthPro.`
  );
  window.location.href = `sms:${phone}?body=${msg}`;
}

export function testEmergency() {
  const inp = document.getElementById('emergencyPhone');
  const phone = (inp && inp.value) || state.settings.emergencyPhone;
  if (!phone) {
    showToast(t('cr-toast-no-num'));
    return;
  }
  window.location.href = `sms:${phone}?body=${encodeURIComponent('Тест HealthPro — перевірка зв\'язку. Все гаразд!')}`;
}
