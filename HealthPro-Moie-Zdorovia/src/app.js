// Thin entry point. All business logic lives in src/features/* modules.
// Responsibilities of this file:
//   • Wire showToast (DOM-bound) into the shared state container.
//   • Define showPage() because it crosses every feature.
//   • Run init() (theme, lang, profile, pressure listeners, charts, pills).
//   • Bind cross-module events (measurement saved/deleted -> chart + analytics re-render).
//   • Action dispatcher for data-action / data-change / data-input attributes.

import { state, setToast, on, saveData } from "./core/state.js";
import { t } from "./i18n/index.js";
import { getLocale } from "./core/utils.js";
import { APP_BUILD_LABEL, APP_BUILD_FULL } from "./core/constants.js";
import { _setStateRef } from "./core/db.js";
import {
  onBackButton,
  minimizeApp,
  checkNotificationPermission,
  onResume,
} from "./core/platform.js";

import {
  // pressure
  saveMeasurement,
  attachPressureListeners,
  updateLastReading,
  updateHeaderStatus,
  openWHOInfo,
  sendCriticalSMS,
  testEmergency,
} from "./features/pressure/index.js";
import {
  // meds
  addPill,
  togglePill,
  deletePill,
  searchPharmacy,
  searchTabletki,
  selectPillDay,
  renderPills,
  onPillDaysChange,
  checkDrugName,
  openDrugWarnModal,
} from "./features/meds/index.js";
import {
  // steps
  toggleStepCounter,
  enableSteps,
  saveStepGoal,
  acceptStepPerm,
  declineStepPerm,
  acceptStepFg,
  declineStepFg,
  openStepsDayModal,
  closeStepsDayModal,
  disposeStepsDayChart,
} from "./features/steps/index.js";
import {
  // charts
  renderChart,
  setChartPeriod,
  togglePulseChart,
  setupChartTooltip,
} from "./features/charts/index.js";
import {
  // analytics
  renderAnalytics,
  renderRecommendations,
  renderBMI,
  toggleHealthTooltip,
  toggleReco,
  openTrendModal,
  closeTrendModal,
  disposeScatterChart,
  disposeBPZonesChart,
  disposeIZChart,
  renderIZChart,
  renderScatterChart,
  renderBPZonesChart,
} from "./features/analytics/index.js";
import {
  // history
  renderHistory,
  setHistoryPeriod,
  deleteMeasurement,
  clearHistory,
} from "./features/history/index.js";
import {
  // journal (v5.1) — date-range picker + note display
  renderJournal,
  setJournalFrom,
  setJournalTo,
  setJournalType,
} from "./features/journal/index.js";
import {
  // export
  openExportModal,
  closeExportModal,
  selectExportPeriod,
  updateExportCount,
  exportPDF,
  exportCSV,
  exportReportCSV,
  exportData,
  importData,
  printReportPeriod,
  setPDFShowPage,
  generateDoctorReport,
  exportBackup,
  openBackupFile,
  restoreBackup,
  getBackupStats,
} from "./features/export/index.js";
import {
  renderAdherenceChart,
  disposeAdherenceChart,
} from "./features/analytics/index.js";
import { isPINSet, setPIN, verifyPIN, clearPIN } from "./core/pin.js";
import { checkBiometric, authenticate } from "./core/biometric.js";
import {
  // settings
  applyTheme,
  toggleTheme,
  setLang,
  registerReRender,
  saveProfile,
  updateHeader,
  loadProfileFields,
  toggleNotifications,
  toggleMeasureReminder,
  saveReminderTimes,
  scheduleNotifications,
  clearAllData,
  acceptDisclaimer,
  openDisclaimerModal,
  closeDisclaimerModal,
  checkDisclaimer,
  acceptNotifPerm,
  declineNotifPerm,
  sendEmailReminder,
  sendSmsReminder,
  renderEmailSmsTargets,
} from "./features/settings/index.js";

// ── Toast (DOM-bound) ─────────────────────────────────────────
function showToast(msg, dur = 2500) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), dur);
}
setToast(showToast);

// ── Dynamic header height ─────────────────────────────────────
// The header content (user name, date) changes between languages and themes,
// so the sticky nav-tabs need a real measured offset, not a hard-coded value.
export function updateHeaderHeight() {
  const h = document.querySelector(".header")?.offsetHeight;
  if (!h) return;
  document.documentElement.style.setProperty("--header-height", h + "px");
}

