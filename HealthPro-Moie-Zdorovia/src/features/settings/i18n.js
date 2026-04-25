// Backward-compatible re-export shim.
// The real i18n implementation now lives in src/i18n/index.js.
// Existing imports like
//   import { setLang } from '../../features/settings/index.js';
// keep working without changes.

export {
  T,
  T_UK,
  T_RU,
  WELCOME_T,
  DISCLAIMER_T,
  registerReRender,
  renderDisclaimerBody,
  renderWelcomeText,
  setLang,
  t,
} from '../../i18n/index.js';
