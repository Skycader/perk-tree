// ── UI ZOOM ──
// +/- buttons in the top bar scale the whole popup/window system — text
// AND box dimensions (tooltip, secondary .win-* windows, notes popup,
// note-link popup) — to emulate what native browser zoom looks like,
// without actually using CSS `zoom` (tried first, reverted: it scales the
// whole rendered page as a single transform, and this app's tooltip/
// connector positioning is computed once via getBoundingClientRect() at
// open time — a zoom change after that point desyncs the live pixel
// geometry from what was baked into an already-open window, visibly
// breaking connector lines and window placement).
//
// Two different mechanisms carry the same percentage, because this app's
// sizing comes from two different places:
//   1. CSS dimensions (width/height/padding/gap/font-size) — every one of
//      these has been converted from `px` to `rem` (relative to html's
//      font-size, set below). Scaling the root font-size scales all of
//      them together for free, no per-property JS needed.
//   2. The secondary-window (.win-img/.win-combo/.win-audio/.win-tip)
//      placement in tooltip.js/windows.js is hand-computed in JS pixel
//      arithmetic (SLOT_COL_W, gaps, height caps from constants.js), not
//      CSS — rem has no effect on raw JS numbers. scale() (below) is
//      called at each of those constants' use sites, re-deriving the
//      value at the CURRENT zoom every time the layout code reads it, so
//      the column math stays consistent with however big the boxes are
//      actually rendering.
const STORAGE_KEY = 'uiZoomPercent';
const BASE_FONT_PX = 16; // must match html{font-size} in base.css
const STEP = 5;
const MIN = 50;
const MAX = 200;
const DEFAULT = 100;

function getStoredZoom() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const n = raw === null ? DEFAULT : parseInt(raw, 10);
  return Number.isFinite(n) ? Math.min(MAX, Math.max(MIN, n)) : DEFAULT;
}

let currentZoom = getStoredZoom();

const levelEl = document.getElementById('zoom-level');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');

function applyZoom() {
  document.documentElement.style.fontSize =
    (BASE_FONT_PX * currentZoom) / 100 + 'px';
  if (levelEl) levelEl.textContent = currentZoom + '%';
  if (zoomOutBtn) zoomOutBtn.disabled = currentZoom <= MIN;
  if (zoomInBtn) zoomInBtn.disabled = currentZoom >= MAX;
  localStorage.setItem(STORAGE_KEY, String(currentZoom));
  // Any open tooltip/popup already baked the OLD scale into its
  // hand-computed .win-* column positions (see the comment above) — rather
  // than try to reflow it live, just close everything and let it reopen
  // fresh at the new scale next time. A DOM event, not a direct import of
  // hideTooltip/hideNotesPopup/hideNoteLinkPopup here, since those modules
  // (via tooltip.js/windows.js) import scale()/getZoomScale() FROM this
  // file — importing them back would be circular. main.js already owns
  // this exact "close everything" list for the Escape handler.
  window.dispatchEvent(new CustomEvent('ui-zoom-changed'));
}

function setZoom(next) {
  currentZoom = Math.min(MAX, Math.max(MIN, next));
  applyZoom();
}

zoomInBtn?.addEventListener('click', () => setZoom(currentZoom + STEP));
zoomOutBtn?.addEventListener('click', () => setZoom(currentZoom - STEP));

export function getZoomScale() {
  return currentZoom / 100;
}

// Scales a base pixel value (one of the SLOT_COL_W-style layout constants
// in constants.js) to the current zoom — see the file-level comment for
// why this exists instead of just using rem everywhere.
export function scale(px) {
  return px * getZoomScale();
}

// re-affirms the level text/disabled state against whatever the early
// inline script already applied — harmless no-op if they already agree.
applyZoom();
