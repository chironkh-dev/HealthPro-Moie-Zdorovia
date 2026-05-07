import { state } from '../../core/state.js';
import { t, tt } from '../../i18n/index.js';

export function getBPNorm() {
  const ns = parseInt(state.settings.normalSys);
  const nd = parseInt(state.settings.normalDia);
  if (ns && nd) {
    return {
      sysOk: ns + 5,
      diaOk: nd + 5,
      sysWarn: ns + 15,
      diaWarn: nd + 10,
      note: tt('n-personal', { sys: ns, dia: nd }),
      personal: true,
    };
  }
  const age = parseInt(state.settings.age) || 50;
  if (age < 18)  return { sysOk: 110, diaOk: 70, sysWarn: 130, diaWarn: 85, note: t('n-age-under18') };
  if (age <= 59) return { sysOk: 120, diaOk: 80, sysWarn: 130, diaWarn: 80, note: t('n-age-18-59') };
  if (age <= 79) return { sysOk: 130, diaOk: 85, sysWarn: 140, diaWarn: 90, note: t('n-age-60-79') };
  return            { sysOk: 140, diaOk: 90, sysWarn: 150, diaWarn: 90, note: t('n-age-80plus') };
}

export function getBPStatus(s, d) {
  if (s < 80 || d < 50) return { label: t('n-bp-very-low'), cls: 'badge-warn' };
  if (s < 90 || d < 60) return { label: t('n-bp-low'),      cls: 'badge-warn' };

  const std = state.settings?.bpStandard || 'ESC2024';

  if (std === 'AHA2017') {
    if (s < 120 && d < 80)  return { label: t('n-bp-normal'),        cls: 'badge-ok'   };
    if (s < 130 && d < 80)  return { label: t('n-bp-aha-elevated'),  cls: 'badge-warn' };
    if (s < 140 && d < 90)  return { label: t('n-bp-aha-ht1'),       cls: 'badge-warn' };
    if (s >= 180 || d >= 120) return { label: t('n-bp-crisis'),      cls: 'badge-crit' };
    return                           { label: t('n-bp-aha-ht2'),      cls: 'badge-bad'  };
  }

  // ESC 2024 (default)
  const n = getBPNorm();
  if (s <= n.sysOk && d <= n.diaOk)   return { label: t('n-bp-normal'), cls: 'badge-ok'   };
  if (s < n.sysWarn && d < n.diaWarn) return { label: t('n-bp-high'),   cls: 'badge-warn' };
  if (s < 160 && d < 100)             return { label: t('n-bp-ht1'),    cls: 'badge-warn' };
  if (s < 180 && d < 120)             return { label: t('n-bp-ht2'),    cls: 'badge-bad'  };
  return                                       { label: t('n-bp-crisis'), cls: 'badge-crit' };
}

export function getBPDotClass(s) {
  const std = state.settings?.bpStandard || 'ESC2024';
  if (s < 90) return 'd-hypo';

  if (std === 'AHA2017') {
    if (s < 120) return 'd-ok';
    if (s < 130) return 'd-warn';    // AHA: Elevated
    if (s < 140) return 'd-grade1';  // AHA: Stage 1 HTN
    if (s < 180) return 'd-bad';     // AHA: Stage 2 HTN
    return 'd-crit';                 // AHA: Hypertensive Crisis
  }

  // ESC 2024 (default)
  if (s < 130) return 'd-ok';
  if (s < 140) return 'd-warn';
  if (s < 160) return 'd-grade1';
  if (s < 180) return 'd-bad';
  return 'd-crit';
}

export function getPulseStatus(p) {
  if (!p) return { label: '', cls: '' };
  if (p < 45)   return { label: t('n-pulse-brady'),  cls: 'badge-bad'  };
  if (p < 60)   return { label: t('n-pulse-low'),    cls: 'badge-warn' };
  if (p <= 85)  return { label: t('n-pulse-normal'), cls: 'badge-ok'   };
  if (p <= 100) return { label: t('n-pulse-high'),   cls: 'badge-warn' };
  return            { label: t('n-pulse-tachy'),  cls: 'badge-bad'  };
}
