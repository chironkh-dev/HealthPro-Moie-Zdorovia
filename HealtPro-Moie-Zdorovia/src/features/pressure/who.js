import { state, showToast } from '../../core/state.js';

export function getWHOCategory(s, d) {
  const isRu = state.lang === 'ru';
  if (s < 120 && d < 80) return { label: isRu ? 'Оптимальное'         : 'Оптимальний',         sub: '<120/80 мм рт.ст.', c: 'var(--green)', key: 'optimal' };
  if (s < 130 && d < 85) return { label: isRu ? 'Нормальное'          : 'Нормальний',          sub: '120–129/80–84',     c: 'var(--green)', key: 'normal' };
  if (s < 140 && d < 90) return { label: isRu ? 'Высоко-нормальное'   : 'Високо-нормальний',   sub: '130–139/85–89',     c: 'var(--amber)', key: 'high-normal' };
  if (s < 160 && d < 100) return { label: isRu ? 'Гипертензия І ст.'   : 'Гіпертензія І ст.',   sub: '140–159/90–99',     c: 'var(--amber)', key: 'ht1' };
  if (s < 180 && d < 110) return { label: isRu ? 'Гипертензия ІІ ст.'  : 'Гіпертензія ІІ ст.',  sub: '160–179/100–109',   c: 'var(--red)',   key: 'ht2' };
  return                            { label: isRu ? 'Гипертензия ІІІ ст.' : 'Гіпертензія ІІІ ст.', sub: '≥180/110',           c: 'var(--rose)',  key: 'ht3' };
}