// ── Page navigation ───────────────────────────────────────────
export function showPage(name) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("page-" + name)?.classList.add("active");
  document.getElementById("tab-" + name)?.classList.add("active");
  if (name === "history") renderJournal();
  if (name === "pressure") {
    renderChart();
    renderChart();
  }
  if (name === "pills") renderPills();
  if (name === "settings") {
    checkBiometric().then((avail) => {
      const bioRow = document.getElementById("bioToggleRow");
      if (bioRow) bioRow.style.display = avail ? "" : "none";
      const bioChk = document.getElementById("bioToggle");
      if (bioChk) bioChk.checked = !!(avail && state.settings.biometricEnabled);
    });
  }
  if (name === "analytics") renderAnalytics();
  // Закриваємо аналітичні модалки та dispose ECharts при переході з аналітики
  if (name !== "analytics") {
    document.getElementById("izTrendModal")?.classList.remove("show");
    document.getElementById("bpZonesModal")?.classList.remove("show");
    document.getElementById("scatterModal")?.classList.remove("show");
    try {
      disposeScatterChart("scatterChart");
    } catch {
      /* noop */
    }
    try {
      disposeBPZonesChart("bpZonesChart");
    } catch {
      /* noop */
    }
    try {
      disposeIZChart();
    } catch {
      /* noop */
    }
    try {
      disposeStepsDayChart("stepsDayChart");
    } catch {
      /* noop */
    }
    document.getElementById("stepsDayModal")?.classList.remove("show");
  }
}

// PDF report needs to switch to the pressure page to capture the chart.
setPDFShowPage(showPage);

// ── Cross-module re-renders ───────────────────────────────────
on("measurement:saved", () => {
  try {
    renderChart();
  } catch (e) {
    /* noop */
  }
  try {
    renderAnalytics();
  } catch (e) {
    /* noop */
  }
});
on("measurement:deleted", () => {
  try {
    renderChart();
  } catch (e) {
    /* noop */
  }
  try {
    updateLastReading();
  } catch (e) {
    /* noop */
  }
});

// Re-render dynamic views when language changes
registerReRender(() => {
  try {
    renderAnalytics();
  } catch (e) {
    /* noop */
  }
});
registerReRender(() => {
  try {
    renderHistory();
  } catch (e) {
    /* noop */
  }
});
registerReRender(() => {
  try {
    renderPills();
  } catch (e) {
    /* noop */
  }
});
registerReRender(() => {
  try {
    renderRecommendations();
  } catch (e) {
    /* noop */
  }
});
registerReRender(() => {
  try {
    renderBMI();
  } catch (e) {
    /* noop */
  }
});
registerReRender(() => {
  try {
    updateHeader();
  } catch (e) {
    /* noop */
  }
});
registerReRender(() => {
  try {
    renderEmailSmsTargets();
  } catch (e) {
    /* noop */
  }
});
// Header text length changes with language → re-measure for sticky nav.
registerReRender(() => {
  setTimeout(updateHeaderHeight, 0);
});

