// HealthPro — ECharts factory з tree-shaking
// SVGRenderer для лінійних графіків (малий датасет, HiDPI-чіткість).
// CanvasRenderer — резерв для скаттерплотів з великими датасетами.

import { init, use } from 'echarts/core';
import { LineChart, BarChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DataZoomComponent,
} from 'echarts/components';
import { SVGRenderer, CanvasRenderer } from 'echarts/renderers';

use([
  LineChart, BarChart, ScatterChart,
  GridComponent, TooltipComponent, LegendComponent,
  MarkLineComponent, MarkAreaComponent, DataZoomComponent,
  SVGRenderer, CanvasRenderer,
]);

// Слабка карта: DOM-елемент → екземпляр ECharts
const _instances = new WeakMap();

/**
 * Створює або повертає наявний екземпляр ECharts для DOM-елемента.
 * @param {HTMLElement} el
 * @param {'svg'|'canvas'} renderer — 'svg' за замовчуванням
 */
export function createChart(el, renderer = 'svg') {
  if (!el) return null;
  if (_instances.has(el)) return _instances.get(el);
  const chart = init(el, null, { renderer });
  _instances.set(el, chart);
  return chart;
}

/**
 * Знищує екземпляр ECharts та звільняє пам'ять.
 * @param {HTMLElement} el
 */
export function disposeChart(el) {
  if (!el) return;
  if (_instances.has(el)) {
    _instances.get(el).dispose();
    _instances.delete(el);
  }
}

/**
 * Повторно рендерить (resize) усі активні екземпляри.
 * Корисно при зміні орієнтації екрана.
 */
export function resizeAllCharts() {
  // WeakMap не ітерується — модулі самі викликають .resize() за необхідності
}

// Кольорова палітра (CSS змінні не доступні в ECharts options → хардкод)
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
