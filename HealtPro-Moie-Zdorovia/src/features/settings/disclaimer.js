// Welcome screen disclaimer + version history.

import { state } from '../../core/state.js';

export const DISCLAIMER_VERSION = '1.0';
const DISCLAIMER_HISTORY_KEY = 'healthpro_disclaimer_history';

export function getDisclaimerHistory() {
  try { return JSON.parse(localStorage.getItem(DISCLAIMER_HISTORY_KEY) || '[]'); }
  catch (e) { return []; }
}

export function saveDisclaimerHistory(arr) {
  try { localStorage.setItem(DISCLAIMER_HISTORY_KEY, JSON.stringify(arr)); } catch (e) { /* noop */ }
}

export function isCurrentDisclaimerAccepted() {
  return getDisclaimerHistory().some((h) => h.version === DISCLAIMER_VERSION);
}

function fmtAcceptDate(iso) {
  try {
    const d = new Date(iso);
    const loc = state.lang === 'ru' ? 'ru-UA' : 'uk-UA';
    return d.toLocaleDateString(loc, { day: '2-digit', month: 'long', year: 'numeric' })
      + ' ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return iso; }
}

export function renderDisclaimerStatus() {
  const el = document.getElementById('disclaimerStatus');
  if (!el) return;
  const hist = getDisclaimerHistory();
  if (!hist.length) { el.innerHTML = ''; return; }
  const latest = hist[hist.length - 1];
  const isCurrent = latest.version === DISCLAIMER_VERSION;
  const isRu = state.lang === 'ru';
  const labelAccepted = isRu ? 'Принято' : 'Прийнято';
  const labelVersion = isRu ? 'Версия' : 'Версія';
  const labelHistory = isRu ? 'История согласий' : 'Історія погоджень';
  const warnTxt = isRu
    ? '⚠ Доступна новая версия дисклеймера. Пожалуйста, ознакомьтесь.'
    : '⚠ Доступна нова версія дисклеймера. Будь ласка, ознайомтеся.';
  const histRows = hist.slice().reverse().map((h) => `<div class="discl-hist-row"><span class="discl-hist-v">v${h.version}</span><span class="discl-hist-d">${fmtAcceptDate(h.acceptedAt)}</span></div>`).join('');
  el.innerHTML = `
    <div class="discl-status ${isCurrent ? 'ok' : 'warn'}">
      <div class="discl-status-row">
        <svg viewBox="0 0 24 24" class="discl-status-ico">${isCurrent ? '<polyline points="20 6 9 17 4 12"/>' : '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'}</svg>
        <div>
          <div class="discl-status-title">${labelAccepted}: ${labelVersion} ${latest.version}</div>
          <div class="discl-status-date">${fmtAcceptDate(latest.acceptedAt)}</div>
        </div>
      </div>
      ${isCurrent ? '' : `<div class="discl-status-warn">${warnTxt}</div>`}
    </div>
    ${hist.length > 1 ? `<details class="discl-hist-block"><summary>${labelHistory} (${hist.length})</summary><div class="discl-hist-list">${histRows}</div></details>` : ''}
  `;
}

export function openDisclaimerModal() {
  renderDisclaimerStatus();
  document.getElementById('disclaimerModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

export function closeDisclaimerModal() {
  document.getElementById('disclaimerModal').classList.remove('show');
  document.body.style.overflow = '';
}

export function acceptDisclaimer() {
  const hist = getDisclaimerHistory();
  hist.push({ version: DISCLAIMER_VERSION, acceptedAt: new Date().toISOString() });
  saveDisclaimerHistory(hist);
  const w = document.getElementById('welcomeScreen');
  w.style.transition = 'opacity .35s ease';
  w.style.opacity = '0';
  setTimeout(() => {
    w.classList.add('hidden');
    document.body.style.overflow = '';
  }, 350);
  closeDisclaimerModal();
}

export function checkDisclaimer() {
  // One-time migration from old key
  try {
    const oldKey = 'healthpro_disclaimer_v' + DISCLAIMER_VERSION;
    const oldVal = localStorage.getItem(oldKey);
    if (oldVal && !getDisclaimerHistory().length) {
      const iso = oldVal.replace(/^accepted_/, '');
      saveDisclaimerHistory([{ version: DISCLAIMER_VERSION, acceptedAt: iso || new Date().toISOString() }]);
      localStorage.removeItem(oldKey);
    }
  } catch (e) { /* noop */ }
  if (isCurrentDisclaimerAccepted()) {
    document.getElementById('welcomeScreen').classList.add('hidden');
  }
}
