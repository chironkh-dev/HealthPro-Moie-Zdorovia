// BMI calculation, classification and rendering.

import { state } from '../../core/state.js';

export function calcBMI() {
  const h = parseFloat(state.settings.height);
  const w = parseFloat(state.settings.weight);
  if (!h || !w) return null;
  return Math.round((w / ((h / 100) ** 2)) * 10) / 10;
}

export function getBMICategory(bmi) {
  const isRu = state.lang === 'ru';
  if (bmi < 16) return { label: isRu ? 'Выраженный дефицит' : 'Виражений дефіцит', c: 'var(--red)', impact: isRu ? 'Риск гипотонии и сердечных проблем' : 'Ризик гіпотонії та серцевих проблем' };
  if (bmi < 18.5) return { label: isRu ? 'Дефицит массы' : 'Дефіцит маси', c: 'var(--amber)', impact: isRu ? 'Возможна гипотония' : 'Можлива гіпотонія' };
  if (bmi < 25) return { label: isRu ? 'Норма ✓' : 'Норма ✓', c: 'var(--green)', impact: isRu ? 'Нейтральное влияние на давление' : 'Нейтральний вплив на тиск' };
  if (bmi < 30) return { label: isRu ? 'Избыточный вес' : 'Надмірна вага', c: 'var(--amber)', impact: isRu ? 'Риск гипертонии +15–20%' : 'Ризик гіпертонії +15–20%' };
  if (bmi < 35) return { label: isRu ? 'Ожирение І ст.' : 'Ожиріння І ст.', c: 'var(--red)', impact: isRu ? 'Каждые +5 кг ≈ +2–3 мм рт.ст.' : 'Кожен +5 кг ≈ +2–3 мм рт.ст.' };
  if (bmi < 40) return { label: isRu ? 'Ожирение ІІ ст.' : 'Ожиріння ІІ ст.', c: 'var(--red)', impact: isRu ? 'Серьёзный риск гипертензии' : 'Серйозний ризик гіпертензії' };
  return { label: isRu ? 'Ожирение ІІІ ст.' : 'Ожиріння ІІІ ст.', c: 'var(--rose)', impact: isRu ? 'Критический риск!' : 'Критичний ризик!' };
}

export function renderBMI() {
  const isRu = state.lang === 'ru';
  const bmi = calcBMI();
  const el = document.getElementById('bmiContent');
  if (!el) return;
  if (!bmi) {
    el.innerHTML = `<div class="empty-state" style="padding:12px"><div class="em"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg></div><p>${isRu ? 'Заполните рост и вес в Профиле' : 'Заповніть зріст та вагу в Профілі'}</p></div>`;
    return;
  }
  const cat = getBMICategory(bmi);
  const pct = Math.min(96, Math.max(2, ((bmi - 14) / (45 - 14)) * 100));
  const h = parseFloat(state.settings.height) / 100;
  const wMin = Math.round(18.5 * h * h);
  const wMax = Math.round(24.9 * h * h);
  el.innerHTML = `
    <div class="bmi-visual">
      <div class="bmi-circle" style="border-color:${cat.c}">
        <div class="bmi-num" style="color:${cat.c}">${bmi}</div>
        <div class="bmi-label">ІМТ</div>
      </div>
      <div class="bmi-info">
        <div class="bmi-category" style="color:${cat.c}">${cat.label}</div>
        <div class="bmi-sub">${isRu ? 'Идеальный вес' : 'Ідеальна вага'}: ${wMin}–${wMax} ${isRu ? 'кг' : 'кг'}</div>
        <div class="bmi-sub">${isRu ? 'Рост' : 'Зріст'}: ${state.settings.height} ${isRu ? 'см' : 'см'} · ${isRu ? 'Вес' : 'Вага'}: ${state.settings.weight} ${isRu ? 'кг' : 'кг'}</div>
      </div>
    </div>
    <div class="bmi-bar">
      <div class="bmi-bar-indicator" style="left:calc(${pct}% - 1.5px)"></div>
    </div>
    <div class="bmi-zones">
      <span style="color:#3b82f6">${isRu ? 'Дефицит' : 'Дефіцит'}</span>
      <span style="color:#10b981">${isRu ? 'Норма' : 'Норма'}</span>
      <span style="color:#f59e0b">${isRu ? 'Избыток' : 'Надлишок'}</span>
      <span style="color:#ef4444">${isRu ? 'Ожирение' : 'Ожиріння'}</span>
    </div>
    <div class="bmi-impact"><strong>${isRu ? 'Влияние на давление' : 'Вплив на тиск'}:</strong> ${cat.impact}. ${bmi > 25 ? (isRu ? 'Снижение веса на 5–10 кг может снизить систолическое давление на 5–10 мм рт.ст.' : 'Зниження ваги на 5–10 кг може знизити систолічний тиск на 5–10 мм рт.ст.') : (isRu ? 'ИМТ в норме — положительное влияние на контроль давления.' : 'ІМТ в нормі — позитивний вплив на контроль тиску.')}</div>`;
}
