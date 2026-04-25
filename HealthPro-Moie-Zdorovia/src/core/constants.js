// Centralised constants used across the app.
// Single source of truth for storage keys, version strings,
// numeric limits and other "magic" values that were previously
// duplicated across feature modules.

export { STORAGE_KEYS } from './storage.js';

// ─── App / disclaimer versioning ───
export const APP_VERSION = '4.0';
export const APP_BUILD_LABEL = `HealthPro v${APP_VERSION} PWA`;
export const DISCLAIMER_VERSION = '1.0';
export const DISCLAIMER_HISTORY_KEY = 'healthpro_disclaimer_history';
export const LEGACY_DISCLAIMER_KEY_PREFIX = 'healthpro_disclaimer_v';

// ─── Steps feature ───
export const DEFAULT_STEP_GOAL = 10000;
export const STEP_GOAL_MIN = 1000;
export const STEP_GOAL_MAX = 50000;
export const STEP_ACCEL_THRESHOLD = 1.5;

// ─── Emergency / regional ───
export const EMERGENCY_PHONE_UA = '103';

// ─── Languages ───
export const SUPPORTED_LANGS = ['uk', 'ru'];
export const DEFAULT_LANG = 'uk';

// ─── Themes ───
export const THEMES = { DARK: 'dark', LIGHT: 'light' };
export const DEFAULT_THEME = THEMES.DARK;

// ─── Misc UI ───
export const TOAST_DEFAULT_MS = 2200;
