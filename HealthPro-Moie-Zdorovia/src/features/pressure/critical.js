import { state, showToast } from '../../core/state.js';
import { EMERGENCY_PHONE_UA } from '../../core/constants.js';

export function checkCritical(s, d) {
  if (s >= 180 || d >= 120) {
    const isRu = state.lang === 'ru';
    const txt = document.getElementById('criticalText');
    const wrap = document.getElementById('criticalAlert');
    if (txt) {
      txt.textContent = isRu
        ? `Критическое давление: ${s}/${d}! Немедленно обратитесь к врачу или вызовите ${EMERGENCY_PHONE_UA}.`
        : `Критичний тиск: ${s}/${d}! Негайно зверніться до лікаря або викличте ${EMERGENCY_PHONE_UA}.`;
    }
    if (wrap) wrap.classList.add('show');
    if (state.settings.notif && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(isRu ? '🚨 Критическое давление!' : '🚨 Критичний тиск!', {
        body: isRu ? `Давление ${s}/${d} — вызывайте ${EMERGENCY_PHONE_UA}!` : `Тиск ${s}/${d} — виклич ${EMERGENCY_PHONE_UA}!`,
        icon: 'icons/icon-192.png',
        requireInteraction: true,
        vibrate: [500, 100, 500, 100, 500],
      });
    }
  }
}

export function sendCriticalSMS() {
  const isRu = state.lang === 'ru';
  const phone = state.settings.emergencyPhone;
  if (!phone) {
    showToast(isRu ? '⚠️ Укажите телефон в Профиле' : '⚠️ Вкажіть телефон у Профілі');
    return;
  }
  const last = state.measurements[0];
  const msg = encodeURIComponent(
    `${state.settings.emergencyName || 'Увага'}! Критичний тиск ${last?.sys || ''}/${last?.dia || ''} о ${new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}. HealthPro.`
  );
  window.location.href = `sms:${phone}?body=${msg}`;
}

export function testEmergency() {
  const isRu = state.lang === 'ru';
  const inp = document.getElementById('emergencyPhone');
  const phone = (inp && inp.value) || state.settings.emergencyPhone;
  if (!phone) {
    showToast(isRu ? '⚠️ Введите номер' : '⚠️ Введіть номер');
    return;
  }
  window.location.href = `sms:${phone}?body=${encodeURIComponent('Тест HealthPro — перевірка зв\'язку. Все гаразд!')}`;
}
