// SQLite adapter for native Capacitor builds.
//
// On web (PWA / Replit preview / vitest) this module is a no-op:
// isReady() returns false → feature code falls back to IndexedDB + in-memory arrays.
//
// ── Schema v2 (DB_VERSION = 2) ───────────────────────────────────────────────
//
//   measurements  — кожен вимір тиску/пульсу окремим рядком
//   medications   — картки ліків
//   med_taken     — журнал прийому ліків (med_id × date)
//   steps_log     — денні підсумки кроків
//   kv_state      — settings / theme / lang (JSON-blobs)
//
// Schema v1→v2 migration: JSON-масиви з kv_state розкладаються по таблицях.
// ─────────────────────────────────────────────────────────────────────────────

import { isNative } from './platform.js';

const DB_NAME    = 'HealthProDB';
const DB_VERSION = 2;

// ── SQLCipher: генерація/отримання ключа через Preferences (v5.1) ─────────────
// На Android — Keystore під капотом. На вебі — no-op (isNative() = false).
async function getOrCreateKey() {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'db_enc_key' });
    if (value) return value;
    const key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    await Preferences.set({ key: 'db_enc_key', value: key });
    console.log('[HealthProDB/SQLite] Encryption key created');
    return key;
  } catch (e) {
    console.warn('[HealthProDB/SQLite] getOrCreateKey failed, using fallback:', e?.message);
    return 'hp_fallback_enc_key_v1';
  }
}

let pluginPromise = null;
let dbHandle      = null;
let initialized   = false;
let initError     = null;

function getPlugin() {
  if (!isNative()) return null;
  try {
    const reg = window.Capacitor && window.Capacitor.Plugins;
    return (reg && reg.CapacitorSQLite) || null;
  } catch { return null; }
}

async function getConnection() {
  if (!isNative()) return null;
  if (pluginPromise) return pluginPromise;
  pluginPromise = (async () => {
    try {
      const mod = await import('@capacitor-community/sqlite');
      const sqliteConnection = new mod.SQLiteConnection(mod.CapacitorSQLite);
      return { mod, sqliteConnection };
    } catch (e) {
      initError = e;
      return null;
    }
  })();
  return pluginPromise;
}

export function available() { return !!getPlugin(); }
export function isReady()   { return !!dbHandle; }

// ── Схема ────────────────────────────────────────────────────────────────────

const DDL = `
  CREATE TABLE IF NOT EXISTS kv_state (
    k          TEXT    PRIMARY KEY,
    v          TEXT    NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS measurements (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    sys        INTEGER NOT NULL,
    dia        INTEGER NOT NULL,
    pulse      INTEGER,
    note       TEXT    DEFAULT '',
    ts         INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS medications (
    id         TEXT    PRIMARY KEY,
    name       TEXT    NOT NULL,
    dose       TEXT    DEFAULT '',
    time       TEXT    DEFAULT '08:00',
    days       TEXT    DEFAULT 'daily',
    date       TEXT    DEFAULT '',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS med_taken (
    med_id     TEXT    NOT NULL,
    date       TEXT    NOT NULL,
    taken      INTEGER DEFAULT 0,
    PRIMARY KEY (med_id, date)
  );

  CREATE TABLE IF NOT EXISTS steps_log (
    date       TEXT    PRIMARY KEY,
    steps      INTEGER DEFAULT 0,
    goal       INTEGER DEFAULT 10000,
    updated_at INTEGER NOT NULL
  );
`;

// ── Ініціалізація ─────────────────────────────────────────────────────────────

export async function init() {
  if (initialized) return !!dbHandle;
  if (!isNative()) { initialized = true; return false; }

  try {
    const conn = await getConnection();
    if (!conn) throw initError || new Error('SQLite connection module unavailable');
    const { sqliteConnection } = conn;

    // v5.1 — SQLCipher: отримуємо ключ і встановлюємо перед з'єднанням
    const encKey = await getOrCreateKey();
    try {
      await sqliteConnection.setEncryptionSecret(encKey);
    } catch { /* плагін може не підтримувати setEncryptionSecret на вебі */ }

    let isConn = false;
    try {
      const r = await sqliteConnection.isConnection(DB_NAME, false);
      isConn = !!(r && r.result);
    } catch { isConn = false; }

    if (isConn) {
      dbHandle = await sqliteConnection.retrieveConnection(DB_NAME, true);
    } else {
      dbHandle = await sqliteConnection.createConnection(
        DB_NAME, true, 'secret', DB_VERSION, false,
      );
    }

    await dbHandle.open();
    // Виконуємо DDL по одному (деякі драйвери не підтримують multiple statements)
    for (const stmt of DDL.split(';').map(s => s.trim()).filter(Boolean)) {
      await dbHandle.execute(stmt + ';');
    }

    initialized = true;
    console.log('[HealthProDB/SQLite] v2 schema ready');
    return true;
  } catch (e) {
    initError = e;
    initialized = true;
    dbHandle = null;
    console.warn('[HealthProDB/SQLite] init failed, fallback to IDB:', e?.message || e);
    return false;
  }
}

