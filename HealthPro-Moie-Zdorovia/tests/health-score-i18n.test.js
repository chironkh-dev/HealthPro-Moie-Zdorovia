// Tests for toggleHealthTooltip() — verifies that all VETO labels and the
// norm-mode badge instantly reflect the active language (uk / ru) when the
// tooltip is opened.  A lightweight DOM stub replaces globalThis.document so
// that the function can run in Node without jsdom.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { state } from '../src/core/state.js';
import { T_UK } from '../src/i18n/ui.uk.js';
import { T_RU } from '../src/i18n/ui.ru.js';
import {
  calcHealthScore,
  toggleHealthTooltip,
} from '../src/features/analytics/health-score.js';

// ─── Minimal DOM element factory ─────────────────────────────────────────────

function makeEl(id = '') {
  const classes = new Set();
  return {
    id,
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      _s: classes,
      contains(c) { return classes.has(c); },
      toggle(c)   { classes.has(c) ? classes.delete(c) : classes.add(c); },
      add(c)      { classes.add(c); },
      remove(c)   { classes.delete(c); },
    },
  };
}

// ─── DOM stub installation / teardown ────────────────────────────────────────

let elMap;
let originalGetById;

const REQUIRED_IDS = [
  'healthTooltip',
  'score-bp', 'score-pulse', 'score-pills', 'score-activity', 'score-bmi',
  'veto-status', 'norm-mode',
];

function installDOM() {
  elMap = {};
  REQUIRED_IDS.forEach((id) => { elMap[id] = makeEl(id); });

  originalGetById = globalThis.document.getElementById;
  globalThis.document.getElementById = (id) => elMap[id] ?? null;
}

function removeDOM() {
  globalThis.document.getElementById = originalGetById;
}

// ─── State helpers ────────────────────────────────────────────────────────────

function resetState() {
  state.lang         = 'uk';
  state.measurements = [];
  state.pills        = [];
  state.pillsTaken   = {};
  state.settings     = { stepsEnabled: false };
}

function addMeas(sys, dia, pulse, daysAgo = 0) {
  const time = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  state.measurements.unshift({ sys, dia, pulse, time });
}

// Open the tooltip (first call → isShowing=false → populates + shows).
function openTooltip() {
  // Ensure tooltip starts in hidden state before opening.
  const el = elMap['healthTooltip'];
  el.classList._s.clear();           // hidden
  toggleHealthTooltip();             // populate + show
}

