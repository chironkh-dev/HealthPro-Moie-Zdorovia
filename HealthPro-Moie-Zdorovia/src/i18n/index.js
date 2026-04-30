// Centralised i18n: dictionaries + setLang/t API.
// All language switching, label translation, and "re-render on lang change"
// hooks live here. Feature modules import setLang/t/registerReRender from
// here directly. (`features/settings/i18n.js` re-exports for legacy paths.)

import { state, persistLang } from '../core/state.js';
import { T_UK } from './ui.uk.js';
import { T_RU } from './ui.ru.js';
import { WELCOME_T, DISCLAIMER_T } from './welcome-disclaimer.js';
import { PDF_LABELS } from './pdf.js';

export { T_UK, T_RU, WELCOME_T, DISCLAIMER_T, PDF_LABELS };

export const T = { uk: T_UK, ru: T_RU };

// id-of-input → id-of-element (whose `placeholder` should be set).
const PLACEHOLDER_MAP = {
  'p-sys': 'sys', 'p-dia': 'dia', 'p-pulse': 'pulse', 'p-note': 'note',
  'p-pillName': 'pillName', 'p-pillDose': 'pillDose',
  'p-userName': 'userName', 'p-userAge': 'userAge', 'p-userHeight': 'userHeight', 'p-userWeight': 'userWeight',
  'p-normalSys': 'normalSys', 'p-normalDia': 'normalDia', 'p-normalPulse': 'normalPulse',
  'p-userPhone': 'userPhone', 'p-userEmail': 'userEmail',
  'p-userViber': 'userViber', 'p-userTelegram': 'userTelegram', 'p-userWhatsapp': 'userWhatsapp',
  'p-emergencyPhone': 'emergencyPhone', 'p-emergencyName': 'emergencyName',
};

// Hooks for re-rendering pages on language change. Caller registers these
// to avoid circular imports between settings, analytics, history, meds.
const reRenderers = [];
export function registerReRender(fn) { reRenderers.push(fn); }

export function renderDisclaimerBody() {
  const dict = DISCLAIMER_T;
  const d = dict[state.lang] || dict.uk || {};
  const el = document.getElementById('disclaimerBody');
  if (!el) return;
  const sec = (n, s) => `<h4><span class="num">${n}</span>${s.h}</h4><p>${s.p}</p>${s.li ? '<ul>' + s.li.map((x) => `<li>${x}</li>`).join('') + '</ul>' : ''}`;
  el.innerHTML = `
    <div class="disclaimer-version">${d.version}</div>
    <div id="disclaimerStatus"></div>
    ${sec(1, d.s1)}${sec(2, d.s2)}${sec(3, d.s3)}${sec(4, d.s4)}
    <h4><span class="num">5</span>${d.s5.h}</h4>
    <table class="risk-table"><thead><tr><th>${d.s5.th1}</th><th>${d.s5.th2}</th></tr></thead><tbody>
      ${d.s5.rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}
    </tbody></table>
    <div class="accent-box">${d.accept}</div>`;
  const tt = document.getElementById('d-title');
  if (tt) tt.textContent = d.title;
}

export function renderWelcomeText() {
  const dict = WELCOME_T;
  const w = dict[state.lang] || dict.uk || {};
  const map = {
    'w-subtitle': w.subtitle, 'w-tagline': w.tagline,
    'w-feat1': w.feat1, 'w-feat2': w.feat2, 'w-feat3': w.feat3, 'w-feat4': w.feat4,
    'w-discl-link': w.discl, 'w-accept': w.accept, 'w-version': w.version,
  };
  Object.keys(map).forEach((id) => { const el = document.getElementById(id); if (el) el.textContent = map[id]; });
}

export function setLang(l) {
  state.lang = l;
  persistLang(l);
  const lu = document.getElementById('lang-uk'), lr = document.getElementById('lang-ru');
  if (lu) lu.classList.toggle('active', l === 'uk');
  if (lr) lr.classList.toggle('active', l === 'ru');
  const wu = document.getElementById('wlang-uk'), wr = document.getElementById('wlang-ru');
  if (wu) wu.classList.toggle('active', l === 'uk');
  if (wr) wr.classList.toggle('active', l === 'ru');
  document.documentElement.setAttribute('lang', l);
  const dict = T[l];
  Object.keys(dict).forEach((id) => {
    if (id.startsWith('p-')) return;
    const el = document.getElementById(id);
    if (el) el.innerHTML = dict[id];
  });
  Object.keys(PLACEHOLDER_MAP).forEach((k) => {
    const el = document.getElementById(PLACEHOLDER_MAP[k]);
    if (el && dict[k] != null) el.setAttribute('placeholder', dict[k]);
  });
  renderWelcomeText();
  renderDisclaimerBody();
  reRenderers.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } });
}

export function t(id) {
  const current = T[state.lang] || {};
  const fallback = T.uk || {};
  return current[id] || fallback[id] || id;
}

// Templated translation: replaces {name} placeholders in the dict value.
// Usage: tt('r-bp-stable', { sys: 130, dia: 80 })
export function tt(id, vars = {}) {
  let s = t(id);
  Object.keys(vars).forEach((k) => {
    s = s.split('{' + k + '}').join(String(vars[k]));
  });
  return s;
}
