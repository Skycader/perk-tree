import './background.js';
import './zoom.js';
import './mobile-tabs.js';
import { drawColumn, drawTopBus } from './connectors.js';
import { hideSpectre } from './spectre.js';
import { licenseToolbar, licenseOverlay, showLicense, hideLicense } from './license-modal.js';
import { searchToolbar, searchOverlay, showSearchModal, hideSearchModal } from './search-modal.js';
import { hideTooltip, OPEN_TOOLTIP_STORAGE_KEY } from './tooltip.js';
import { focusPerkById } from './perk-focus.js';
import { IPR_GLOW_BLUR, IPR_GLOW_SPREAD, MIN_LOADER_MS } from './constants.js';
import { colRefs } from './tree.js';
import { exportPNG } from './export-png.js';
import { dbl } from './debug.js';
import { settleNotesPopup, hideNotesPopup } from './notes-popup.js';
import {
  showNoteLinkPopup,
  showTipPopup,
  hideNoteLinkPopup,
} from './note-link-popup.js';

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideTooltip();
    hideSpectre();
    hideNotesPopup();
    hideNoteLinkPopup();
  }
});

// zoom.js dispatches this instead of importing these directly (it would be
// circular — tooltip.js/windows.js import scale()/getZoomScale() FROM
// zoom.js). Any open window already baked the old scale into its
// hand-computed layout, so just close everything; it reopens fresh.
window.addEventListener('ui-zoom-changed', () => {
  hideTooltip();
  hideSpectre();
  hideNotesPopup();
  hideNoteLinkPopup();
  // the tree's own dependency-line connectors (drawColumn/drawTopBus) are
  // drawn from measured pixel rects too — a font-size change reflows the
  // tree's column widths exactly like a window resize does, so they need
  // the same redraw, not just a resize.
  requestAnimationFrame(redrawAll);
});

// ── DRAW ──
function redrawAll() {
  colRefs.forEach(drawColumn);
  drawTopBus();
}

// ── F5 RESTORE: reopen whatever perk tooltip was open before reload ──
// tooltip.js's showTooltip()/hideTooltip() keep OPEN_TOOLTIP_STORAGE_KEY in
// sessionStorage in sync with whatever tooltip is currently open. On load,
// if one was left open, scroll to that perk and re-click its icon — reusing
// the exact same click listener tree.js already wired up (see tree.js's
// `icon.addEventListener('click', () => showTooltip(...))`) rather than
// duplicating showTooltip's calling contract here.
function restoreOpenTooltip() {
  let pid;
  try {
    pid = sessionStorage.getItem(OPEN_TOOLTIP_STORAGE_KEY);
  } catch (e) {
    return;
  }
  if (!pid) return;
  const perkEl = [...document.querySelectorAll('.perk')].find(
    (pe) => pe.dataset.perkId === pid,
  );
  const icon = perkEl?.querySelector('.perk-icon');
  if (!icon) return;
  // 'auto' (instant), not 'smooth' — scrollIntoView with 'auto' updates the
  // scroll position synchronously, so the immediately-following click sees
  // the icon at its FINAL position for tooltip.js's runLayout to measure.
  // A smooth scroll would still be mid-animation when the click fires.
  perkEl.scrollIntoView({ behavior: 'auto', block: 'center' });
  icon.click();
}

window.addEventListener('resize', () => requestAnimationFrame(redrawAll));
// mobile-tabs.js reveals a previously display:none column — its connector
// lines were last computed against a zero-size box, same class of problem
// as a resize or zoom change.
window.addEventListener('mobile-tab-changed', () =>
  requestAnimationFrame(redrawAll),
);
document.fonts.ready.then(() =>
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      redrawAll();
      restoreOpenTooltip();
      // the tree itself is ready now — the loading screen (spinner + tip)
      // stays up until MIN_LOADER_MS has elapsed since navigation started,
      // simulating a big-level load even on a fast connection.
      const elapsedMs = performance.now();
      const remainingMs = Math.max(0, MIN_LOADER_MS - elapsedMs);
      setTimeout(() => {
        const pageLoader = document.getElementById('page-loader');
        if (pageLoader) pageLoader.classList.add('hidden');
        settleNotesPopup();
      }, remainingMs);
    }),
  ),
);



// ── GLOBAL inline-perk-ref handlers ──
// Single delegated listener covers ALL containers (ttLevels, extra, tip, perk-desc, etc.)
document.addEventListener('mouseover', (e) => {
  const ref = e.target.closest('.inline-perk-ref');
  if (!ref) return;
  const hex = ref.dataset.hex || '#888';
  ref.querySelector('.ipr-sq').style.boxShadow =
    `0 0 ${IPR_GLOW_BLUR}px ${IPR_GLOW_SPREAD}px ${hex}99`;
  const lbl = ref.querySelector('.ipr-label');
  if (lbl) {
    lbl.style.color = hex;
  }
});
document.addEventListener('mouseout', (e) => {
  const ref = e.target.closest('.inline-perk-ref');
  if (!ref) return;
  ref.querySelector('.ipr-sq').style.boxShadow = '';
  const lbl = ref.querySelector('.ipr-label');
  if (lbl) {
    lbl.style.color = '';
    lbl.style.opacity = '';
  }
});
document.addEventListener('click', (e) => {
  const ref = e.target.closest('.inline-perk-ref');
  if (!ref) return;
  const rid = ref.dataset.rid;
  if (!rid) return;
  hideTooltip();
  focusPerkById(rid);
});

// ── GLOBAL inline-note-ref/inline-tip-ref handler ──
// Same delegated-listener pattern as inline-perk-ref above. Both note and
// tip refs share the .inline-note-ref base class (cursor/underline
// mechanics) — dataset.tipId vs dataset.noteId is what tells them apart
// (see buildNoteRefSpan in markdown.js).
document.addEventListener('click', (e) => {
  const ref = e.target.closest('.inline-note-ref');
  if (!ref) return;
  if (ref.dataset.tipId) {
    showTipPopup(ref, ref.dataset.tipId);
    return;
  }
  const noteId = ref.dataset.noteId;
  if (!noteId) return;
  showNoteLinkPopup(ref, noteId);
});

licenseToolbar.addEventListener('click', showLicense);
licenseOverlay.addEventListener('click', hideLicense);
searchToolbar.addEventListener('click', showSearchModal);
searchOverlay.addEventListener('click', hideSearchModal);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideLicense();
    hideSearchModal();
  }
});

// exposed for the inline onclick="" handlers in index.html — module top-level
// functions aren't implicitly global the way classic-script ones were.
window.exportPNG = exportPNG;
window.hideSpectre = hideSpectre;
window.hideTooltip = hideTooltip;
window.hideLicense = hideLicense;
window.hideSearchModal = hideSearchModal;
// dev console debug helper (was window.dbl in the original monolith)
window.dbl = dbl;
