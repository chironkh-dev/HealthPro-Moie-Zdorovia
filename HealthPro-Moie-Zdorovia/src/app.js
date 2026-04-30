// Thin entry point. All business logic lives in src/features/* modules.
// Responsibilities of this file:
//   • Wire showToast (DOM-bound) into the shared state container.
//   • Define showPage() because it crosses every feature.
//   • Run init() (theme, lang, profile, pressure listeners, charts, pills, PWA).
//   • Bind cross-module events (measurement saved/deleted -> chart + analytics re-render).
//   • Action dispatcher for data-action / data-change / data-input attributes.

import { state, setToast, on } from './core/state.js';
import { t } from './i18n/index.js';
import { getLocale } from './core/utils.js';
import { onBackButton, minimizeApp } from './core/platform.js';

import {
  // pressure
  saveMeasurement, attachPressureListeners, updateLastReading,
  updateHeaderStatus, openWHOInfo, sendCriticalSMS, testEmergency,
} from './features/pressure/index.js';
import {
  // meds
  addPill, togglePill, deletePill, searchPharmacy,
  renderPills, onPillDaysChange, checkDrugName,
} from './features/meds/index.js';
import {
  // steps
  toggleStepCounter, enableSteps, saveStepGoal,
} from './features/steps/index.js';
import {
  // charts
  renderChart, setChartPeriod, togglePulseChart, setupChartTooltip,
} from './features/charts/index.js';
import {
  // analytics
  renderAnalytics, renderRecommendations, renderBMI,
  toggleHealthTooltip, toggleReco, openTrendModal, closeTrendModal,
} from './features/analytics/index.js';
import {
  // history
  renderHistory, setHistoryPeriod, deleteMeasurement, clearHistory,
} from './features/history/index.js';
import {
  // export
  openExportModal, closeExportModal, selectExportPeriod, updateExportCount,
  exportPDF, exportCSV, exportReportCSV, exportData, importData,
  printReportPeriod, setPDFShowPage,
} from './features/export/index.js';
import {
  // settings
  applyTheme, toggleTheme,
  setLang, registerReRender,
  saveProfile, updateHeader, loadProfileFields,
  toggleNotifications, toggleMeasureReminder, saveReminderTimes, scheduleNotifications,
  clearAllData,
  acceptDisclaimer, openDisclaimerModal, closeDisclaimerModal, checkDisclaimer,
  acceptNotifPerm, declineNotifPerm,
  sendEmailReminder, sendSmsReminder, renderEmailSmsTargets,
} from './features/settings/index.js';
import {
  // PWA
  installApp, registerSW, applyUpdate, setupOnlineIndicator,
} from './features/pwa/index.js';

// ── Toast (DOM-bound) ─────────────────────────────────────────
function showToast(msg, dur = 2500) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), dur);
}
setToast(showToast);

// ── Dynamic header height ─────────────────────────────────────
// The header content (user name, date) changes between languages and themes,
// so the sticky nav-tabs need a real measured offset, not a hard-coded value.
export function updateHeaderHeight() {
  const h = document.querySelector('.header')?.offsetHeight;
  if (!h) return;
  document.documentElement.style.setProperty('--header-height', h + 'px');
}

// ── Page navigation ───────────────────────────────────────────
export function showPage(name) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
  document.getElementById('page-' + name)?.classList.add('active');
  document.getElementById('tab-' + name)?.classList.add('active');
  if (name === 'history') renderHistory();
  if (name === 'pressure') { renderChart(); renderChart(); }
  if (name === 'pills') renderPills();
  if (name === 'analytics') renderAnalytics();
}

// PDF report needs to switch to the pressure page to capture the chart.
setPDFShowPage(showPage);

// ── Cross-module re-renders ───────────────────────────────────
on('measurement:saved', () => {
  try { renderChart(); } catch (e) { /* noop */ }
  try { renderAnalytics(); } catch (e) { /* noop */ }
});
on('measurement:deleted', () => {
  try { renderChart(); } catch (e) { /* noop */ }
  try { updateLastReading(); } catch (e) { /* noop */ }
});

