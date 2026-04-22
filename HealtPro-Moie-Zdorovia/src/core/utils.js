export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function avg(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}
