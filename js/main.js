import './background.js';
import { drawColumn, drawTopBus } from './connectors.js';
import { hideSpectre } from './spectre.js';
import { licenseToolbar, licenseOverlay, showLicense, hideLicense } from './license-modal.js';
import { hideTooltip } from './tooltip.js';
import { resolvePerkInline } from './markdown.js';
import { IPR_GLOW_BLUR, IPR_GLOW_SPREAD, FOCUS_DIM, MIN_LOADER_MS } from './constants.js';
import { colRefs } from './tree.js';
import { exportPNG } from './export-png.js';
import { dbl } from './debug.js';
import { settleNotesPopup, hideNotesPopup } from './notes-popup.js';

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideTooltip();
    hideSpectre();
    hideNotesPopup();
  }
});

// ── DRAW ──
function redrawAll() {
  colRefs.forEach(drawColumn);
  drawTopBus();
}

window.addEventListener('resize', () => requestAnimationFrame(redrawAll));
document.fonts.ready.then(() =>
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      redrawAll();
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
  const target = [...document.querySelectorAll('.perk')].find(
    (pe) => pe.dataset.perkId === rid,
  );
  if (!target) return;
  hideTooltip();
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => {
    let fo = document.getElementById('focus-overlay');
    if (!fo) {
      fo = document.createElement('div');
      fo.id = 'focus-overlay';
      fo.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0);z-index:50;pointer-events:auto;transition:background .35s ease;';
      document.body.appendChild(fo);
    }
    const { hex } = resolvePerkInline(rid);
    requestAnimationFrame(() => {
      fo.style.background = `rgba(0,0,0,${FOCUS_DIM})`;
    });
    target.style.position = 'relative';
    target.style.zIndex = '51';
    target.style.transition = 'box-shadow .35s ease';
    const _col = target.closest('.col');
    if (_col) {
      _col.style.position = 'relative';
      _col.style.zIndex = '52';
    }
    target.style.boxShadow = `0 0 0 2px ${hex},0 0 30px ${hex}80`;
    function clearF() {
      fo.style.background = 'rgba(0,0,0,0)';
      target.style.boxShadow = '';
      if (_col) {
        _col.style.position = '';
        _col.style.zIndex = '';
      }
      setTimeout(() => {
        fo.remove();
        target.style.position =
          target.style.zIndex =
          target.style.transition =
            '';
      }, 350);
    }
    fo.addEventListener('click', clearF, { once: true });
    setTimeout(() => {
      window.addEventListener('scroll', clearF, {
        once: true,
        passive: true,
      });
      window.addEventListener('keydown', clearF, { once: true });
    }, 400);
  }, 500);
});


licenseToolbar.addEventListener('click', showLicense);
licenseOverlay.addEventListener('click', hideLicense);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideLicense();
});

// exposed for the inline onclick="" handlers in index.html — module top-level
// functions aren't implicitly global the way classic-script ones were.
window.exportPNG = exportPNG;
window.hideSpectre = hideSpectre;
window.hideTooltip = hideTooltip;
window.hideLicense = hideLicense;
// dev console debug helper (was window.dbl in the original monolith)
window.dbl = dbl;