// ── INIT ──────────────────────────────────────────────────────
function init() {
  checkDisclaimer();
  applyTheme();
  setLang(state.lang);

  const d = new Date();
  const headerDate = document.getElementById("headerDate");
  if (headerDate) {
    headerDate.textContent = d.toLocaleDateString(getLocale(), {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  loadProfileFields();
  if (state.settings.name) updateHeader();
  document
    .getElementById("notifToggle")
    ?.classList.toggle("on", !!state.settings.pillReminder);
  document
    .getElementById("measureToggle")
    ?.classList.toggle("on", !!state.settings.measureReminder);
  document
    .getElementById("lang-uk")
    ?.classList.toggle("active", state.lang === "uk");
  document
    .getElementById("lang-ru")
    ?.classList.toggle("active", state.lang === "ru");

  // Keep a lightweight permission sanity check on startup so measurement
  // reminders don't stay enabled in UI if OS permission was revoked.
  if (state.settings.measureReminder) {
    checkNotificationPermission().then((granted) => {
      if (!granted) {
        state.settings.measureReminder = false;
        document.getElementById("measureToggle")?.classList.remove("on");
      }
    });
  }
  if (state.settings.pillReminder) {
    checkNotificationPermission().then((granted) => {
      if (!granted) {
        state.settings.pillReminder = false;
        document.getElementById("notifToggle")?.classList.remove("on");
      }
    });
  }

  // Splash screen: Android-стиль — затримка 1.6s, потім fade-out (.38s transition)
  const splash = document.getElementById("splashScreen");
  if (splash) {
    setTimeout(() => {
      splash.classList.add("hidden");
      // Повне видалення з DOM після завершення transition
      setTimeout(() => {
        splash.style.display = "none";
      }, 420);
    }, 1600);
  }

  // Версія додатку в налаштуваннях
  const versionEl = document.getElementById("hp-version-label");
  if (versionEl) versionEl.textContent = APP_BUILD_FULL || APP_BUILD_LABEL;

  // Реєструємо посилання на state у db.js (уникаємо циклічних залежностей)
  _setStateRef(state);

  attachPressureListeners();
  updateLastReading();
  updateHeaderStatus();
  setTimeout(() => {
    renderChart();
    setupChartTooltip();
  }, 100);
  renderPills();
  // Step counter restore
  if (state.settings.stepsEnabled) enableSteps();

  // Swipe between tabs
  const pages = [
    "pressure",
    "analytics",
    "pills",
    "history",
    "profile",
    "settings",
  ];
  let swipeStartX = 0,
    swipeStartY = 0;
  document.body.addEventListener(
    "touchstart",
    (e) => {
      swipeStartX = e.touches[0].clientX;
      swipeStartY = e.touches[0].clientY;
    },
    { passive: true },
  );
  document.body.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - swipeStartX;
      const dy = e.changedTouches[0].clientY - swipeStartY;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const activeTab = document.querySelector(".nav-tab.active");
      const btn = activeTab?.id?.replace("tab-", "");
      const idx = pages.indexOf(btn);
      if (dx < -40 && idx < pages.length - 1) showPage(pages[idx + 1]);
      else if (dx > 40 && idx > 0) showPage(pages[idx - 1]);
    },
    { passive: true },
  );

  onPillDaysChange();

  // ── PIN lock init (П1 + біометрія) ──
  const _st = state.settings;
  const biometricBtn = document.getElementById("biometricToggle");
  if (biometricBtn) biometricBtn.classList.toggle("on", !!_st.biometricLock);
  // Sync bpStandard toggle buttons after reload/restore (Б3)
  const _bpStd = _st.bpStandard || "ESC2024";
  document
    .getElementById("bp-std-esc")
    ?.classList.toggle("active", _bpStd === "ESC2024");
  document
    .getElementById("bp-std-aha")
    ?.classList.toggle("active", _bpStd === "AHA2017");
  // Guard: якщо PIN очищено (наприклад, після відновлення) — вимикаємо замок
  if (_st.biometricLock && !isPINSet()) {
    _st.biometricLock = false;
    _st.biometricEnabled = false;
    saveData();
    if (biometricBtn) biometricBtn.classList.remove("on");
  }
  // Показуємо рядок відбитка тільки якщо є апаратна підтримка
  checkBiometric().then((avail) => {
    const bioRow = document.getElementById("bioToggleRow");
    if (bioRow) bioRow.style.display = avail ? "" : "none";
    if (!avail && _st.biometricEnabled) {
      _st.biometricEnabled = false;
      saveData();
    }
    const bioChk = document.getElementById("bioToggle");
    if (bioChk) bioChk.checked = !!(avail && _st.biometricEnabled);
  });
  // lockCheck() показує lockScreen + кнопку відбитка (БЕЗ авто-authenticate)
  lockCheck();

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
      ".modal-overlay.show, .critical-wrap.show, .disclaimer-modal.show",
    );
    if (openModal) {
      openModal.classList.remove("show");
      document.body.style.overflow = "";
      return;
    }
    const activeTab = document.querySelector(".nav-tab.active");
    const cur = activeTab?.id?.replace("tab-", "");
    if (cur && cur !== "pressure") {
      showPage("pressure");
      return;
    }
    minimizeApp();
  });

  // Initial measurement after layout settles, plus a watcher on the header
  // so any internal text/UI change re-syncs --header-height for sticky nav.
  requestAnimationFrame(() => {
    updateHeaderHeight();
    const headerEl = document.querySelector(".header");
    if (headerEl && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => updateHeaderHeight());
      ro.observe(headerEl);
    }
  });
  // Блокування при поверненні з фону
  onResume(() => {
    if (isPINSet() && state.settings.biometricLock) {
      lockCheck();
    }
  });
}

