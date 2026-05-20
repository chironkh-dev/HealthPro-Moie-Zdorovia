// Encrypted .hpb backup — AES-256-GCM via SubtleCrypto (no external libs).
// Schema 2: reads directly from SQLite relational tables (not state mirror).
// biometricLock is deliberately excluded — PIN not transferable across devices.

import * as sql from '../../core/sqlite.js';
import { state, showToast, today, saveData, persistTheme, persistLang } from '../../core/state.js';
import { defaultSettings } from '../../core/storage.js';
import { download as platformDownload } from '../../core/platform.js';
import { t } from '../../i18n/index.js';
import { APP_BUILD_FULL } from '../../core/constants.js';
import { formatDate } from '../../core/utils.js';

const FORMAT    = 'healthpro-backup';
const BK_VER    = '2.0';
const SCHEMA    = 2;
const PBKDF2_IT = 100_000;

// ── Crypto helpers ────────────────────────────────────────────────────────────

async function deriveKey(password, salt) {
  const raw = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password),
    'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_IT, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt'],
  );
}

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const b64     = arr => btoa(String.fromCharCode(...arr));
const fromB64 = s   => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function encryptAES(plaintext, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(password, salt);
  const buf  = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext),
  );
  return { salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(buf)) };
}

async function decryptAES({ salt, iv, data }, password) {
  const key = await deriveKey(password, fromB64(salt));
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(data),
  );
  return new TextDecoder().decode(buf);
}

// ── Data collection ───────────────────────────────────────────────────────────

async function collectData() {
  const settings = { ...defaultSettings, ...state.settings };
  delete settings.biometricLock;

  let measurements, medications, med_taken, steps_log;

  if (sql.isReady()) {
    [measurements, medications, med_taken, steps_log] = await Promise.all([
      sql.queryMeasurements({ from: 0, to: Date.now(), limit: 100_000, order: 'ASC' }),
      sql.queryMedications(),
      sql.queryMedTaken(),
      sql.queryStepLog({ limit: 9999 }),
    ]);
  } else {
    measurements = state.measurements || [];
    medications  = state.pills        || [];
    med_taken    = [];
    for (const [date, medMap] of Object.entries(state.pillsTaken || {})) {
      if (typeof medMap !== 'object') continue;
      for (const [medId, taken] of Object.entries(medMap)) {
        med_taken.push({ med_id: medId, date, taken: taken ? 1 : 0 });
      }
    }
    // Collect steps from localStorage mirror (web / no SQLite)
    steps_log = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('stepCount-')) {
          const date  = key.slice('stepCount-'.length);
          const steps = parseInt(localStorage.getItem(key), 10);
          if (!isNaN(steps) && steps > 0) {
            steps_log.push({ date, steps, goal: state.settings?.stepGoal || 10000 });
          }
        }
      }
    } catch {}
  }

  return {
    measurements, medications, med_taken, steps_log, settings,
    theme: state.isDark ? 'dark' : 'light',
    lang:  state.lang   || 'uk',
  };
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

// password === null → save without encryption (plain JSON wrapper)
export async function exportBackup(password) {
  const data     = await collectData();
  const dataJson = JSON.stringify(data);
  const checksum = await sha256hex(dataJson);

  let pkg;
  if (password) {
    const encrypted = await encryptAES(dataJson, password);
    pkg = {
      format:            FORMAT,
      hp_backup_version: BK_VER,
      app_version:       APP_BUILD_FULL || '5.3.0',
      schema:            SCHEMA,
      created_at:        new Date().toISOString(),
      checksum,
      encrypted,
    };
  } else {
    pkg = {
      format:            FORMAT,
      hp_backup_version: BK_VER,
      app_version:       APP_BUILD_FULL || '5.3.0',
      schema:            SCHEMA,
      created_at:        new Date().toISOString(),
      checksum,
      encrypted:         false,
      data:              dataJson,
    };
  }

  const blob = new Blob([JSON.stringify(pkg)], { type: 'application/octet-stream' });
  platformDownload('healthpro-backup-' + today() + '.hpb', blob, 'application/octet-stream');
  showToast(t('bk-toast-saved'));
  state.settings.lastBackupDate = today();
  saveData();
}

// ── DECRYPT & VERIFY ──────────────────────────────────────────────────────────

