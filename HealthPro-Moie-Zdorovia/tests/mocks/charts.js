// Stub для тестів — замінює реальний charts.js (ECharts + zrender),
// який звертається до browser-globals (navigator, canvas) при імпорті.
// Всі функції-no-op; COLORS відповідає оригіналу для перевірок стилів.

export function createChart()     { return null; }
export function disposeChart()    {}
export function resizeAllCharts() {}

export const COLORS = {
  green:  '#10b981',
  amber:  '#f59e0b',
  red:    '#ef4444',
  blue:   '#3b82f6',
  violet: '#8b5cf6',
  cyan:   '#06b6d4',
  text3:  '#64748b',
  grid:   'rgba(99,140,255,0.07)',
};
