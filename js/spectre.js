import { STAND_DATA } from '../config.js';
import { COLOUR_KEYS } from './constants.js';
import { spTooltip, spOverlay, spHeader, spLevels, ttArrowSvg } from './dom-refs.js';
import { perkCountByColor, totalPerks } from './tree.js';

const D = STAND_DATA;

// ── SPECTRE TOOLTIP ──
let _spectreOpen = false;
export function isSpectreOpen() {
  return _spectreOpen;
}
export function setSpectreOpen(v) {
  _spectreOpen = v;
}

export function showSpectre(iconEl) {
  if (!D.spectre) return;
  _spectreOpen = true;
  document.body.style.overflow = 'hidden';

  spHeader.textContent = 'Палитра цветов';
  spLevels.innerHTML = Object.entries(D.spectre)
    .map(([colour, txt]) => {
      const hex = COLOUR_KEYS[colour] || '#888';
      const count = perkCountByColor[colour] || 0;
      const percent = totalPerks
        ? Math.round((count / totalPerks) * 100)
        : 0;
      return `<div class="tt-row">
<span style="display:inline-block;width:10px;height:10px;background:${hex};border-radius:1px;flex-shrink:0;margin-top:2px"></span>
<mark class="sp-share">${count}/${totalPerks} (${percent}%)</mark>
<span class="tt-text">${txt}</span>
    </div>`;
    })
    .join('');

  spTooltip.style.display = 'flex';
  spTooltip.style.opacity = '1';
  const ir = iconEl.getBoundingClientRect();
  const icX = ir.left + ir.width / 2;
  const icY = ir.top + ir.height / 2;
  const tw = 340,
    vh = window.innerHeight,
    vw = window.innerWidth;
  const goRight = icX + 16 + tw <= vw - 4;
  let x = goRight ? icX + 16 : icX - tw - 16;
  if (x < 4) x = 4;
  spTooltip.style.maxHeight = Math.floor(vh * 0.82) + 'px';
  const actualH = Math.min(spTooltip.scrollHeight, Math.floor(vh * 0.82));
  let y = icY - actualH / 2;
  if (y + actualH > vh - 8) y = vh - actualH - 8;
  if (y < 8) y = 8;
  spTooltip.style.left = x + 'px';
  spTooltip.style.top = y + 'px';

  spOverlay.style.display = 'block';
  spOverlay.style.background = 'rgba(0,0,0,.6)';
  spOverlay.addEventListener('click', hideSpectre);

  // draw L-line from icon to sp-tooltip header
  const ttHeaderMidY = y + 18;
  const toX = goRight ? x : x + tw;
  const vLen = Math.abs(icY - ttHeaderMidY);
  const hLen = Math.abs(toX - icX);
  const total = vLen + hLen;
  const vw2 = vw;
  const vh2 = vh;

  ttArrowSvg.style.cssText = `display:block;position:fixed;left:0;top:0;width:${vw2}px;height:${vh2}px;pointer-events:none;z-index:499;overflow:visible;`;
  ttArrowSvg.setAttribute('viewBox', `0 0 ${vw2} ${vh2}`);
  ttArrowSvg.innerHTML = `
    <circle cx="${icX}" cy="${icY}" r="3" fill="#50556a"/>
    <polyline points="${icX},${icY} ${icX},${ttHeaderMidY} ${toX},${ttHeaderMidY}"
fill="none" stroke="#50556a" stroke-width="1.5"
stroke-dasharray="${total}" stroke-dashoffset="${total}"
style="animation:dashIn .3s ease forwards"/>`;
}

export function hideSpectre() {
  _spectreOpen = false;
  spTooltip.style.display = 'none';
  spOverlay.style.display = 'none';
  spOverlay.style.background = '';
  document.body.style.overflow = '';
  const cascSvg2 = document.getElementById('casc-arrow-svg');
  if (cascSvg2) cascSvg2.style.display = 'none';
  // also clear main arrow SVG (used for title-box spectre line)
  ttArrowSvg.style.display = 'none';
  ttArrowSvg.innerHTML = '';
  const titleIcon = document.querySelector('#title-name span');
  if (titleIcon) titleIcon.style.boxShadow = '';
}
