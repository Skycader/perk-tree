import { resolvePerkInline } from './markdown.js';
import { FOCUS_DIM } from './constants.js';

// Shared scroll-to + dim-overlay + glow highlight for jumping to a perk in
// the tree. Used by inline <perk> refs (main.js), combo rows inside an open
// tooltip (tooltip.js), and search results (search-modal.js). Callers hide
// any currently-open tooltip themselves first (each already has its own
// reference to hideTooltip) — this only owns the part that was duplicated
// identically in both places: find the perk, scroll to it, and run the
// dim-overlay + box-shadow glow effect.
export function focusPerkById(perkId) {
  const target = [...document.querySelectorAll('.perk')].find(
    (pe) => pe.dataset.perkId === perkId,
  );
  if (!target) return;
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
    const { hex } = resolvePerkInline(perkId);
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
}
