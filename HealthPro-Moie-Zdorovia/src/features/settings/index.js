// Settings feature aggregator.
export { applyTheme, toggleTheme } from './theme.js';
export { setLang, t, renderDisclaimerBody, renderWelcomeText, registerReRender } from './i18n.js';
export { saveProfile, updateHeader, loadProfileFields } from './profile.js';
export { toggleNotifications, toggleMeasureReminder, saveReminderTimes, scheduleNotifications } from './notifications.js';
export { clearAllData } from './data.js';
export {
  DISCLAIMER_VERSION,
  getDisclaimerHistory,
  saveDisclaimerHistory,
  isCurrentDisclaimerAccepted,
  renderDisclaimerStatus,
  openDisclaimerModal,
  closeDisclaimerModal,
  acceptDisclaimer,
  checkDisclaimer,
} from './disclaimer.js';
export {
  maybeShowNotifPermModal,
  acceptNotifPerm,
  declineNotifPerm,
} from './notif-perm.js';
export {
  sendEmailReminder,
  sendSmsReminder,
  renderEmailSmsTargets,
} from './email-sms.js';
