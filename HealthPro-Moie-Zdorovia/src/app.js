// Thin entry point. All business logic lives in src/features/* modules.
// Responsibilities of this file:
//   • Wire showToast (DOM-bound) into the shared state container.
//   • Define showPage() because it crosses every feature.
//   • Run init() (theme, lang, profile, pressure listeners, charts, pills).
//   • Bind cross-module events (measurement saved/deleted -> chart + analytics re-render).
//   • Action dispatcher for data-action / data-change / data-input attributes.

import { state, setToast, on, saveData } from './core/state.js';
import { t } from './i18n/index.js';
import { getLocale } from './core/utils.js';
import { APP_BUILD_LABEL, APP_BUILD_FULL } from './core/constants.js';
import { _setStateRef } from './core/db.js';
import {
  onBackButton,
  minimizeApp,
  checkNotificationPermission,
} from './core/platform.js';

import {
  // pressure
  saveMeasurement, attachPressureListeners, updateLastReading,
  updateHeaderStatus, openWHOInfo, sendCriticalSMS, testEmergency,
} from './features/pressure/index.js';
import {
  // meds
  addPill, togglePill, deletePill, searchPharmacy, searchTabletki, selectPillDay,
  renderPills, onPillDaysChange, checkDrugName, openDrugWarnModal,
} from './features/meds/index.js';
import {
  // steps
  toggleStepCounter, enableSteps, saveStepGoal,
  acceptStepPerm, declineStepPerm,
  acceptStepFg,   declineStepFg,
} from './features/steps/index.js';
import {
  // charts
  renderChart, setChartPeriod, togglePulseChart, setupChartTooltip,
} from './features/charts/index.js';
import {
  // analytics
  renderAnalytics, renderRecommendations, renderBMI,
  toggleHealthTooltip, toggleReco, openTrendModal, closeTrendModal,
  disposeScatterChart, disposeBPZonesChart, disposeIZChart,
  renderIZChart, renderScatterChart, renderBPZonesChart,
} from './features/analytics/index.js';
import {
  // history
  renderHistory, setHistoryPeriod, deleteMeasurement, clearHistory,
} from './features/history/index.js';
import {
  // journal (v5.1) — date-range picker + note display
  renderJournal, setJournalFrom, setJournalTo, setJournalType,
} from './features/journal/index.js';
import {
  // export
  openExportModal, closeExportModal, selectExportPeriod, updateExportCount,
  exportPDF, exportCSV, exportReportCSV, exportData, importData,
  printReportPeriod, setPDFShowPage, generateDoctorReport,
} from './features/export/index.js';
import { renderAdherenceChart, disposeAdherenceChart } from './features/analytics/index.js';
import { checkBiometric, authenticate } from './core/biometric.js';
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
  if (name === 'history') renderJournal();
  if (name === 'pressure') { renderChart(); renderChart(); }
  if (name === 'pills') renderPills();
  if (name === 'analytics') renderAnalytics();
  // Закриваємо аналітичні модалки та dispose ECharts при переході з аналітики
  if (name !== 'analytics') {
    document.getElementById('izTrendModal')?.classList.remove('show');
    document.getElementById('bpZonesModal')?.classList.remove('show');
    document.getElementById('scatterModal')?.classList.remove('show');
    try { disposeScatterChart('scatterChart'); } catch { /* noop */ }
    try { disposeBPZonesChart('bpZonesChart'); } catch { /* noop */ }
    try { disposeIZChart(); } catch { /* noop */ }
  }
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
  document.getElementById('notifToggle')?.classList.toggle('on', !!state.settings.pillReminder);
  document.getElementById('measureToggle')?.classList.toggle('on', !!state.settings.measureReminder);
  document.getElementById('lang-uk')?.classList.toggle('active', state.lang === 'uk');
  document.getElementById('lang-ru')?.classList.toggle('active', state.lang === 'ru');

  // Keep a lightweight permission sanity check on startup so measurement
  // reminders don't stay enabled in UI if OS permission was revoked.
  if (state.settings.measureReminder) {
    checkNotificationPermission().then((granted) => {
      if (!granted) {
        state.settings.measureReminder = false;
        document.getElementById('measureToggle')?.classList.remove('on');
      }
    });
  }
  if (state.settings.pillReminder) {
    checkNotificationPermission().then((granted) => {
      if (!granted) {
        state.settings.pillReminder = false;
        document.getElementById('notifToggle')?.classList.remove('on');
      }
    });
  }

  // Splash screen: Android-стиль — затримка 1.6s, потім fade-out (.38s transition)
  const splash = document.getElementById('splashScreen');
  if (splash) {
    setTimeout(() => {
      splash.classList.add('hidden');
      // Повне видалення з DOM після завершення transition
      setTimeout(() => { splash.style.display = 'none'; }, 420);
    }, 1600);
  }

  // Версія додатку в налаштуваннях
  const versionEl = document.getElementById('hp-version-label');
  if (versionEl) versionEl.textContent = APP_BUILD_FULL || APP_BUILD_LABEL;

  // Реєструємо посилання на state у db.js (уникаємо циклічних залежностей)
  _setStateRef(state);

  attachPressureListeners();
  updateLastReading();
  updateHeaderStatus();
  setTimeout(() => { renderChart(); setupChartTooltip(); }, 100);
  renderPills();
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

  onPillDaysChange();

  // ── Biometric lock init (Task 2) ──
  const _st = state.settings;
  const biometricBtn = document.getElementById('biometricToggle');
  if (biometricBtn) biometricBtn.classList.toggle('active', !!_st.biometricLock);
  if (_st.biometricLock) {
    checkBiometric().then((avail) => {
      if (avail) {
        document.getElementById('lockScreen')?.classList.remove('hidden');
        authenticate().then((ok) => {
          if (ok) document.getElementById('lockScreen')?.classList.add('hidden');
        });
      } else {
        _st.biometricLock = false;
        saveData();
        if (biometricBtn) biometricBtn.classList.remove('active');
      }
    });
  }

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
  // journal v5.1
  setJournalType: (el) => setJournalType(el.dataset.jtype),
  onJournalFromChange: (el) => setJournalFrom(el.value),
  onJournalToChange: (el) => setJournalTo(el.value),
  // pills
  addPill: () => addPill(),
  togglePill: (el) => togglePill(parseInt(el.dataset.id, 10)),
  deletePill: (el) => deletePill(parseInt(el.dataset.id, 10)),
  searchPharmacy: (el) => searchPharmacy(el.dataset.pharmacy),
  searchTabletki: (el) => searchTabletki(el.dataset.drug || ''),
  selectPillDay: (el) => selectPillDay(el),
  // analytics
  openTrendModal: () => openTrendModal(),
  closeTrendModal: (el, ev) => closeTrendModal(ev),
  closeTrendBtn: () => document.getElementById('trendModal').classList.remove('show'),
  openWHOInfo: () => openWHOInfo(),
  closeWhoBtn: () => document.getElementById('whoModal').classList.remove('show'),
  toggleHealthTooltip: () => toggleHealthTooltip(),
  toggleReco: (el) => toggleReco(parseInt(el.dataset.idx, 10)),
  // аналітика — допоміжні модалки (IZ тренд, зони, кроки↔тиск)
  openIZTrendModal: () => { renderIZChart().catch(() => {}); document.getElementById('izTrendModal')?.classList.add('show'); },
  closeIZTrendModal: () => { disposeIZChart(); document.getElementById('izTrendModal')?.classList.remove('show'); },
  openBPZonesModal: () => { renderBPZonesChart('bpZonesChartModal').catch(() => {}); document.getElementById('bpZonesModal')?.classList.add('show'); },
  closeBPZonesModal: () => { disposeBPZonesChart('bpZonesChartModal'); document.getElementById('bpZonesModal')?.classList.remove('show'); },
  openScatterModal: () => { renderScatterChart('scatterChart').catch(() => {}); document.getElementById('scatterModal')?.classList.add('show'); },
  closeScatterModal: () => { disposeScatterChart('scatterChart'); document.getElementById('scatterModal')?.classList.remove('show'); },
  // ліки — попередження про дозу
  openDrugWarnModal: () => openDrugWarnModal(),
  closeDrugWarnModal: () => document.getElementById('drugWarnModal')?.classList.remove('show'),
  // tips toggle
  toggleTipsBlock: () => {
    const body = document.getElementById('tipsBody');
    const chevron = document.getElementById('tipsChevron');
    if (!body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    if (chevron) chevron.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
  },
  // bp standard switcher
  setBPStandard: (el) => {
    const std = el.dataset.std;
    if (!std) return;
    state.settings.bpStandard = std;
    saveData();
    document.querySelectorAll('[data-action="setBPStandard"]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.std === std);
    });
    // Оновлення мітки категорії тиску залежно від стандарту
    const whoLabel = document.getElementById('t-who-cat');
    if (whoLabel) whoLabel.textContent = std === 'AHA2017' ? t('t-who-cat-aha') : t('t-who-cat');
    // Перерахувати аналітику та журнал
    try { renderAnalytics(); } catch (e) { /* noop */ }
    try { renderJournal(); } catch (e) { /* noop */ }
    try { renderHistory(); } catch (e) { /* noop */ }
    showToast(std === 'ESC2024' ? 'ESC 2024 ✓' : 'AHA 2017 ✓');
  },
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
  // step permission modal (Modal A)
  acceptStepPerm: () => acceptStepPerm(),
  declineStepPerm: () => declineStepPerm(),
  // step foreground consent modal (Modal B)
  acceptStepFg: () => acceptStepFg(),
  declineStepFg: () => declineStepFg(),
  // pills form
  onPillDaysChange: () => onPillDaysChange(),
  // adherence chart (Task 3)
  openAdherenceModal: () => {
    renderAdherenceChart('adherenceChartContainer');
    document.getElementById('adherenceModal')?.classList.add('show');
  },
  closeAdherenceModal: () => {
    disposeAdherenceChart('adherenceChartContainer');
    document.getElementById('adherenceModal')?.classList.remove('show');
  },
  // doctor PDF report (Task 5)
  generateDoctorReport: () => generateDoctorReport(),
  // biometric lock (Task 2)
  toggleBiometric: () => {
    const st = state.settings;
    const newVal = !st.biometricLock;
    st.biometricLock = newVal;
    saveData();
    const btn = document.getElementById('biometricToggle');
    if (btn) btn.classList.toggle('active', newVal);
    if (newVal) {
      checkBiometric().then((avail) => {
        if (!avail) {
          st.biometricLock = false;
          saveData();
          if (btn) btn.classList.remove('active');
          showToast('Біометрія недоступна на цьому пристрої');
        }
      });
    }
  },
  unlockApp: () => {
    authenticate().then((ok) => {
      if (ok) document.getElementById('lockScreen')?.classList.add('hidden');
      else showToast('Автентифікацію скасовано');
    });
  },
  checkDrugName: () => checkDrugName(),
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
