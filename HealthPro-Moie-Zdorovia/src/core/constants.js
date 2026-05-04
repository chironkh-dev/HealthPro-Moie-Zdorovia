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
// Legacy threshold used when only accelerationIncludingGravity is available.
// Walking peak magnitude ≈11–13 m/s² above the 9.81 gravity baseline.
export const STEP_ACCEL_THRESHOLD = 12;
export const STEP_MIN_INTERVAL_MS = 250;          // debounce: max ~4 steps/sec

// Improved algorithm — uses linear acceleration (e.acceleration, no gravity).
// Walking peaks ≈ 2–4 m/s². Threshold chosen to filter micro-vibrations.
export const STEP_LINEAR_THRESHOLD = 2.0;         // m/s² for pure linear accel
export const STEP_GRAVITY_FILTER_ALPHA = 0.8;     // LP filter coefficient (gravity removal)

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
