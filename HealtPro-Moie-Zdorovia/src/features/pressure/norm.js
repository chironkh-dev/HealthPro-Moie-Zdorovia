import { state } from '../../core/state.js';

export function getBPNorm() {
  const isRu = state.lang === 'ru';
  const ns = parseInt(state.settings.normalSys);
  const nd = parseInt(state.settings.normalDia);
  if (ns && nd) {
    return {
      sysOk: ns + 5,
      diaOk: nd + 5,
      sysWarn: ns + 15,
      diaWarn: nd + 10,
      note: isRu ? `личная норма ${ns}/${nd}` : `особиста норма ${ns}/${nd}`,
      personal: true,
    };
  }
  const age = parseInt(state.settings.age) || 50;
  if (age < 18)  return { sysOk: 110, diaOk: 70, sysWarn: 130, diaWarn: 85, note: isRu ? 'нормы до 17 л.'   : 'норми до 17 р.' };
  if (age <= 59) return { sysOk: 120, diaOk: 80, sysWarn: 130, diaWarn: 80, note: isRu ? 'нормы 18–59 л.'   : 'норми 18–59 р.' };
  if (age <= 79) return { sysOk: 130, diaOk: 85, sysWarn: 140, diaWarn: 90, note: isRu ? 'нормы 60–79 л.'   : 'норми 60–79 р.' };
  return            { sysOk: 140, diaOk: 90, sysWarn: 150, diaWarn: 90, note: isRu ? 'нормы 80+ л.'    : 'норми 80+ р.' };
}

export function getBPStatus(s, d) {
  const isRu = state.lang === 'ru';
  if (s < 80 || d < 50) return { label: isRu ? '⬇️ Очень низкое' : '⬇️ Дуже низький', cls: 'badge-warn' };
  if (s < 90 || d < 60) return { label: isRu ? '⬇️ Пониженное'   : '⬇️ Знижений тиск', cls: 'badge-warn' };
  const n = getBPNorm();
  if (s <= n.sysOk && d <= n.diaOk)   return { label: isRu ? '✓ Норма'         : '✓ Норма',           cls: 'badge-ok'   };
  if (s < n.sysWarn && d < n.diaWarn) return { label: isRu ? '⚠ Повышенное'    : '⚠ Підвищений',     cls: 'badge-warn' };
  if (s < 160 && d < 100)             return { label: isRu ? '⚠ Гипертензия І' : '⚠ Гіпертензія І',  cls: 'badge-warn' };
  if (s < 180 && d < 120)             return { label: isRu ? '▲ Гипертензия ІІ': '▲ Гіпертензія ІІ', cls: 'badge-bad'  };
  return                                       { label: isRu ? '🚨 Криз!'      : '🚨 Криз!',         cls: 'badge-crit' };
}

export function getBPDotClass(s) {
  if (s < 90)  return 'd-warn';
  if (s < 140) return 'd-ok';
  if (s < 160) return 'd-warn';
  return 'd-bad';
}

export function getPulseStatus(p) {
  const isRu = state.lang === 'ru';
  if (!p) return { label: '', cls: '' };
  if (p < 45)   return { label: isRu ? 'Брадикардия' : 'Брадикардія', cls: 'badge-bad'  };
  if (p < 60)   return { label: isRu ? 'Пониженный'  : 'Знижений',    cls: 'badge-warn' };
  if (p <= 85)  return { label: isRu ? 'Норма'       : 'Норма',       cls: 'badge-ok'   };
  if (p <= 100) return { label: isRu ? 'Повышенный'  : 'Підвищений',  cls: 'badge-warn' };
  return            { label: isRu ? 'Тахикардия'  : 'Тахікардія',  cls: 'badge-bad'  };
}
