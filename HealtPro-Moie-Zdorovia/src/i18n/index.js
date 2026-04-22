import './ui.uk.js';
import './ui.ru.js';

export function getDictionaries() {
  return {
    uk: window.T_UK || {},
    ru: window.T_RU || {},
  };
}
