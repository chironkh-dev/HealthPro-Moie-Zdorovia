// Personalised recommendations: BP / pulse / BMI / pills / trend / lifestyle.

import { state, today } from '../../core/state.js';
import { getBPNorm } from '../pressure/index.js';
import { isPillDueToday } from '../meds/index.js';
import { calcBMI } from './bmi.js';

const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

export const RECO_SVG = {
  crisis:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  high_bp:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  warn_bp:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  ok_bp:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
  low_bp:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
  age:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>',
  tachy:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  brady:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  ok_pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><polyline points="20 6 9 17 4 12" style="transform:translate(0,2px)"/></svg>',
  bmi:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="2" y1="20" x2="22" y2="20"/><path d="M4 20V10l8-8 8 8v10"/></svg>',
  pill:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>',
  ok_pill:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/><polyline points="7 13 10 16 14 11"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  trend_up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  food:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a10 10 0 0 1 10 10H2A10 10 0 0 1 12 2z"/><line x1="12" y1="12" x2="12" y2="22"/><path d="M2 12h20"/></svg>',
  sleep:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
};

export function generateAdvice(s, d, p) {
  const isRu = state.lang === 'ru';
  const tips = [];
  if (s >= 140 || d >= 90) tips.push(isRu ? 'Ограничьте соль и отдохните.' : 'Обмежте сіль та відпочиньте.');
  if (s < 100 || d < 60) tips.push(isRu ? 'Пейте больше воды, возможна гипотония.' : 'Пийте більше води, можлива гіпотонія.');
  if (p) {
    if (p > 100) tips.push(isRu ? 'Пульс высокий. Избегайте кофеина и стресса.' : 'Пульс високий. Уникайте кофеїну та стресу.');
    else if (p < 50) tips.push(isRu ? 'Пульс слишком низкий. Обратитесь к врачу при слабости.' : 'Пульс занизький. Зверніться до лікаря, якщо відчуваєте слабкість.');
  }
  if (tips.length === 0) tips.push(isRu ? 'Показатели в пределах вашей нормы.' : 'Показники в межах вашої норми.');
  return tips.join(' ');
}