export const WHO_INFO = {
  optimal: {
    title: 'Оптимальний тиск (<120/80)',
    body:  'Оптимальний тиск — найнижчий ризик серцево-судинних захворювань. Підтримуйте здоровий спосіб життя.',
    advice: ['Регулярні виміри 2 рази/рік', 'Фізична активність 150 хв/тиждень', 'Здорове харчування — DASH-дієта'],
    links: [
      { l: 'МОЗ: 8 міфів про гіпертензію', u: 'https://moz.gov.ua/uk/8-mifiv-pro-arterialnu-gipertenziju-komentue-kardiolog' },
      { l: 'МОЗ: Правила виміру тиску',     u: 'https://moz.gov.ua/uk/jak-pravilno-vimirjuvati-tisk-i-koli-zvertatis-do-likarja' },
    ],
  },
  normal: {
    title: 'Нормальний тиск (120–129/80–84)',
    body:  'Нормальний рівень тиску. Ризик ускладнень мінімальний при дотриманні здорового способу життя.',
    advice: ['Вимірюйте тиск щорічно', 'Контроль ваги та харчування', 'Відмова від куріння'],
    links: [
      { l: 'МОЗ: Правила виміру тиску',     u: 'https://moz.gov.ua/uk/jak-pravilno-vimirjuvati-tisk-i-koli-zvertatis-do-likarja' },
      { l: 'Гіпертензія — ЦГЗУ МОЗ',        u: 'https://phc.org.ua/kontrol-zakhvoryuvan/neinfekciyni-zakhvoryuvannya/sercevo-sudinni-zakhvoryuvannya/arterialna-gipertenziya' },
    ],
  },
  'high-normal': {
    title: 'Високо-нормальний (130–139/85–89)',
    body:  'Тиск у верхній межі норми. Рекомендується спостереження та профілактичні заходи.',
    advice: ['Виміри 2 рази/день протягом 1 тижня', 'Обмежте сіль до 5 г/день', 'Зменшіть споживання алкоголю', 'Збільшіть фізичну активність'],
    links: [
      { l: 'МОЗ: 8 міфів про гіпертензію', u: 'https://moz.gov.ua/uk/8-mifiv-pro-arterialnu-gipertenziju-komentue-kardiolog' },
      { l: 'ЦГЗУ: Артеріальна гіпертензія', u: 'https://phc.org.ua/kontrol-zakhvoryuvan/neinfekciyni-zakhvoryuvannya/sercevo-sudinni-zakhvoryuvannya/arterialna-gipertenziya' },
    ],
  },
  ht1: {
    title: 'Гіпертензія І ступеня (140–159/90–99)',
    body:  'Перший ступінь гіпертонічної хвороби. Підвищений ризик інфаркту та інсульту. Необхідна консультація лікаря.',
    advice: ['Консультація терапевта/кардіолога', 'Виміри щодня вранці та ввечері', 'DASH-дієта (сіль <5 г/день)', 'Можливе призначення медикаментів'],
    links: [
      { l: 'МОЗ: 8 міфів про гіпертензію', u: 'https://moz.gov.ua/uk/8-mifiv-pro-arterialnu-gipertenziju-komentue-kardiolog' },
      { l: 'ВООЗ: Гіпертонія',              u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' },
      { l: 'Helsi — запис до лікаря',       u: 'https://helsi.me' },
    ],
  },
  ht2: {
    title: 'Гіпертензія ІІ ступеня (160–179/100–109)',
    body:  'Значно підвищений тиск. Серйозний ризик серцево-судинних ускладнень. Необхідне лікування.',
    advice: ['Негайна консультація кардіолога', 'Медикаментозна терапія обов\'язкова', 'Суворе обмеження солі та алкоголю', 'Регулярний моніторинг тиску'],
    links: [
      { l: 'ВООЗ: Гіпертонія',              u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' },
      { l: 'ЦГЗУ: Артеріальна гіпертензія', u: 'https://phc.org.ua/kontrol-zakhvoryuvan/neinfekciyni-zakhvoryuvannya/sercevo-sudinni-zakhvoryuvannya/arterialna-gipertenziya' },
      { l: 'Helsi',                          u: 'https://helsi.me' },
    ],
  },
  ht3: {
    title: 'Гіпертензія ІІІ ступеня (≥180/110)',
    body:  'Критичний рівень тиску! Необхідна невідкладна медична допомога.',
    advice: ['НЕГАЙНО викличте 103', 'Не займайтеся самолікуванням', 'Виміряйте тиск на обох руках', 'Сповістіть близьких'],
    links: [
      { l: 'Виклик 103',         u: 'tel:103' },
      { l: 'ВООЗ: Гіпертонія',   u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' },
      { l: 'Helsi',              u: 'https://helsi.me' },
    ],
  },
};

export function openWHOInfo() {
  const isRu = state.lang === 'ru';
  if (!state.measurements.length) {
    showToast(isRu ? '⚠️ Нет измерений' : '⚠️ Немає вимірів');
    return;
  }
  const last = state.measurements[0];
  const who = getWHOCategory(last.sys, last.dia);
  const info = WHO_INFO[who.key];
  if (!info) return;
  const el = document.getElementById('whoModalContent');
  if (!el) return;
  el.innerHTML = `
    <div style="padding:12px;border-radius:12px;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.2);margin-bottom:12px">
      <div style="font-size:16px;font-weight:800;color:${who.c};margin-bottom:4px">${info.title}</div>
      <div style="font-size:12px;color:var(--text2);line-height:1.6">${info.body}</div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">${isRu ? 'Рекомендации:' : 'Рекомендації:'}</div>
    ${info.advice.map(a => `<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:7px;font-size:12px;color:var(--text2);line-height:1.5"><span style="color:var(--blue2);font-size:14px;flex-shrink:0">›</span>${a}</div>`).join('')}
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin:12px 0 8px">${isRu ? 'Ссылки (🇺🇦 Ukraine):' : 'Посилання (🇺🇦 Ukraine):'}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${info.links.map(l => `<a href="${l.u}" target="_blank" class="reco-link">${l.l}</a>`).join('')}</div>`;
  document.getElementById('whoModal').classList.add('show');
}