// Close the tooltip (second call → isShowing=true → just hides).
function closeTooltip() {
  toggleHealthTooltip();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('toggleHealthTooltip — VETO labels switch with language', () => {
  beforeEach(() => {
    resetState();
    installDOM();
  });

  afterEach(removeDOM);

  // ── Helper: open tooltip, grab vetoEl text, close, then switch lang and
  //    repeat — returns { uk, ru } for the caller to assert.
  function vetoTextsForBothLangs(seedFn) {
    seedFn();
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();
    const ukText = elMap['veto-status'].textContent;
    closeTooltip();

    state.lang = 'ru';
    openTooltip();
    const ruText = elMap['veto-status'].textContent;
    closeTooltip();

    return { ukText, ruText };
  }

  // ── 1. Hypertensive crisis (sys≥180 || dia≥120) ───────────────────────────
  it('shows CRISIS veto label in Ukrainian when lang=uk', () => {
    addMeas(185, 110, 70);
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();

    expect(elMap['veto-status'].style.display).toBe('block');
    expect(elMap['veto-status'].textContent).toBe(T_UK['hs-veto-crisis']);
  });

  it('shows CRISIS veto label in Russian when lang=ru', () => {
    addMeas(185, 110, 70);
    calcHealthScore();

    state.lang = 'ru';
    openTooltip();

    expect(elMap['veto-status'].style.display).toBe('block');
    expect(elMap['veto-status'].textContent).toBe(T_RU['hs-veto-crisis']);
  });

  it('CRISIS veto text differs between uk and ru', () => {
    const { ukText, ruText } = vetoTextsForBothLangs(() => addMeas(185, 110, 70));
    expect(ukText).toBe(T_UK['hs-veto-crisis']);
    expect(ruText).toBe(T_RU['hs-veto-crisis']);
    expect(ukText).not.toBe(ruText);
  });

  // ── 2. Hypertension stage II veto (sys≥160 || dia≥100, but < crisis) ──────
  it('shows HT-2 veto label in Ukrainian when lang=uk', () => {
    addMeas(165, 105, 70);
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();

    expect(elMap['veto-status'].style.display).toBe('block');
    expect(elMap['veto-status'].textContent).toBe(T_UK['hs-veto-ht2']);
  });

  it('shows HT-2 veto label in Russian when lang=ru', () => {
    addMeas(165, 105, 70);
    calcHealthScore();

    state.lang = 'ru';
    openTooltip();

    expect(elMap['veto-status'].style.display).toBe('block');
    expect(elMap['veto-status'].textContent).toBe(T_RU['hs-veto-ht2']);
  });

  it('HT-2 veto text differs between uk and ru', () => {
    const { ukText, ruText } = vetoTextsForBothLangs(() => addMeas(165, 105, 70));
    expect(ukText).toBe(T_UK['hs-veto-ht2']);
    expect(ruText).toBe(T_RU['hs-veto-ht2']);
    expect(ukText).not.toBe(ruText);
  });

  // ── 3. Hypotension veto (sys<85 || dia<55) ────────────────────────────────
  it('shows HYPOTENSION veto label in Ukrainian when lang=uk', () => {
    addMeas(80, 50, 60);
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();

    expect(elMap['veto-status'].style.display).toBe('block');
    expect(elMap['veto-status'].textContent).toBe(T_UK['hs-veto-hypo']);
  });

  it('shows HYPOTENSION veto label in Russian when lang=ru', () => {
    addMeas(80, 50, 60);
    calcHealthScore();

    state.lang = 'ru';
    openTooltip();

    expect(elMap['veto-status'].style.display).toBe('block');
    expect(elMap['veto-status'].textContent).toBe(T_RU['hs-veto-hypo']);
  });

  it('HYPOTENSION veto text differs between uk and ru', () => {
    const { ukText, ruText } = vetoTextsForBothLangs(() => addMeas(80, 50, 60));
    expect(ukText).toBe(T_UK['hs-veto-hypo']);
    expect(ruText).toBe(T_RU['hs-veto-hypo']);
    expect(ukText).not.toBe(ruText);
  });

  // ── 4. No veto — display:none ─────────────────────────────────────────────
  it('hides veto-status when BP is normal (no veto)', () => {
    addMeas(115, 75, 70);
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();

    expect(elMap['veto-status'].style.display).toBe('none');
    expect(elMap['veto-status'].textContent).toBe(''); // not written when hidden
  });

  // ── 5. Lang switch between tooltip opens (same measurement) ───────────────
  it('updates veto text when lang changes between tooltip openings (crisis)', () => {
    addMeas(185, 110, 70);
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();
    expect(elMap['veto-status'].textContent).toBe(T_UK['hs-veto-crisis']);
    closeTooltip();

    // Switch language — reopen without recalculating score
    state.lang = 'ru';
    openTooltip();
    expect(elMap['veto-status'].textContent).toBe(T_RU['hs-veto-crisis']);
  });
});

// ─── Norm-mode badge tests ────────────────────────────────────────────────────

describe('toggleHealthTooltip — norm-mode badge switches with language', () => {
  beforeEach(() => {
    resetState();
    installDOM();
  });

  afterEach(removeDOM);

  it('shows STANDARD norm badge in Ukrainian when no personal norm set', () => {
    addMeas(115, 75, 70);
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();

    expect(elMap['norm-mode'].textContent).toBe(T_UK['hs-norm-standard']);
    expect(elMap['norm-mode'].style.display).toBe('block');
  });

  it('shows STANDARD norm badge in Russian when no personal norm set', () => {
    addMeas(115, 75, 70);
    calcHealthScore();

    state.lang = 'ru';
    openTooltip();

    expect(elMap['norm-mode'].textContent).toBe(T_RU['hs-norm-standard']);
  });

  it('shows PERSONAL norm badge in Ukrainian when profile norm is set', () => {
    state.settings.normalSys = '115';
    state.settings.normalDia = '75';
    addMeas(115, 75, 70);
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();

    expect(elMap['norm-mode'].textContent).toBe(T_UK['hs-norm-personal']);
  });

  it('shows PERSONAL norm badge in Russian when profile norm is set', () => {
    state.settings.normalSys = '115';
    state.settings.normalDia = '75';
    addMeas(115, 75, 70);
    calcHealthScore();

    state.lang = 'ru';
    openTooltip();

    expect(elMap['norm-mode'].textContent).toBe(T_RU['hs-norm-personal']);
  });

  it('norm badge text differs between uk and ru for both standard and personal', () => {
    // Standard
    addMeas(115, 75, 70);
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();
    const ukStd = elMap['norm-mode'].textContent;
    closeTooltip();

    state.lang = 'ru';
    openTooltip();
    const ruStd = elMap['norm-mode'].textContent;
    closeTooltip();

    expect(ukStd).toBe(T_UK['hs-norm-standard']);
    expect(ruStd).toBe(T_RU['hs-norm-standard']);
    expect(ukStd).not.toBe(ruStd);

    // Personal
    state.settings.normalSys = '115';
    state.settings.normalDia = '75';
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();
    const ukPers = elMap['norm-mode'].textContent;
    closeTooltip();

    state.lang = 'ru';
    openTooltip();
    const ruPers = elMap['norm-mode'].textContent;
    closeTooltip();

    expect(ukPers).toBe(T_UK['hs-norm-personal']);
    expect(ruPers).toBe(T_RU['hs-norm-personal']);
    expect(ukPers).not.toBe(ruPers);
  });

  it('norm badge updates immediately when lang changes between openings', () => {
    addMeas(115, 75, 70);
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();
    expect(elMap['norm-mode'].textContent).toBe(T_UK['hs-norm-standard']);
    closeTooltip();

    state.lang = 'ru';
    openTooltip();
    expect(elMap['norm-mode'].textContent).toBe(T_RU['hs-norm-standard']);
  });
});

// ─── Score breakdown elements populated correctly ─────────────────────────────

describe('toggleHealthTooltip — score breakdown elements', () => {
  beforeEach(() => {
    resetState();
    installDOM();
  });

  afterEach(removeDOM);

  it('populates score-bp, score-pills elements on open', () => {
    addMeas(115, 75, 70);
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();

    expect(elMap['score-bp'].textContent).toBe(40);
    expect(elMap['score-pills'].textContent).toBe(20);
  });

  it('shows dash for excluded pulse when pulse data is absent', () => {
    addMeas(115, 75, null);  // no pulse
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();

    expect(elMap['score-pulse'].textContent).toBe('—');
  });

  it('tooltip element gains "show" class after first call', () => {
    addMeas(115, 75, 70);
    calcHealthScore();
    openTooltip();

    expect(elMap['healthTooltip'].classList.contains('show')).toBe(true);
  });

  it('tooltip element loses "show" class after second call (close)', () => {
    addMeas(115, 75, 70);
    calcHealthScore();
    openTooltip();
    closeTooltip();

    expect(elMap['healthTooltip'].classList.contains('show')).toBe(false);
  });

  it('does not repopulate elements on close call', () => {
    addMeas(115, 75, 70);
    calcHealthScore();

    state.lang = 'uk';
    openTooltip();
    const ukText = elMap['norm-mode'].textContent;

    // Change lang while tooltip is open (simulates user action)
    state.lang = 'ru';
    closeTooltip(); // this is a hide call — should NOT repopulate

    // Text should still be uk (populated when opened, not updated on close)
    expect(elMap['norm-mode'].textContent).toBe(ukText);
  });
});