// Re-render dynamic views when language changes
registerReRender(() => { try { renderAnalytics(); } catch (e) { /* noop */ } });
registerReRender(() => { try { renderHistory(); } catch (e) { /* noop */ } });
registerReRender(() => { try { renderPills(); } catch (e) { /* noop */ } });
registerReRender(() => { try { renderRecommendations(); } catch (e) { /* noop */ } });
registerReRender(() => { try { renderBMI(); } catch (e) { /* noop */ } });
registerReRender(() => { try { updateHeader(); } catch (e) { /* noop */ } });
registerReRender(() => { try { renderEmailSmsTargets(); } catch (e) { /* noop */ } });
// Header text length changes with language → re-measure for sticky nav.
registerReRender(() => { setTimeout(updateHeaderHeight, 0); });

// ── INIT ──────────────────────────────────────────────────────
function init() {
  checkDisclaimer();
  applyTheme();
  setLang(state.lang);

  const d = new Date();
  const headerDate = document.getElementById('headerDate');
  if (headerDate) {
    headerDate.textContent = d.toLocaleDateString(getLocale(), {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  loadProfileFields();
  if (state.settings.name) updateHeader();
  document.getElementById('notifToggle')?.classList.toggle('on', !!state.settings.notif);
  document.getElementById('measureToggle')?.classList.toggle('on', !!state.settings.measureReminder);
  document.getElementById('lang-uk')?.classList.toggle('active', state.lang === 'uk');
  document.getElementById('lang-ru')?.classList.toggle('active', state.lang === 'ru');

  // Validate stored notification permission
   if (state.settings.notif && 'Notification' in window && Notification.permission !== 'granted') {
     state.settings.notif = false;
     document.getElementById('notifToggle')?.classList.remove('on');
   }

  

  attachPressureListeners();
  updateLastReading();
  updateHeaderStatus();
  setTimeout(() => { renderChart(); setupChartTooltip(); }, 100);
  renderPills();
  registerSW();
  setupOnlineIndicator();

  // Step counter restore
  if (state.settings.stepsEnabled) enableSteps();

  // Swipe between tabs
  const pages = ['pressure', 'analytics', 'pills', 'history', 'profile', 'settings'];
  let swipeStartX = 0, swipeStartY = 0;
  document.body.addEventListener('touchstart', (e) => {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
  }, { passive: true });
  document.body.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = e.changedTouches[0].clientY - swipeStartY;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const activeTab = document.querySelector('.nav-tab.active');
    const btn = activeTab?.id?.replace('tab-', '');
    const idx = pages.indexOf(btn);
    if (dx < -40 && idx < pages.length - 1) showPage(pages[idx + 1]);
    else if (dx > 40 && idx > 0) showPage(pages[idx - 1]);
  }, { passive: true });

  // Step counter PWA note
  const stepSubEl = document.getElementById('t-step-sub');
  if (stepSubEl) {
    stepSubEl.textContent = t('app-step-sub');
  }

  onPillDaysChange();

  // Round 4 #2 — schedule was previously polled every minute (only worked
  // while the app was open). Now we pre-schedule via Android AlarmManager
  // (see notifications.scheduleAllReminders) so reminders fire even when
  // the app is killed. This call just hydrates the schedule on startup.
  scheduleNotifications();
  setInterval(renderPills, 60000);

  // Hardware Back button (Android). Order: open modal → close it;
  // not on home tab → go to home; otherwise minimize the app.
  onBackButton(() => {
    const openModal = document.querySelector(
      '.modal-overlay.show, .critical-wrap.show, .disclaimer-modal.show'
    );
    if (openModal) { openModal.classList.remove('show'); document.body.style.overflow = ''; return; }
    const activeTab = document.querySelector('.nav-tab.active');
    const cur = activeTab?.id?.replace('tab-', '');
    if (cur && cur !== 'pressure') { showPage('pressure'); return; }
    minimizeApp();
  });

  // Initial measurement after layout settles, plus a watcher on the header
  // so any internal text/UI change re-syncs --header-height for sticky nav.
  requestAnimationFrame(() => {
    updateHeaderHeight();
    const headerEl = document.querySelector('.header');
    if (headerEl && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => updateHeaderHeight());
      ro.observe(headerEl);
    }
  });
}

window.addEventListener('resize', () => {
  setTimeout(renderChart, 50);
  updateHeaderHeight();
});