window.addEventListener("resize", () => {
  setTimeout(renderChart, 50);
  updateHeaderHeight();
});

// ── Backup state ──────────────────────────────────────────────
let _backupFileContent = null;
let _backupOpened = null;

// ── PIN state (П1) ────────────────────────────────────────────
let _lockPinBuf = "";
let _setupPinBuf = "";
let _setupStep = 1;
let _setupFirst = "";

function _updatePinDots(prefix, count) {
  for (let i = 0; i < 4; i++) {
    document.getElementById(prefix + i)?.classList.toggle("filled", i < count);
  }
}

function openPINSetup() {
  _setupPinBuf = "";
  _setupStep = 1;
  _setupFirst = "";
  _updatePinDots("spd", 0);
  const errEl = document.getElementById("setupPinError");
  if (errEl) errEl.textContent = "";
  const sub = document.getElementById("pinSetupSubtitle");
  if (sub) sub.textContent = t("pin-setup-step1");
  document.getElementById("pinSetupModal")?.classList.add("show");
}

// ── Mutex для біометрії (запобігає подвійному виклику) ───────────────────────
let _bioLockBusy = false;

// ── Показати lockScreen + оновити видимість кнопки відбитка ──────────────────
// НІКОЛИ не викликає authenticate() автоматично — тільки по тапу користувача.
function lockCheck() {
  if (!isPINSet()) return;
  const _st = state.settings;
  if (!_st.biometricLock) return;

  // Показати lockScreen синхронно
  document.getElementById("lockScreen")?.classList.remove("hidden");

  // Показати / сховати кнопку відбитка залежно від налаштувань
  const bioBtnEl = document.getElementById("lockBioBtn");
  if (bioBtnEl) {
    if (_st.biometricEnabled) {
      checkBiometric().then((avail) => {
        bioBtnEl.style.display = avail ? "flex" : "none";
      });
    } else {
      bioBtnEl.style.display = "none";
    }
  }
}

