// Shared step count state — no browser globals, no ECharts dependency.
// Imported by health-score.js (pure logic) to avoid the transitive chain:
//   steps/index.js → charts.js → zrender/env.js → navigator (browser-only)
// Updated by steps/index.js via _setStepCount() on every change.

let _stepCount = 0;

/** Returns the current in-session step count. */
export function getStepCount() { return _stepCount; }

/** Called by steps/index.js whenever stepCount changes. Internal API. */
export function _setStepCount(n) { _stepCount = n; }