// ── Event delegation: replaces removed inline on* handlers ───
const ACTIONS = {
  // navigation / lang / theme
  setLang: (el) => setLang(el.dataset.lang),
  showPage: (el) => showPage(el.dataset.page),
  toggleTheme: () => toggleTheme(),
  // measurements
  saveMeasurement: () => saveMeasurement(),
  deleteMeasurement: (el) => deleteMeasurement(el.dataset.time),
  setChartPeriod: (el) => setChartPeriod(parseInt(el.dataset.period, 10), el),
  togglePulseChart: () => togglePulseChart(),
  setHistoryPeriod: (el) => setHistoryPeriod(el.dataset.period, el),
  clearHistory: () => clearHistory(),
  // pills
  addPill: () => addPill(),
  togglePill: (el) => togglePill(parseInt(el.dataset.id, 10)),
  deletePill: (el) => deletePill(parseInt(el.dataset.id, 10)),
  searchPharmacy: (el) => searchPharmacy(el.dataset.pharmacy),
  // analytics
  openTrendModal: () => openTrendModal(),
  closeTrendModal: (el, ev) => closeTrendModal(ev),
  closeTrendBtn: () => document.getElementById('trendModal').classList.remove('show'),
  openWHOInfo: () => openWHOInfo(),
  closeWhoBtn: () => document.getElementById('whoModal').classList.remove('show'),
  toggleHealthTooltip: () => toggleHealthTooltip(),
  toggleReco: (el) => toggleReco(parseInt(el.dataset.idx, 10)),
  // profile / settings
  saveProfile: () => saveProfile(),
  toggleNotifications: () => toggleNotifications(),
  toggleMeasureReminder: () => toggleMeasureReminder(),
  saveReminderTimes: () => saveReminderTimes(),
  toggleStepCounter: () => toggleStepCounter(),
  saveStepGoal: () => saveStepGoal(),
  testEmergency: () => testEmergency(),
  sendCriticalSMS: () => sendCriticalSMS(),
  sendEmailReminder: () => sendEmailReminder(),
  sendSmsReminder: () => sendSmsReminder(),
  closeCritical: (el) => el.closest('.critical-wrap')?.classList.remove('show'),
  // export
  openExportModal: () => openExportModal(),
  closeExportModal: () => closeExportModal(),
  selectExportPeriod: (el) => selectExportPeriod(el.dataset.period, el),
  updateExportCount: () => updateExportCount(),
  exportPDF: () => exportPDF(),
  exportCSV: () => exportCSV(),
  exportReportCSV: () => exportReportCSV(),
  printReportPeriod: () => printReportPeriod(),
  exportData: () => exportData(),
  importData: (el, ev) => importData(ev),
  clearAllData: () => clearAllData(),
  // disclaimer / welcome
  acceptDisclaimer: () => acceptDisclaimer(),
  openDisclaimerModal: () => openDisclaimerModal(),
  closeDisclaimerModal: () => closeDisclaimerModal(),
  // notif permission modal (post-disclaimer)
  acceptNotifPerm: () => acceptNotifPerm(),
  declineNotifPerm: () => declineNotifPerm(),
  dismissNotifPerm: (el, ev) => { if (ev.target === el) declineNotifPerm(); },
  // pills form
  onPillDaysChange: () => onPillDaysChange(),
  checkDrugName: () => checkDrugName(),
  // PWA
  installApp: () => installApp(),
  applyUpdate: () => applyUpdate(),
  // generic dismissals
  stop: (el, ev) => ev.stopPropagation(),
  dismissDisclaimer: (el, ev) => { if (ev.target === el) closeDisclaimerModal(); },
  dismissExport: (el, ev) => { if (ev.target === el) closeExportModal(); },
  dismissSelf: (el, ev) => { if (ev.target === el) el.classList.remove('show'); },
};

function dispatchByAttr(attr, ev) {
  const el = ev.target.closest('[' + attr + ']');
  if (!el) return;
  const key = attr.slice('data-'.length);
  const name = el.dataset[key];
  const handler = ACTIONS[name];
  if (handler) handler(el, ev);
}

document.addEventListener('click',  (ev) => dispatchByAttr('data-action', ev));
document.addEventListener('change', (ev) => dispatchByAttr('data-change', ev));
document.addEventListener('input',  (ev) => dispatchByAttr('data-input',  ev));

export function bootApp() {
  init();
}