function showBackupConfirmModal(opened) {
  const stats = getBackupStats(opened);
  const el = document.getElementById("bkConfirmStats");
  if (el) {
    const row = (label, val) =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border)">` +
      `<span style="color:var(--text2);font-size:13px">${label}</span><b style="font-size:14px">${val}</b></div>`;
    el.innerHTML =
      `<div style="font-size:13px">` +
      row(t("bk-stats-m"), stats.measurements) +
      row(t("bk-stats-med"), stats.medications) +
      row(t("bk-stats-steps"), stats.steps) +
      row(t("bk-stats-date"), stats.date) +
      `</div>`;
  }
  document.getElementById("backupConfirmModal")?.classList.add("show");
}

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
  searchTabletki: (el) => searchTabletki(el.dataset.drug || ""),
  selectPillDay: (el) => selectPillDay(el),
  // analytics
  openTrendModal: () => openTrendModal(),
  closeTrendModal: (el, ev) => closeTrendModal(ev),
  closeTrendBtn: () =>
    document.getElementById("trendModal").classList.remove("show"),
  openWHOInfo: () => openWHOInfo(),
  closeWhoBtn: () =>
    document.getElementById("whoModal").classList.remove("show"),
  toggleHealthTooltip: () => toggleHealthTooltip(),
  toggleReco: (el) => toggleReco(parseInt(el.dataset.idx, 10)),
  // аналітика — допоміжні модалки (IZ тренд, зони, кроки↔тиск)
  openIZTrendModal: () => {
    renderIZChart().catch(() => {});
    document.getElementById("izTrendModal")?.classList.add("show");
  },
  closeIZTrendModal: () => {
    disposeIZChart();
    document.getElementById("izTrendModal")?.classList.remove("show");
  },
  openBPZonesModal: () => {
    renderBPZonesChart("bpZonesChartModal").catch(() => {});
    document.getElementById("bpZonesModal")?.classList.add("show");
  },
  closeBPZonesModal: () => {
    disposeBPZonesChart("bpZonesChartModal");
    document.getElementById("bpZonesModal")?.classList.remove("show");
  },
  openScatterModal: () => {
    renderScatterChart("scatterChart").catch(() => {});
    document.getElementById("scatterModal")?.classList.add("show");
  },
  closeScatterModal: () => {
    disposeScatterChart("scatterChart");
    document.getElementById("scatterModal")?.classList.remove("show");
  },
  openStepsDayModal: () => openStepsDayModal(),
  closeStepsDayModal: () => closeStepsDayModal(),
  // ліки — попередження про дозу
  openDrugWarnModal: () => openDrugWarnModal(),
  closeDrugWarnModal: () =>
    document.getElementById("drugWarnModal")?.classList.remove("show"),
  // tips toggle
  toggleTipsBlock: () => {
    const body = document.getElementById("tipsBody");
    const chevron = document.getElementById("tipsChevron");
    if (!body) return;
    const open = body.style.display !== "none";
    body.style.display = open ? "none" : "block";
    if (chevron)
      chevron.style.transform = open ? "rotate(0deg)" : "rotate(180deg)";
  },
  // bp standard switcher
  setBPStandard: (el) => {
    const std = el.dataset.std;
    if (!std) return;
    state.settings.bpStandard = std;
    saveData();
    document
      .querySelectorAll('[data-action="setBPStandard"]')
      .forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.std === std);
      });
    // Оновлення мітки категорії тиску залежно від стандарту
    const whoLabel = document.getElementById("t-who-cat");
    if (whoLabel)
      whoLabel.textContent =
        std === "AHA2017" ? t("t-who-cat-aha") : t("t-who-cat");
    // Перерахувати аналітику та журнал
    try {
      renderAnalytics();
    } catch (e) {
      /* noop */
    }
    try {
      renderJournal();
    } catch (e) {
      /* noop */
    }
    try {
      renderHistory();
    } catch (e) {
      /* noop */
    }
    showToast(std === "ESC2024" ? "ESC 2024 ✓" : "AHA 2017 ✓");
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
  closeCritical: (el) => el.closest(".critical-wrap")?.classList.remove("show"),
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
  // backup (.hpb)
  openBackupExportModal: () => {
    document.getElementById("backupPassword").value = "";
    document.getElementById("backupPasswordConfirm").value = "";
    const tog = document.getElementById("bkUsePasswordToggle");
    const fields = document.getElementById("bkPasswordFields");
    if (tog) tog.classList.add("on");
    if (fields) fields.style.display = "block";
    document.getElementById("backupExportModal")?.classList.add("show");
  },
  closeBackupExportModal: () =>
    document.getElementById("backupExportModal")?.classList.remove("show"),
  toggleBkPassword: () => {
    const btn = document.getElementById("bkUsePasswordToggle");
    const fields = document.getElementById("bkPasswordFields");
    if (!btn) return;
    const on = btn.classList.toggle("on");
    if (fields) fields.style.display = on ? "block" : "none";
  },
  doExportBackup: async () => {
    const usePw =
      document
        .getElementById("bkUsePasswordToggle")
        ?.classList.contains("on") ?? true;
    const pw = document.getElementById("backupPassword").value.trim();
    const pw2 = document.getElementById("backupPasswordConfirm").value.trim();
    if (usePw) {
      if (!pw) {
        showToast(t("bk-err-empty-password"));
        return;
      }
      if (pw !== pw2) {
        showToast(t("bk-err-passwords-match"));
        return;
      }
    }
    try {
      document.getElementById("backupExportModal")?.classList.remove("show");
      await exportBackup(usePw ? pw : null);
    } catch (e) {
      showToast(t("bk-err-export"));
    }
  },
  onImportBackupFile: async (el) => {
    const file = el.files?.[0];
    if (!file) return;
    _backupFileContent = await file.text();
    el.value = "";
    // Legacy unencrypted JSON or no-password .hpb — skip password modal
    try {
      const pkg = JSON.parse(_backupFileContent);
      if (
        pkg.version === "4.0" ||
        (!pkg.format && (pkg.measurements || pkg.pills))
      ) {
        _backupOpened = { isLegacy: true, data: pkg, meta: null };
        showBackupConfirmModal(_backupOpened);
        return;
      }
      if (pkg.format === "healthpro-backup" && pkg.encrypted === false) {
        _backupOpened = await openBackupFile(_backupFileContent, null);
        showBackupConfirmModal(_backupOpened);
        return;
      }
    } catch {}
    document.getElementById("restorePassword").value = "";
    document.getElementById("bkImportError").style.display = "none";
    document.getElementById("backupImportModal")?.classList.add("show");
  },
  closeBackupImportModal: () => {
    document.getElementById("backupImportModal")?.classList.remove("show");
    _backupFileContent = null;
  },
  doDecryptBackup: async () => {
    const pw = document.getElementById("restorePassword").value;
    const errEl = document.getElementById("bkImportError");
    if (!pw) {
      showToast(t("bk-err-empty-password"));
      return;
    }
    try {
      _backupOpened = await openBackupFile(_backupFileContent, pw);
      document.getElementById("backupImportModal")?.classList.remove("show");
      showBackupConfirmModal(_backupOpened);
    } catch (e) {
      const msg =
        e.message === "wrong_password"
          ? t("bk-err-password")
          : e.message === "checksum_failed"
            ? t("bk-err-checksum")
            : t("bk-err-format");
      errEl.textContent = msg;
      errEl.style.display = "block";
    }
  },
  closeBackupConfirmModal: () => {
    document.getElementById("backupConfirmModal")?.classList.remove("show");
    _backupOpened = null;
    _backupFileContent = null;
  },
  doRestoreBackup: async () => {
    if (!_backupOpened) return;
    try {
      await restoreBackup(_backupOpened);
      document.getElementById("backupConfirmModal")?.classList.remove("show");
      showToast(t("bk-toast-restored"), 5000);
      setTimeout(() => location.reload(), 1500);
    } catch (e) {
      showToast(t("bk-err-restore"));
    }
  },
  clearAllData: () => clearAllData(),
  // disclaimer / welcome
  acceptDisclaimer: () => acceptDisclaimer(),
  openDisclaimerModal: () => openDisclaimerModal(),
  closeDisclaimerModal: () => closeDisclaimerModal(),
  // notif permission modal (post-disclaimer)
  acceptNotifPerm: () => acceptNotifPerm(),
  declineNotifPerm: () => declineNotifPerm(),
  dismissNotifPerm: (el, ev) => {
    if (ev.target === el) declineNotifPerm();
  },
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
    renderAdherenceChart("adherenceChartContainer");
    document.getElementById("adherenceModal")?.classList.add("show");
  },
  closeAdherenceModal: () => {
    disposeAdherenceChart("adherenceChartContainer");
    document.getElementById("adherenceModal")?.classList.remove("show");
  },
  // doctor PDF report (Task 5)
  generateDoctorReport: () => generateDoctorReport(),
  // ── PIN lock (П1) + відбиток ──
  toggleBiometric: async (el) => {
    if (el.id === "bioToggle") {
      // Відбиток пальця (checkbox) — поверх PIN
      const enabled = el.checked;
      if (enabled && !isPINSet()) {
        el.checked = false;
        showToast(t("bio-toggle-hint"));
        return;
      }
      if (enabled) {
        const avail = await checkBiometric();
        if (!avail) {
          el.checked = false;
          state.settings.biometricEnabled = false;
          saveData();
          showToast(t("bio-toggle-hint"));
          return;
        }
      }
      state.settings.biometricEnabled = enabled;
      saveData();
      return;
    }
    // PIN lock toggle (button) — існуюча логіка
    const st = state.settings;
    const btn = document.getElementById("biometricToggle");
    if (st.biometricLock && isPINSet()) {
      st.biometricLock = false;
      st.biometricEnabled = false;
      clearPIN();
      saveData();
      if (btn) btn.classList.remove("on");
      const bioChk = document.getElementById("bioToggle");
      if (bioChk) bioChk.checked = false;
      showToast(t("pin-disabled"));
    } else {
      openPINSetup();
    }
  },
  unlockApp: () => {}, // replaced by PIN pad (lockPinKey)
  // ── Кнопка відбитка на lockScreen — ТІЛЬКИ по тапу користувача ──
  lockBioBtn: async () => {
    if (_bioLockBusy) return; // mutex: не дати запустити двічі
    _bioLockBusy = true;
    const bioBtnEl = document.getElementById("lockBioBtn");
    if (bioBtnEl) bioBtnEl.disabled = true;
    try {
      // Samsung потребує delay 400мс після Activity transitions
      await new Promise((r) => setTimeout(r, 400));
      // Timeout 8с — захист від зависання Samsung BiometricPrompt
      const authResult = await Promise.race([
        authenticate(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("bio_timeout")), 8000)),
      ]);
      if (authResult === true) {
        document.getElementById("lockScreen")?.classList.add("hidden");
        _lockPinBuf = "";
        _updatePinDots("lpd", 0);
      }
      // authResult === false → скасовано або помилка → залишаємося на PIN-паді
    } catch {
      // timeout або будь-яка інша помилка → залишаємося на PIN-паді (нічого не робимо)
    } finally {
      _bioLockBusy = false;
      if (bioBtnEl) bioBtnEl.disabled = false;
    }
  },
  lockPinKey: async (el) => {
    if (_lockPinBuf.length >= 4) return;
    _lockPinBuf += el.dataset.k;
    _updatePinDots("lpd", _lockPinBuf.length);
    if (_lockPinBuf.length === 4) {
      const ok = await verifyPIN(_lockPinBuf);
      if (ok) {
        document.getElementById("lockScreen")?.classList.add("hidden");
        _lockPinBuf = "";
        _updatePinDots("lpd", 0);
      } else {
        const errEl = document.getElementById("lockPinError");
        if (errEl) errEl.textContent = t("pin-wrong");
        setTimeout(() => {
          _lockPinBuf = "";
          _updatePinDots("lpd", 0);
          if (errEl) errEl.textContent = "";
        }, 700);
      }
    }
  },
  lockPinDel: () => {
    _lockPinBuf = _lockPinBuf.slice(0, -1);
    _updatePinDots("lpd", _lockPinBuf.length);
  },
  pinSetupKey: async (el) => {
    if (_setupPinBuf.length >= 4) return;
    _setupPinBuf += el.dataset.k;
    _updatePinDots("spd", _setupPinBuf.length);
    if (_setupPinBuf.length === 4) {
      if (_setupStep === 1) {
        _setupFirst = _setupPinBuf;
        _setupPinBuf = "";
        _setupStep = 2;
        _updatePinDots("spd", 0);
        const sub = document.getElementById("pinSetupSubtitle");
        if (sub) sub.textContent = t("pin-setup-step2");
      } else {
        if (_setupPinBuf === _setupFirst) {
          await setPIN(_setupPinBuf);
          state.settings.biometricLock = true;
          saveData();
          document.getElementById("biometricToggle")?.classList.add("on");
          document.getElementById("pinSetupModal")?.classList.remove("show");
          _setupPinBuf = _setupFirst = "";
          _setupStep = 1;
          showToast(t("pin-set-ok"));
        } else {
          const errEl = document.getElementById("setupPinError");
          if (errEl) errEl.textContent = t("pin-mismatch");
          setTimeout(() => {
            _setupPinBuf = _setupFirst = "";
            _setupStep = 1;
            _updatePinDots("spd", 0);
            if (errEl) errEl.textContent = "";
            const sub = document.getElementById("pinSetupSubtitle");
            if (sub) sub.textContent = t("pin-setup-step1");
          }, 900);
        }
      }
    }
  },
  pinSetupDel: () => {
    _setupPinBuf = _setupPinBuf.slice(0, -1);
    _updatePinDots("spd", _setupPinBuf.length);
  },
  cancelPINSetup: () => {
    _setupPinBuf = _setupFirst = "";
    _setupStep = 1;
    document.getElementById("pinSetupModal")?.classList.remove("show");
    if (!isPINSet()) {
      state.settings.biometricLock = false;
      saveData();
      document.getElementById("biometricToggle")?.classList.remove("on");
    }
  },
  checkDrugName: () => checkDrugName(),
  // generic dismissals
  stop: (el, ev) => ev.stopPropagation(),
  dismissDisclaimer: (el, ev) => {
    if (ev.target === el) closeDisclaimerModal();
  },
  dismissExport: (el, ev) => {
    if (ev.target === el) closeExportModal();
  },
  dismissSelf: (el, ev) => {
    if (ev.target === el) el.classList.remove("show");
  },
};

function dispatchByAttr(attr, ev) {
  const el = ev.target.closest("[" + attr + "]");
  if (!el) return;
  const key = attr.slice("data-".length);
  const name = el.dataset[key];
  const handler = ACTIONS[name];
  if (handler) handler(el, ev);
}

document.addEventListener("click", (ev) => dispatchByAttr("data-action", ev));
document.addEventListener("change", (ev) => dispatchByAttr("data-change", ev));
document.addEventListener("input", (ev) => dispatchByAttr("data-input", ev));

export function bootApp() {
  init();
}
