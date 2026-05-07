// HealthPro — уніфікований API бази даних
//
// Єдина точка входу для всіх запитів до даних у feature-модулях.
// На Android (native): використовує SQLite-таблиці → повноцінні SQL-запити.
// На вебі / PWA:       фільтрує in-memory масиви через posилання на state.
//
// ВАЖЛИВО: цей модуль НЕ імпортує state.js напряму (уникаємо циклічної
// залежності: state → storage → db → state).
// Посилання на стан реєструється через _setStateRef() з app.js після init.
//
// Використання:
//   import * as db from '../../core/db.js';
//   const rows = await db.queryMeasurements({ days: 7 });
//   const trend = await db.calcHealthIndexTrend(30);

import * as sql from './sqlite.js';

// ── Lazy state reference (реєструється з app.js) ─────────────────────────────
let _state = null;
export function _setStateRef(stateObj) { _state = stateObj; }

// ── Дата-хелпери ──────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function dateToMs(dateStr) {
  return new Date(dateStr + 'T00:00:00').getTime();
}

function isoToDate(iso) {
  return iso ? iso.split('T')[0] : '';
}

// ── ВИМІРЮВАННЯ ТИСКУ / ПУЛЬСУ ────────────────────────────────────────────────

/**
 * Повертає масив вимірювань за вказаний діапазон.
 * @param {object} opts
 * @param {number}  [opts.days=30]
 * @param {string}  [opts.from]   — YYYY-MM-DD
 * @param {string}  [opts.to]     — YYYY-MM-DD
 * @param {number}  [opts.limit=500]
 * @param {'ASC'|'DESC'} [opts.order='DESC']
 */
export async function queryMeasurements({ days = 30, from, to, limit = 500, order = 'DESC' } = {}) {
  const toDate   = to   || new Date().toISOString().split('T')[0];
  const fromDate = from || daysAgo(days);
  const fromMs   = dateToMs(fromDate);
  const toMs     = dateToMs(toDate) + 86_399_999;

  if (sql.isReady()) {
    return sql.queryMeasurements({ from: fromMs, to: toMs, limit, order });
  }

  // Web fallback: фільтруємо in-memory масив
  const arr = _state?.measurements || [];
  let filtered = arr.filter((m) => {
    const t = m.time ? new Date(m.time).getTime() : 0;
    return t >= fromMs && t <= toMs;
  });
  if (order === 'ASC') filtered = [...filtered].reverse();
  return filtered.slice(0, limit);
}

/** Всі виміри (для CSV/PDF-експорту) */
export async function queryAllMeasurements({ order = 'DESC' } = {}) {
  if (sql.isReady()) {
    return sql.queryMeasurements({ from: 0, to: Date.now(), limit: 100_000, order });
  }
  const arr = [...(_state?.measurements || [])];
  if (order === 'ASC') arr.reverse();
  return arr;
}

// ── АНАЛІТИКА ТИСКУ ───────────────────────────────────────────────────────────

/** Середнє sys/dia/pulse за вказаний діапазон */
export async function avgMeasurements({ days = 30, from, to } = {}) {
  const rows = await queryMeasurements({ days, from, to, limit: 1000, order: 'DESC' });
  if (!rows.length) return null;
  const sum = rows.reduce(
    (acc, r) => {
      acc.sys += r.sys; acc.dia += r.dia;
      if (r.pulse) { acc.pulse += r.pulse; acc.pulseN++; }
      return acc;
    },
    { sys: 0, dia: 0, pulse: 0, pulseN: 0 },
  );
  return {
    sys:   Math.round(sum.sys   / rows.length),
    dia:   Math.round(sum.dia   / rows.length),
    pulse: sum.pulseN ? Math.round(sum.pulse / sum.pulseN) : null,
    count: rows.length,
  };
}

/**
 * Тренд: масив { date, sys, dia, pulse, n } згрупований по датах.
 * Готовий для SVG-графіку або кореляційного аналізу.
 */
