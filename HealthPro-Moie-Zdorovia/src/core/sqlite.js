// SQLite key/value adapter for native Capacitor builds.
// On web (PWA / Replit preview / vitest) this module is a no-op:
// its `available()` returns false and feature code falls back to IndexedDB.
//
// Schema (single KV table for now — minimally invasive migration from IDB):
//   CREATE TABLE kv_state (
//     k          TEXT PRIMARY KEY,
//     v          TEXT NOT NULL,         -- JSON-stringified value
//     updated_at INTEGER NOT NULL       -- ms since epoch
//   );
//
// Why a KV table instead of relational tables?
// 1. Zero schema churn for feature modules (they keep working with arrays/objects).
// 2. Migration from IndexedDB is a 1:1 copy of (key, JSON.stringify(value)).
// 3. Future relational migration (e.g. measurements as rows) can be a v2 upgrade.
//
// Persistence guarantees on Android (vs IndexedDB inside WebView):
// - Stored as a real file under the app's private storage
//   (/data/data/<pkg>/databases/HealthProDB.db).
// - Survives WebView cache eviction, "Clear cache", and OS storage pressure.
// - Lost only on "Clear data" / app uninstall — same level as native apps.

import { isNative } from './platform.js';

const DB_NAME = 'HealthProDB';
const TABLE = 'kv_state';

let pluginPromise = null;
let dbHandle = null;
let initialized = false;
let initError = null;

function getPlugin() {
  if (!isNative()) return null;
  try {
    const reg = window.Capacitor && window.Capacitor.Plugins;
    return (reg && reg.CapacitorSQLite) || null;
  } catch { return null; }
}

// Lazily import the JS connection wrapper. The wrapper module is bundled
// even on web (the import below is static-resolvable), but we only call its
// methods when running natively.
async function getConnection() {
  if (!isNative()) return null;
  if (pluginPromise) return pluginPromise;
  pluginPromise = (async () => {
    try {
      const mod = await import('@capacitor-community/sqlite');
      // SQLiteConnection wraps the underlying Capacitor plugin and provides
      // createConnection / retrieveConnection helpers used below.
      const sqliteConnection = new mod.SQLiteConnection(mod.CapacitorSQLite);
      return { mod, sqliteConnection };
    } catch (e) {
      initError = e;
      return null;
    }
  })();
  return pluginPromise;
}

export function available() {
  return !!getPlugin();
}

export async function init() {
  if (initialized) return !!dbHandle;
  if (!isNative()) { initialized = true; return false; }

  try {
    const conn = await getConnection();
    if (!conn) throw initError || new Error('SQLite connection module unavailable');
    const { sqliteConnection } = conn;

    // Re-use an existing connection if one was opened earlier in this session.
    let isConn = false;
    try {
      const r = await sqliteConnection.isConnection(DB_NAME, false);
      isConn = !!(r && r.result);
    } catch { isConn = false; }

    if (isConn) {
      dbHandle = await sqliteConnection.retrieveConnection(DB_NAME, false);
    } else {
      dbHandle = await sqliteConnection.createConnection(
        DB_NAME, false, 'no-encryption', 1, false,
      );
    }

    await dbHandle.open();
    await dbHandle.execute(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        k          TEXT PRIMARY KEY,
        v          TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    initialized = true;
    return true;
  } catch (e) {
    initError = e;
    initialized = true;
    dbHandle = null;
    console.warn('[HealthProDB/SQLite] init failed, falling back to IDB:', e?.message || e);
    return false;
  }
}

export async function get(key) {
  if (!dbHandle) return undefined;
  try {
    const r = await dbHandle.query(`SELECT v FROM ${TABLE} WHERE k = ? LIMIT 1;`, [key]);
    const row = r && r.values && r.values[0];
    if (!row) return undefined;
    try { return JSON.parse(row.v); } catch { return undefined; }
  } catch (e) {
    console.warn('[HealthProDB/SQLite] get failed:', key, e?.message || e);
    return undefined;
  }
}

export async function set(key, value) {
  if (!dbHandle) return false;
  try {
    const json = JSON.stringify(value);
    const now = Date.now();
    await dbHandle.run(
      `INSERT INTO ${TABLE} (k, v, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at;`,
      [key, json, now],
    );
    return true;
  } catch (e) {
    console.warn('[HealthProDB/SQLite] set failed:', key, e?.message || e);
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

export function isReady() { return !!dbHandle; }
