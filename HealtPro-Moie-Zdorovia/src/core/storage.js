const STORAGE_KEYS = {
  measurements: 'hp_measurements',
  pills: 'hp_pills',
  pillsTaken: 'hp_pills_taken',
  settings: 'hp_settings',
  theme: 'hp_theme',
  lang: 'hp_lang',
};

export function createStorage() {
  return {
    async get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    async set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    async remove(key) {
      localStorage.removeItem(key);
    },
    keys: STORAGE_KEYS,
  };
}