export async function calcHealthIndexTrend(days = 30) {
  const rows = await queryMeasurements({ days, limit: 2000, order: 'ASC' });
  if (!rows.length) return [];

  const byDate = {};
  for (const r of rows) {
    const d = isoToDate(r.time);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(r);
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayRows]) => {
      const avgSys   = Math.round(dayRows.reduce((s, r) => s + r.sys, 0) / dayRows.length);
      const avgDia   = Math.round(dayRows.reduce((s, r) => s + r.dia, 0) / dayRows.length);
      const pulseArr = dayRows.filter(r => r.pulse).map(r => r.pulse);
      const avgPulse = pulseArr.length
        ? Math.round(pulseArr.reduce((s, v) => s + v, 0) / pulseArr.length)
        : null;
      return { date, sys: avgSys, dia: avgDia, pulse: avgPulse, n: dayRows.length };
    });
}

/** Розподіл вимірювань по категоріях — враховує вибраний стандарт (ESC2024 / AHA2017) */
export async function countByBPCategory({ days = 30 } = {}) {
  const rows = await queryMeasurements({ days, limit: 2000 });
  const std = _state?.settings?.bpStandard || 'ESC2024';
  const counts = { pressure_optimal: 0, pressure_normal: 0, pressure_high_1: 0, pressure_grade1: 0, pressure_grade2: 0, pressure_grade3: 0 };

  for (const r of rows) {
    if (std === 'AHA2017') {
      // AHA 2017: Normal / Elevated / Stage 1 / Stage 2 / Crisis
      // Mapped до 5 ESC-слотів (pressure_grade3 завжди 0 для AHA)
      if      (r.sys < 120 && r.dia < 80)   counts.pressure_optimal++;  // Normal
      else if (r.sys < 130 && r.dia < 80)   counts.pressure_normal++;   // Elevated
      else if (r.sys < 140 && r.dia < 90)   counts.pressure_high_1++;   // Stage 1
      else if (r.sys < 180 && r.dia < 120)  counts.pressure_grade1++;   // Stage 2
      else                                   counts.pressure_grade2++;   // Crisis (≥180 або ≥120)
    } else {
      // ESC 2024 (за замовчуванням)
      if      (r.sys < 120 && r.dia < 80)  counts.pressure_optimal++;
      else if (r.sys < 130 && r.dia < 85)  counts.pressure_normal++;
      else if (r.sys < 140 && r.dia < 90)  counts.pressure_high_1++;
      else if (r.sys < 160 && r.dia < 100) counts.pressure_grade1++;
      else if (r.sys < 180 && r.dia < 110) counts.pressure_grade2++;
      else                                  counts.pressure_grade3++;
    }
  }
  return counts;
}

// ── КРОКИ ─────────────────────────────────────────────────────────────────────

/**
 * Денні підсумки кроків за вказаний діапазон.
 * @returns {Promise<Array<{date, steps, goal}>>}
 */
export async function queryStepLog({ days = 30, from, to } = {}) {
  const toDate   = to   || new Date().toISOString().split('T')[0];
  const fromDate = from || daysAgo(days);

  if (sql.isReady()) {
    return sql.queryStepLog({ from: fromDate, to: toDate, limit: days + 5 });
  }

  // Web fallback: читаємо з localStorage
  const result = [];
  const goal   = (_state?.settings?.stepGoal) || 10000;
  const cur    = new Date(fromDate);
  const end    = new Date(toDate);
  while (cur <= end) {
    const d = cur.toISOString().split('T')[0];
    const raw = localStorage.getItem('stepCount-' + d);
    const steps = raw ? parseInt(raw) || 0 : 0;
    if (steps > 0) result.push({ date: d, steps, goal });
    cur.setDate(cur.getDate() + 1);
  }
  return result.reverse();
}

/**
 * Зберегти денний підсумок кроків у SQLite та localStorage.
 */
export async function saveStepLog({ date, steps, goal = 10000 }) {
  try { localStorage.setItem('stepCount-' + date, String(steps)); } catch {}
  if (sql.isReady()) {
    await sql.upsertStepLog({ date, steps, goal });
  }
}

