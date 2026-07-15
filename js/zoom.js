// In-app interface scale — an analogue of the browser's own Ctrl+/Ctrl-
// zoom, but controlled from the UI and persisted, independent of whatever
// zoom level the user's actual browser window is at.
const STORAGE_KEY = 'perkTreeZoom';
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const STEP = 5;
const DEFAULT_ZOOM = 100;

// Unlike real browser zoom, CSS `zoom` scales rendered content (and its
// getBoundingClientRect) without touching window.innerWidth/innerHeight —
// so any viewport-bound math has to divide those by the current zoom to
// get the actual available space in the same (zoomed) pixel units as
// everything else on screen.
export function getZoom() {
  return parseFloat(document.documentElement.style.zoom) || 1;
}

export function initZoom(onChange) {
  const valEl = document.getElementById('zoom-val');
  const outBtn = document.getElementById('zoom-out');
  const inBtn = document.getElementById('zoom-in');
  if (!valEl || !outBtn || !inBtn) return;

  let zoom = parseInt(localStorage.getItem(STORAGE_KEY), 10);
  if (!Number.isFinite(zoom) || zoom < MIN_ZOOM || zoom > MAX_ZOOM) {
    zoom = DEFAULT_ZOOM;
  }

  function apply(notify) {
    document.documentElement.style.zoom = zoom / 100;
    valEl.textContent = zoom + '%';
    localStorage.setItem(STORAGE_KEY, String(zoom));
    if (notify) onChange?.();
  }

  outBtn.addEventListener('click', () => {
    zoom = Math.max(MIN_ZOOM, zoom - STEP);
    apply(true);
  });
  inBtn.addEventListener('click', () => {
    zoom = Math.min(MAX_ZOOM, zoom + STEP);
    apply(true);
  });
  valEl.addEventListener('click', () => {
    zoom = DEFAULT_ZOOM;
    apply(true);
  });

  apply(false); // silent initial application of the saved zoom level
}
