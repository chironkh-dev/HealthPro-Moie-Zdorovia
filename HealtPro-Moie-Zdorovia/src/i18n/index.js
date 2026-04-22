import './ui.uk.js';
import './ui.ru.js';
import './welcome-disclaimer.js';
import './pdf.js';

export function getDictionaries() {
  return {
    uk: window.T_UK || {},
    ru: window.T_RU || {},
  };
}

export function getWelcomeTranslations() {
  return window.WELCOME_T || { uk: {}, ru: {} };
}

export function getDisclaimerTranslations() {
  return window.DISCLAIMER_T || { uk: {}, ru: {} };
}

export function getPdfLabels() {
  return window.PDF_LABELS || { uk: {}, ru: {} };
}
