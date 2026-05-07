// features/tips/index.js — Офлайн поради ВООЗ/МОЗ
// НЕ зовнішній API. Лише верифікований JSON assets/tips/tips_uk.json.
// Три функції: analyzeTrends → getTips → renderTips

import * as db from '../../core/db.js';
import { t } from '../../i18n/index.js';
import { state } from '../../core/state.js';

// ── Категорія по порогах ESC/AHA (відповідає countByBPCategory) ─────────────
function getBPCategory(sys, dia) {
  const std = state.settings?.bpStandard || 'ESC2024';
  if (std === 'AHA2017') {
    if (sys < 120 && dia < 80)  return 'pressure_optimal';
    if (sys < 130 && dia < 80)  return 'pressure_high_1';
    if (sys < 140 && dia < 90)  return 'pressure_grade1';
    if (sys < 180 && dia < 110) return 'pressure_grade2';
    return 'pressure_grade3';
  }
  if (sys < 120 && dia < 80)  return 'pressure_optimal';
  if (sys < 130 && dia < 85)  return 'pressure_normal';
  if (sys < 140 && dia < 90)  return 'pressure_high_1';
  if (sys < 160 && dia < 100) return 'pressure_grade1';
  if (sys < 180 && dia < 110) return 'pressure_grade2';
  return 'pressure_grade3';
}

// Аналізує середній тиск за 7 днів → повертає {category, avgSys, avgDia}
export async function analyzeTrends() {
  const rows = await db.queryMeasurements({ days: 7 });
  if (!rows.length) return null;
  const avgSys = Math.round(rows.reduce((s, r) => s + r.sys, 0) / rows.length);
  const avgDia = Math.round(rows.reduce((s, r) => s + r.dia, 0) / rows.length);
  return { category: getBPCategory(avgSys, avgDia), avgSys, avgDia };
}

// Завантажує поради з локального JSON за категорією
export async function getTips(category) {
  const lang = document.documentElement.lang || 'uk';
  const file = lang === 'ru'
    ? '/assets/tips/tips_ru.json'
    : '/assets/tips/tips_uk.json';
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error('fetch failed');
    const all = await res.json();
    const found = all.find(g => g.category === category);
    return found ? found.tips : [];
  } catch { return []; }
}

// Рендерить поради у #tipsList
export function renderTips(tips) {
  const el = document.getElementById('tipsList');
  if (!el) return;
  if (!tips.length) {
    el.innerHTML = `<p class="tips-empty">${t('tips-empty')}</p>`;
    return;
  }
  el.innerHTML = tips.map(tip => `
    <div class="tip-card">
      <div class="tip-title">${tip.title}</div>
      <div class="tip-body">${tip.body}</div>
      ${tip.source_url
        ? `<a class="tip-source" href="${tip.source_url}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="12" height="12"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> ${tip.source}</a>`
        : `<span class="tip-source"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="12" height="12"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> ${tip.source}</span>`
      }
      <div class="tip-disclaimer">${t('tips-disclaimer')}</div>
    </div>
  `).join('');
}

// Оновлює заголовок Tips блоку залежно від стандарту
export function updateTipsTitle() {
  const el = document.getElementById('tips-title-el');
  if (!el) return;
  const std = state.settings?.bpStandard || 'ESC2024';
  el.textContent = std === 'AHA2017' ? t('tips-title-aha') : t('tips-title');
}

// Головна точка входу — аналіз + відображення
export async function renderTipsBlock() {
  updateTipsTitle();
  const el = document.getElementById('tipsList');
  const trend = await analyzeTrends();
  if (!trend) {
    if (el) el.innerHTML = `<p class="tips-empty">${t('tips-empty')}</p>`;
    return;
  }
  const tips = await getTips(trend.category);
  renderTips(tips);
}