export async function openBackupFile(fileContent, password) {
  const pkg = JSON.parse(fileContent);

  // Legacy v4.0 unencrypted JSON
  if (pkg.version === '4.0' || (!pkg.format && (pkg.measurements || pkg.pills))) {
    return { isLegacy: true, data: pkg, meta: null };
  }

  if (pkg.format !== FORMAT) throw new Error('invalid_format');

  // No-password backup (encrypted === false)
  if (pkg.encrypted === false) {
    const checksum = await sha256hex(pkg.data);
    if (checksum !== pkg.checksum) throw new Error('checksum_failed');
    return { isLegacy: false, data: JSON.parse(pkg.data), meta: pkg };
  }

  if (!pkg.encrypted) throw new Error('invalid_format');

  let dataJson;
  try   { dataJson = await decryptAES(pkg.encrypted, password); }
  catch { throw new Error('wrong_password'); }

  const checksum = await sha256hex(dataJson);
  if (checksum !== pkg.checksum) throw new Error('checksum_failed');

  return { isLegacy: false, data: JSON.parse(dataJson), meta: pkg };
}

export function getBackupStats(opened) {
  const { isLegacy, data, meta } = opened;
  return {
    measurements: (data.measurements || []).length,
    medications:  isLegacy ? (data.pills || []).length : (data.medications || []).length,
    steps:        isLegacy ? 0 : (data.steps_log || []).length,
    date: meta?.created_at
      ? formatDate(meta.created_at)
      : (data.exportDate ? formatDate(data.exportDate) : '—'),
  };
}

// ── RESTORE ───────────────────────────────────────────────────────────────────

export async function restoreBackup(opened) {
  // Ensure SQLite is initialized (important on fresh install or race condition)
  if (!sql.isReady()) {
    await sql.init();
  }

  const { isLegacy, data } = opened;
  let measurements, medications, med_taken, steps_log, settings, theme, lang;

  if (isLegacy) {
    measurements = data.measurements || [];
    medications  = data.pills        || [];
    med_taken    = [];
    for (const [date, medMap] of Object.entries(data.pillsTaken || {})) {
      if (typeof medMap !== 'object') continue;
      for (const [medId, taken] of Object.entries(medMap)) {
        med_taken.push({ med_id: medId, date, taken: taken ? 1 : 0 });
      }
    }
    steps_log = [];
    settings  = { ...defaultSettings, ...(data.settings || {}) };
    theme     = 'dark';
    lang      = state.lang || 'uk';
  } else {
    measurements = data.measurements || [];
    medications  = data.medications  || [];
    med_taken    = data.med_taken    || [];
    steps_log    = data.steps_log    || [];
    settings     = { ...defaultSettings, ...(data.settings || {}) };
    theme        = data.theme || 'dark';
    lang         = data.lang  || 'uk';
  }

  // Never restore biometric/PIN lock — user must enable it manually
  delete settings.biometricLock;
  settings.biometricLock = false;
  // Never restore stepsEnabled — permissions and foreground service
  // must be granted manually on the new device/install
  delete settings.stepsEnabled;
  settings.stepsEnabled = false;

  // Defensive: ensure state arrays are initialized (fresh install safety)
  if (!Array.isArray(state.measurements)) state.measurements = [];
  if (!Array.isArray(state.pills))        state.pills        = [];
  if (!state.pillsTaken || typeof state.pillsTaken !== 'object') state.pillsTaken = {};

  // Write to SQLite relational tables (native only)
  if (sql.isReady()) {
    await sql.clearAll();
    for (const m of measurements) {
      await sql.insertMeasurement({
        sys: m.sys, dia: m.dia, pulse: m.pulse ?? null,
        note: m.note ?? '', time: m.time,
      });
    }
    for (const p of medications) {
      await sql.upsertMedication({
        id: String(p.id), name: p.name, dose: p.dose ?? '',
        time: p.time ?? '08:00', days: p.days ?? 'daily', date: p.date ?? '',
      });
    }
    for (const r of med_taken) {
      await sql.setMedTaken(r.med_id, r.date, !!r.taken);
    }
    for (const r of steps_log) {
      try {
        await sql.upsertStepLog({ date: r.date, steps: r.steps, goal: r.goal || 10000 });
      } catch (e) {
        console.warn('[backup] upsertStepLog failed:', e?.message || e);
      }
    }
  }

  // Update in-memory state
  state.measurements.length = 0;
  state.measurements.push(...measurements);
  state.pills.length = 0;
  state.pills.push(...medications);
  Object.keys(state.pillsTaken).forEach(k => delete state.pillsTaken[k]);
  for (const r of med_taken) {
    if (!state.pillsTaken[r.date]) state.pillsTaken[r.date] = {};
    state.pillsTaken[r.date][r.med_id] = !!r.taken;
  }

  // Steps localStorage fallback (web / history cache)
  for (const r of steps_log) {
    try { localStorage.setItem('stepCount-' + r.date, String(r.steps)); } catch {}
  }

  Object.assign(state.settings, settings);
  saveData();
  persistTheme(theme === 'dark');
  persistLang(lang);
}