/** Середня кількість кроків за день */
export async function avgSteps({ days = 7 } = {}) {
  const rows = await queryStepLog({ days });
  if (!rows.length) return 0;
  return Math.round(rows.reduce((s, r) => s + r.steps, 0) / rows.length);
}

/**
 * Кореляція кроків і систолічного тиску по днях.
 * @returns {Promise<Array<{date, steps, sys}>>}
 */
export async function queryStepPressureCorrelation({ days = 30 } = {}) {
  const [stepRows, measRows] = await Promise.all([
    queryStepLog({ days }),
    queryMeasurements({ days, limit: 2000, order: 'ASC' }),
  ]);

  const sysByDate = {};
  for (const r of measRows) {
    const d = isoToDate(r.time);
    if (!sysByDate[d]) sysByDate[d] = { sum: 0, n: 0 };
    sysByDate[d].sum += r.sys;
    sysByDate[d].n++;
  }

  return stepRows
    .filter(r => sysByDate[r.date])
    .map(r => ({
      date:  r.date,
      steps: r.steps,
      sys:   Math.round(sysByDate[r.date].sum / sysByDate[r.date].n),
    }));
}

// ── ЛІКИ ──────────────────────────────────────────────────────────────────────

/** Список усіх ліків */
export async function queryMedications() {
  if (sql.isReady()) {
    const rows = await sql.queryMedications();
    return rows.map(r => ({
      id: r.id, name: r.name, dose: r.dose,
      time: r.time, days: r.days, date: r.date,
    }));
  }
  return _state?.pills || [];
}

/**
 * Статистика прийому ліків (adherence).
 * @returns {Promise<{total, taken, pct}>}
 */
export async function calcAdherence({ days = 30 } = {}) {
  const toDate   = new Date().toISOString().split('T')[0];
  const fromDate = daysAgo(days);

  if (sql.isReady()) {
    const rows   = await sql.queryMedTaken({ from: fromDate, to: toDate });
    const total  = rows.length;
    const taken  = rows.filter(r => r.taken).length;
    return { total, taken, pct: total ? Math.round(taken / total * 100) : 0 };
  }

  // Web fallback
  const takenObj = _state?.pillsTaken || {};
  let total = 0, taken = 0;
  const cur = new Date(fromDate);
  const end = new Date(toDate);
  while (cur <= end) {
    const d = cur.toISOString().split('T')[0];
    const dayMap = takenObj[d] || {};
    for (const v of Object.values(dayMap)) {
      total++;
      if (v) taken++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { total, taken, pct: total ? Math.round(taken / total * 100) : 0 };
}

// ── WRITE-THROUGH: запис нових даних у реляційні таблиці ─────────────────────

/**
 * Зберегти ONE вимір у SQLite після запису в state (write-through).
 * Викликається з pressure/index.js після saveMeasurement().
 */
export async function insertMeasurement(m) {
  if (!sql.isReady()) return null;
  return sql.insertMeasurement({
    sys:   m.sys,
    dia:   m.dia,
    pulse: m.pulse ?? null,
    note:  m.note  ?? '',
    time:  m.time,
  });
}

/**
 * Зберегти / оновити картку ліків у SQLite.
 */
export async function saveMedication(p) {
  if (!sql.isReady()) return false;
  return sql.upsertMedication({
    id: String(p.id), name: p.name, dose: p.dose ?? '',
    time: p.time ?? '08:00', days: p.days ?? 'daily', date: p.date ?? '',
  });
}

/**
 * Видалити картку ліків зі SQLite (разом з med_taken).
 */
export async function removeMedication(id) {
  if (!sql.isReady()) return false;
  return sql.deleteMedication(String(id));
}

/**
 * Зберегти статус прийому одного ліків.
 */
export async function saveMedTaken(medId, date, taken) {
  if (!sql.isReady()) return false;
  return sql.setMedTaken(String(medId), date, taken);
}