// ── KV operations (settings / theme / lang) ──────────────────────────────────

export async function get(key) {
  if (!dbHandle) return undefined;
  try {
    const r = await dbHandle.query('SELECT v FROM kv_state WHERE k = ? LIMIT 1;', [key]);
    const row = r?.values?.[0];
    if (!row) return undefined;
    try { return JSON.parse(row.v); } catch { return undefined; }
  } catch (e) {
    console.warn('[SQLite] get failed:', key, e?.message || e);
    return undefined;
  }
}

export async function set(key, value) {
  if (!dbHandle) return false;
  try {
    const now = Date.now();
    await dbHandle.run(
      `INSERT INTO kv_state (k, v, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at;`,
      [key, JSON.stringify(value), now],
    );
    return true;
  } catch (e) {
    console.warn('[SQLite] set failed:', key, e?.message || e);
    return false;
  }
}

export async function getAll(keys) {
  const out = {};
  if (!dbHandle) return out;
  await Promise.all(keys.map(async (k) => {
    const v = await get(k);
    if (v !== undefined) out[k] = v;
  }));
  return out;
}

// ── measurements ─────────────────────────────────────────────────────────────

export async function insertMeasurement({ sys, dia, pulse = null, note = '', time }) {
  if (!dbHandle) return null;
  const ts = time ? new Date(time).getTime() : Date.now();
  const now = Date.now();
  try {
    const r = await dbHandle.run(
      `INSERT INTO measurements (sys, dia, pulse, note, ts, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [sys, dia, pulse ?? null, note ?? '', ts, now],
    );
    return r?.changes?.lastId ?? null;
  } catch (e) {
    console.warn('[SQLite] insertMeasurement failed:', e?.message || e);
    return null;
  }
}

export async function queryMeasurements({ from = 0, to = Date.now(), limit = 500, order = 'DESC' } = {}) {
  if (!dbHandle) return [];
  try {
    const r = await dbHandle.query(
      `SELECT id, sys, dia, pulse, note, ts FROM measurements
       WHERE ts BETWEEN ? AND ? ORDER BY ts ${order} LIMIT ?;`,
      [from, to, limit],
    );
    return (r?.values || []).map(row => ({
      _sqlId: row.id,
      sys:    row.sys,
      dia:    row.dia,
      pulse:  row.pulse ?? null,
      note:   row.note ?? '',
      time:   new Date(row.ts).toISOString(),
    }));
  } catch (e) {
    console.warn('[SQLite] queryMeasurements failed:', e?.message || e);
    return [];
  }
}

export async function deleteMeasurement(sqlId) {
  if (!dbHandle) return false;
  try {
    await dbHandle.run('DELETE FROM measurements WHERE id = ?;', [sqlId]);
    return true;
  } catch (e) {
    console.warn('[SQLite] deleteMeasurement failed:', e?.message || e);
    return false;
  }
}

export async function countMeasurements() {
  if (!dbHandle) return 0;
  try {
    const r = await dbHandle.query('SELECT COUNT(*) as cnt FROM measurements;');
    return r?.values?.[0]?.cnt ?? 0;
  } catch { return 0; }
}

// ── medications ──────────────────────────────────────────────────────────────

export async function upsertMedication({ id, name, dose = '', time = '08:00', days = 'daily', date = '' }) {
  if (!dbHandle) return false;
  const now = Date.now();
  try {
    await dbHandle.run(
      `INSERT INTO medications (id, name, dose, time, days, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, dose=excluded.dose, time=excluded.time,
         days=excluded.days, date=excluded.date;`,
      [String(id), name, dose, time, days, date ?? '', now],
    );
    return true;
  } catch (e) {
    console.warn('[SQLite] upsertMedication failed:', e?.message || e);
    return false;
  }
}

export async function deleteMedication(id) {
  if (!dbHandle) return false;
  try {
    await dbHandle.run('DELETE FROM medications WHERE id = ?;', [String(id)]);
    await dbHandle.run('DELETE FROM med_taken WHERE med_id = ?;', [String(id)]);
    return true;
  } catch (e) {
    console.warn('[SQLite] deleteMedication failed:', e?.message || e);
    return false;
  }
}

export async function queryMedications() {
  if (!dbHandle) return [];
  try {
    const r = await dbHandle.query('SELECT * FROM medications ORDER BY created_at ASC;');
    return r?.values || [];
  } catch (e) {
    console.warn('[SQLite] queryMedications failed:', e?.message || e);
    return [];
  }
}

// ── med_taken ────────────────────────────────────────────────────────────────

export async function setMedTaken(medId, date, taken) {
  if (!dbHandle) return false;
  try {
    await dbHandle.run(
      `INSERT INTO med_taken (med_id, date, taken) VALUES (?, ?, ?)
       ON CONFLICT(med_id, date) DO UPDATE SET taken = excluded.taken;`,
      [String(medId), date, taken ? 1 : 0],
    );
    return true;
  } catch (e) {
    console.warn('[SQLite] setMedTaken failed:', e?.message || e);
    return false;
  }
}

export async function queryMedTaken({ from = '', to = '' } = {}) {
  if (!dbHandle) return [];
  try {
    let sql = 'SELECT med_id, date, taken FROM med_taken';
    const params = [];
    if (from && to) {
      sql += ' WHERE date BETWEEN ? AND ?';
      params.push(from, to);
    }
    sql += ' ORDER BY date DESC;';
    const r = await dbHandle.query(sql, params);
    return r?.values || [];
  } catch (e) {
    console.warn('[SQLite] queryMedTaken failed:', e?.message || e);
    return [];
  }
}

// ── steps_log ────────────────────────────────────────────────────────────────

export async function upsertStepLog({ date, steps, goal = 10000 }) {
  if (!dbHandle) return false;
  const now = Date.now();
  try {
    await dbHandle.run(
      `INSERT INTO steps_log (date, steps, goal, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET steps=excluded.steps, goal=excluded.goal, updated_at=excluded.updated_at;`,
      [date, steps, goal, now],
    );
    return true;
  } catch (e) {
    console.warn('[SQLite] upsertStepLog failed:', e?.message || e);
    return false;
  }
}

export async function queryStepLog({ from = '', to = '', limit = 90 } = {}) {
  if (!dbHandle) return [];
  try {
    let sql = 'SELECT date, steps, goal FROM steps_log';
    const params = [];
    if (from && to) {
      sql += ' WHERE date BETWEEN ? AND ?';
      params.push(from, to);
    }
    sql += ` ORDER BY date DESC LIMIT ${limit};`;
    const r = await dbHandle.query(sql, params);
    return r?.values || [];
  } catch (e) {
    console.warn('[SQLite] queryStepLog failed:', e?.message || e);
    return [];
  }
}

// ── Очистка всіх реляційних таблиць (використовується при відновленні бекапу) ──

export async function clearAll() {
  if (!dbHandle) return false;
  try {
    for (const tbl of ['measurements', 'medications', 'med_taken', 'steps_log']) {
      await dbHandle.execute(`DELETE FROM ${tbl};`);
    }
    return true;
  } catch (e) {
    console.warn('[SQLite] clearAll failed:', e?.message || e);
    return false;
  }
}

// ── Міграція v1 → v2: JSON-масиви з kv_state → реляційні таблиці ─────────────

export async function migrateV1toV2() {
  if (!dbHandle) return;
  try {
    // Перевіряємо чи вже мігровано (є рядки в measurements або kv_state порожній)
    const cnt = await countMeasurements();
    if (cnt > 0) return; // вже є дані в реляційних таблицях

    // Тягнемо JSON-масиви з kv_state
    const measJson = await get('hp_measurements');
    const pillsJson = await get('hp_pills');
    const takenJson = await get('hp_pills_taken');

    // Переносимо виміри
    if (Array.isArray(measJson) && measJson.length > 0) {
      // Вставляємо від найстарішого до найновішого
      const sorted = [...measJson].reverse();
      for (const m of sorted) {
        await insertMeasurement({
          sys: m.sys, dia: m.dia, pulse: m.pulse ?? null,
          note: m.note ?? '', time: m.time,
        });
      }
      console.log(`[SQLite] v1→v2: migrated ${sorted.length} measurements`);
    }

    // Переносимо картки ліків
    if (Array.isArray(pillsJson) && pillsJson.length > 0) {
      for (const p of pillsJson) {
        await upsertMedication({
          id: String(p.id), name: p.name, dose: p.dose ?? '',
          time: p.time ?? '08:00', days: p.days ?? 'daily', date: p.date ?? '',
        });
      }
      console.log(`[SQLite] v1→v2: migrated ${pillsJson.length} medications`);
    }

    // Переносимо журнал прийому ліків
    if (takenJson && typeof takenJson === 'object') {
      for (const [dateKey, medMap] of Object.entries(takenJson)) {
        if (typeof medMap !== 'object') continue;
        for (const [medId, taken] of Object.entries(medMap)) {
          await setMedTaken(medId, dateKey, !!taken);
        }
      }
      console.log('[SQLite] v1→v2: migrated med_taken records');
    }
  } catch (e) {
    console.warn('[SQLite] v1→v2 migration error:', e?.message || e);
  }
}
