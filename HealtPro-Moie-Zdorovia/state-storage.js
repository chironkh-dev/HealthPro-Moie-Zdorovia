(function initHealthProStateStorage(global) {
  const STORAGE_KEYS = global.__HP_STORAGE_KEYS || {
    measurements: 'measurements',
    pills: 'pills',
    pillsTaken: 'pillsTaken',
    settings: 'settings',
    theme: 'theme',
    lang: 'lang',
  };

  const defaultSettings = {
    name: '',
    age: '',
    height: '',
    weight: '',
    gender: '',
    phone: '',
    email: '',
    viber: '',
    telegram: '',
    whatsapp: '',
    normalSys: '',
    normalDia: '',
    normalPulse: '',
    notif: false,
    measureReminder: false,
    emergencyPhone: '',
    emergencyName: '',
    morningTime: '08:00',
    eveningTime: '20:00',
    stepGoal: 10000,
    stepsEnabled: false,
  };

  const DB = {
    get(key, fallbackValue) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallbackValue;
      } catch {
        return fallbackValue;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Ignore quota/privacy write errors to preserve UX.
      }
    },
  };

  function loadState() {
    return {
      measurements: DB.get(STORAGE_KEYS.measurements, DB.get('measurements', [])),
      pills: DB.get(STORAGE_KEYS.pills, DB.get('pills', [])),
      pillsTaken: DB.get(STORAGE_KEYS.pillsTaken, DB.get('pillsTaken', {})),
      settings: DB.get(
        STORAGE_KEYS.settings,
        DB.get('settings', { ...defaultSettings }),
      ),
      isDark: DB.get(STORAGE_KEYS.theme, DB.get('theme', 'dark')) === 'dark',
    };
  }

  function saveState(params) {
    DB.set(STORAGE_KEYS.measurements, params.measurements);
    DB.set(STORAGE_KEYS.pills, params.pills);
    DB.set(STORAGE_KEYS.pillsTaken, params.pillsTaken);
    DB.set(STORAGE_KEYS.settings, params.settings);
  }

  function saveTheme(isDark) {
    DB.set(STORAGE_KEYS.theme, isDark ? 'dark' : 'light');
  }

  global.HealthProStateStorage = {
    STORAGE_KEYS,
    DB,
    defaultSettings,
    loadState,
    saveState,
    saveTheme,
  };
})(window);