export function renderRecommendations() {
  const isRu = state.lang === 'ru';
  const all = state.measurements;
  const pills = state.pills;
  const pillsTaken = state.pillsTaken;
  const settings = state.settings;
  const listEl = document.getElementById('recoList');
  if (!listEl) return;
  if (!all.length) {
    listEl.innerHTML = `<div class="empty-state" style="padding:12px"><div class="em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg></div><p>${isRu ? 'Добавьте измерения' : 'Додайте виміри'}</p></div>`;
    return;
  }
  const last = all[0];
  const last7 = all.filter((m) => new Date(m.time) > new Date(Date.now() - 7 * 864e5));
  const aS = last7.length ? avg(last7.map((m) => m.sys)) : last.sys;
  const aD = last7.length ? avg(last7.map((m) => m.dia)) : last.dia;
  const n = getBPNorm();
  const age = parseInt(settings.age, 10) || 50;
  const bmi = calcBMI();
  const recos = [];

  if (last.sys >= 180 || last.dia >= 120) recos.push({ t: 'danger', i: 'crisis',
    h: isRu ? 'Гипертонический криз!' : 'Гіпертонічний криз!',
    s: isRu ? 'Позвоните 103 СЕЙЧАС' : 'Зателефонуйте 103 ЗАРАЗ',
    detail: isRu ? 'Систолическое ≥180 или диастолическое ≥120 — опасное для жизни состояние. НЕ ждите.' : 'Систолічний ≥180 або діастолічний ≥120 — небезпечний для життя стан. НЕ чекайте.',
    links: [{ l: '📞 103 ШМД', u: 'tel:103' }, { l: 'ВОЗ: Гипертония', u: 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' }, { l: 'Helsi', u: 'https://helsi.me' }] });
  else if (aS >= 160 || aD >= 100) recos.push({ t: 'danger', i: 'high_bp',
    h: isRu ? 'Стойкое повышенное давление' : 'Стійкий підвищений тиск',
    s: isRu ? `Среднее ${aS}/${aD} — нужен кардиолог` : `Середній ${aS}/${aD} — потрібен кардіолог`,
    detail: isRu ? 'Давление ≥160/100 требует медикаментозной терапии. Самолечение опасно.' : 'Тиск ≥160/100 потребує медикаментозної терапії. Самолікування небезпечне.',
    links: [{ l: isRu ? 'ВОЗ: Гипертония' : 'МОЗ: 8 міфів про гіпертензію', u: isRu ? 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' : 'https://moz.gov.ua/uk/8-mifiv-pro-arterialnu-gipertenziju-komentue-kardiolog' }, { l: 'Helsi', u: 'https://helsi.me' }] });
  else if (aS >= n.sysWarn || aD >= n.diaWarn) recos.push({ t: 'warn', i: 'warn_bp',
    h: isRu ? 'Гипертензия 1 степени' : 'Гіпертензія 1 ступеня',
    s: isRu ? `Давление превышает норму для ${age} л. (${n.note})` : `Тиск перевищує норму для ${age} р. (${n.note})`,
    detail: isRu ? `Цель для вашего возраста: <${n.sysWarn}/${n.diaWarn}. Ограничьте соль до 5 г/день, физактивность 150 мин/неделю.` : `Ціль для вашого віку: <${n.sysWarn}/${n.diaWarn}. Обмежте сіль до 5 г/день, фізактивність 150 хв/тиждень.`,
    links: [{ l: isRu ? 'ВОЗ: Гипертония' : 'МОЗ: Як вимірювати тиск', u: isRu ? 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' : 'https://moz.gov.ua/uk/jak-pravilno-vimirjuvati-tisk-i-koli-zvertatis-do-likarja' }, { l: 'Helsi', u: 'https://helsi.me' }] });
  else if (aS < 85 || aD < 55) recos.push({ t: 'warn', i: 'low_bp',
    h: isRu ? 'Пониженное давление' : 'Знижений тиск',
    s: isRu ? 'Возможно головокружение и слабость' : 'Можливе запаморочення та слабкість',
    detail: isRu ? 'Употребляйте 2–2.5 л жидкости/день. Солёная пища (без противопоказаний). Избегайте резкого вставания.' : 'Вживайте 2–2.5 л рідини/день. Солоніша їжа (без протипоказань). Уникайте різкого вставання.',
    links: [{ l: 'Helsi', u: 'https://helsi.me' }] });
  else recos.push({ t: 'ok', i: 'ok_bp',
    h: isRu ? 'Давление в норме!' : 'Тиск в нормі!',
    s: isRu ? `${aS}/${aD} — соответствует норме (${n.note})` : `${aS}/${aD} — відповідає нормі (${n.note})`,
    detail: isRu ? 'Отличный результат! Продолжайте здоровый образ жизни и регулярный мониторинг.' : 'Чудовий результат! Продовжуйте здоровий спосіб життя та регулярний моніторинг.',
    links: [{ l: isRu ? 'ВОЗ: Гипертония' : 'МОЗ: Правила виміру', u: isRu ? 'https://www.who.int/ru/news-room/fact-sheets/detail/hypertension' : 'https://moz.gov.ua/uk/jak-pravilno-vimirjuvati-tisk-i-koli-zvertatis-do-likarja' }] });

  if (age >= 60) recos.push({ t: 'info', i: 'age',
    h: isRu ? `Нормы для ${age}-летних` : `Норми для ${age}-річних`,
    s: n.note,
    detail: isRu ? `С возрастом артерии менее эластичны. Цель: <${n.sysWarn}/${n.diaWarn}. Следите за ортостатическим давлением.` : `З віком артерії менш еластичні. Ціль: <${n.sysWarn}/${n.diaWarn}. Стежте за ортостатичним тиском.`,
    links: [{ l: 'Helsi', u: 'https://helsi.me' }] });

  const pp = last7.filter((m) => m.pulse).map((m) => m.pulse);
  if (pp.length) {
    const aP = avg(pp);
    if (aP > 100) recos.push({ t: 'warn', i: 'tachy',
      h: isRu ? `Тахикардия (${aP} уд/мин)` : `Тахікардія (${aP} уд/хв)`,
      s: isRu ? 'Пульс выше 100 уд/мин' : 'Пульс вище 100 уд/хв',
      detail: isRu ? 'Причины: стресс, кофеин, аритмия, щитовидная железа. При постоянной тахикардии — ЭКГ.' : 'Причини: стрес, кофеїн, аритмія, щитовидна залоза. При постійній тахікардії — ЕКГ.',
      links: [{ l: 'Helsi', u: 'https://helsi.me' }] });
    else if (aP < 55) recos.push({ t: 'warn', i: 'brady',
      h: isRu ? `Брадикардия (${aP} уд/мин)` : `Брадикардія (${aP} уд/хв)`,
      s: isRu ? 'Пульс ниже нормы' : 'Пульс нижче норми',
      detail: isRu ? 'Если есть слабость или головокружение — кардиолог.' : 'Якщо є слабкість або запаморочення — кардіолог.',
      links: [{ l: 'Helsi', u: 'https://helsi.me' }] });
    else recos.push({ t: 'ok', i: 'ok_pulse',
      h: isRu ? `Пульс в норме (${aP} уд/мин)` : `Пульс в нормі (${aP} уд/хв)`,
      s: isRu ? '60–100 уд/мин' : '60–100 уд/хв',
      detail: isRu ? 'Нормальный ритм сердца.' : 'Нормальний ритм серця.',
      links: [] });
  }

  if (bmi && bmi > 27) recos.push({ t: 'warn', i: 'bmi',
    h: isRu ? 'ИМТ и давление' : 'ІМТ та тиск',
    s: isRu ? `ИМТ ${bmi} — снижает артериальную регуляцию` : `ІМТ ${bmi} — знижує артеріальну регуляцію`,
    detail: isRu ? 'Каждые 5 кг лишнего веса повышают систолическое давление на 2–3 мм рт.ст.' : 'Кожні 5 кг надмірної ваги підвищують систолічний тиск на 2–3 мм рт.ст.',
    links: [{ l: 'Helsi', u: 'https://helsi.me' }] });

  const dp = pills.filter(isPillDueToday);
  if (dp.length) {
    const miss = dp.filter((p) => !pillsTaken[today()]?.[p.id]);
    if (miss.length) recos.push({ t: 'warn', i: 'pill',
      h: isRu ? `Не принято: ${miss.map((p) => p.name).join(', ')}` : `Не прийнято: ${miss.map((p) => p.name).join(', ')}`,
      s: isRu ? 'Пропущены препараты' : 'Пропущено препарати',
      detail: isRu ? 'Нерегулярный приём антигипертензивных лекарств приводит к скачкам давления.' : 'Нерегулярний прийом антигіпертензивних ліків призводить до стрибків тиску.',
      links: [{ l: 'Tabletki.ua', u: 'https://tabletki.ua' }] });
    else recos.push({ t: 'ok', i: 'ok_pill',
      h: isRu ? 'Все лекарства приняты!' : 'Всі ліки прийнято!',
      s: isRu ? '100% выполнение' : '100% виконання',
      detail: isRu ? 'Регулярный приём — ключ к стабильному давлению.' : 'Регулярний прийом — ключ до стабільного тиску.',
      links: [] });
  }

  if (last7.length < 5 && all.length > 0) recos.push({ t: 'info', i: 'calendar',
    h: isRu ? 'Частота измерений' : 'Частота вимірювань',
    s: isRu ? `${last7.length} изм./неделю — мало` : `${last7.length} вим./тиждень — мало`,
    detail: isRu ? 'Рекомендуется: 2 раза/день — утром (7–9 ч. до еды) и вечером (19–21 ч.). Всегда в покое после 5 мин.' : 'МОЗ рекомендує: 2 рази/день — вранці (7–9 год. до їди) та ввечері (19–21 год.). Завжди у спокої після 5 хв.',
    links: [{ l: 'Helsi', u: 'https://helsi.me' }] });

  if (all.length >= 5) {
    const r = avg(all.slice(0, 3).map((m) => m.sys));
    const o = avg(all.slice(-3).map((m) => m.sys));
    if (r - o > 15) recos.push({ t: 'danger', i: 'trend_up',
      h: isRu ? 'Давление резко растёт' : 'Тиск різко зростає',
      s: isRu ? `+${r - o} мм рт.ст.` : `+${r - o} мм рт.ст.`,
      detail: isRu ? 'Рост давления на >15 мм за это время — необходима консультация врача.' : 'Зростання тиску на >15 мм за цей час — необхідна консультація лікаря.',
      links: [{ l: 'Helsi', u: 'https://helsi.me' }] });
  }

  recos.push({ t: 'info', i: 'activity',
    h: isRu ? 'Физическая активность' : 'Фізична активність',
    s: isRu ? '30 мин/день снижает давление на 5–8 мм рт.ст.' : '30 хв/день знижує тиск на 5–8 мм рт.ст.',
    detail: isRu ? 'Аэробные упражнения 150 мин/неделю — наиболее эффективный немедикаментозный метод.' : 'Аеробні вправи 150 хв/тиждень — найефективніший немедикаментозний метод (рекомендація МОЗ України).',
    links: [{ l: isRu ? 'ВОЗ: Физическая активность' : 'МОЗ: Фізична активність', u: isRu ? 'https://www.who.int/ru/news-room/fact-sheets/detail/physical-activity' : 'https://moz.gov.ua/uk/categories/fizichni-aktivnosti' }] });
  recos.push({ t: 'info', i: 'food',
    h: isRu ? 'Питание и DASH-диета' : 'Харчування та DASH-дієта',
    s: isRu ? 'Снижает давление на 8–14 мм рт.ст.' : 'Знижує тиск на 8–14 мм рт.ст.',
    detail: isRu ? 'Соль <5 г/день, больше калия (бананы, картофель), магния (орехи), кальция (молоко). Меньше жирного мяса.' : 'Сіль <5 г/день, більше калію (банани, картопля), магнію (горіхи), кальцію (молоко). Менше жирного м\'яса.',
    links: [{ l: isRu ? 'ВОЗ: Здоровое питание' : 'МОЗ: Що і як їсти', u: isRu ? 'https://www.who.int/ru/news-room/fact-sheets/detail/healthy-diet' : 'https://moz.gov.ua/uk/scho-i-jak-isti-schob-zhiti-dovgo-rekomendacii-moz' }] });
  recos.push({ t: 'info', i: 'sleep',
    h: isRu ? 'Сон и управление стрессом' : 'Сон та управління стресом',
    s: isRu ? '7–9 ч. сна и дыхательные упражнения' : '7–9 год. сну та дихальні вправи',
    detail: isRu ? 'Хронический стресс повышает кортизол → давление. 10 мин дыхательных упражнений снижают систолическое на 3–5 мм рт.ст.' : 'Хронічний стрес підвищує кортизол → тиск. 10 хв дихальних вправ знижують систолічний на 3–5 мм рт.ст.',
    links: [{ l: isRu ? 'ВОЗ: Стресс' : 'МОЗ: Як впоратись зі стресом', u: isRu ? 'https://www.who.int/ru/news-room/fact-sheets/detail/mental-health-strengthening-our-response' : 'https://moz.gov.ua/uk/jak-vporatisja-zi-stresom-samostijno-posibnik-vid-vooz-vazhlivi-navichki-v-periodi-stresu' }] });

  listEl.innerHTML = recos.map((r, i) => `
    <div class="reco-item ri-${r.t}">
      <div class="reco-header" data-action="toggleReco" data-idx="${i}">
        <div class="reco-icon">${RECO_SVG[r.i] || RECO_SVG.warn_bp}</div>
        <div class="reco-main"><div class="reco-title">${r.h}</div><div class="reco-short">${r.s}</div></div>
        <div class="reco-chevron" id="rchev-${i}">›</div>
      </div>
      <div class="reco-body" id="rbody-${i}">
        <div class="reco-detail">${r.detail}</div>
        ${r.links.length ? `<div class="reco-links">${r.links.map((l) => `<a class="reco-link" href="${l.u}" ${l.u.startsWith('http') ? 'target="_blank"' : ''}>${l.l}</a>`).join('')}</div>` : ''}
      </div>
    </div>`).join('');
}

export function toggleReco(i) {
  const b = document.getElementById(`rbody-${i}`);
  const ch = document.getElementById(`rchev-${i}`);
  if (!b || !ch) return;
  const open = b.style.display === 'block';
  b.style.display = open ? 'none' : 'block';
  ch.style.transform = open ? '' : 'rotate(90deg)';
}
