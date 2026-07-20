import { notes } from '../notes.js';
import { renderMD, renderLevelMD } from './markdown.js';

// ── LINKED NOTE POPUP ──
// Opened by clicking an <note id="..."> reference (see processNoteTags in
// markdown.js) — visually the same box as the startup notes popup (reuses
// its .notes-title-box/.notes-content/.note-author-line classes), but
// positioned and connected to the clicked word the same way chain-tip.js
// links its tip to a chain icon: getBoundingClientRect() of the trigger,
// flips side at the screen edge, elbow polyline connector.
const GAP = 8; // px gap between the clicked word and the popup, matches chain-tip.js

const popup = document.createElement('div');
popup.id = 'note-link-popup';
popup.innerHTML = `
  <div class="notes-title-box">
    <span class="note-link-title"></span>
    <button class="notes-close" type="button" title="Закрыть">✕</button>
  </div>
  <div class="notes-content"></div>
`;
document.body.appendChild(popup);

const titleEl = popup.querySelector('.note-link-title');
const contentEl = popup.querySelector('.notes-content');
const closeBtn = popup.querySelector('.notes-close');

// createElementNS is required here — document.createElement('svg') creates
// an HTML-namespaced element that never actually renders as vector
// graphics (its innerHTML-assigned children, circle/polyline, silently
// fail to paint too, even though every computed style looks correct).
// Every other SVG connector in this codebase sidesteps this entirely by
// being a static <svg> tag in index.html, which the HTML parser namespaces
// automatically — this is the only one built dynamically in JS.
const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
arrowSvg.id = 'note-link-arrow-svg';
arrowSvg.style.cssText =
  'display:none;position:fixed;left:0;top:0;pointer-events:none;z-index:699;overflow:visible;';
document.body.appendChild(arrowSvg);

let activeTrigger = null;

export function hideNoteLinkPopup() {
  popup.classList.remove('visible');
  arrowSvg.style.display = 'none';
  arrowSvg.innerHTML = '';
  activeTrigger = null;
}

export function showNoteLinkPopup(triggerEl, noteId) {
  // clicking the same word again toggles the popup closed, matching the
  // single-instance requirement — there's only ever one of these open, so
  // opening a different <note> ref while one is open just relocates it.
  if (activeTrigger === triggerEl && popup.classList.contains('visible')) {
    hideNoteLinkPopup();
    return;
  }
  const note = notes.find((n) => n.id === noteId);
  if (!note) return;

  activeTrigger = triggerEl;
  titleEl.textContent = note.title || '';
  const authorLine = note.author
    ? `<div class="note-author-line">${renderLevelMD(note.author)}</div>`
    : '';
  contentEl.innerHTML = renderMD(note.content || '') + authorLine;
  popup.classList.add('visible');

  const r = triggerEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pw = popup.offsetWidth;
  const ph = popup.offsetHeight;

  // left of the word by default, flips right if it'd go off-screen — same
  // rule as showChainTip() in chain-tip.js, so every linked popup in the
  // app behaves the same way regardless of which mechanism opened it.
  let px = r.left - pw - GAP;
  if (px < 4) px = r.right + GAP;
  if (px + pw > vw - 4) px = vw - pw - 4;

  let py = r.top - ph / 2 + r.height / 2;
  if (py < 4) py = 4;
  if (py + ph > vh - 4) py = vh - ph - 4;

  popup.style.left = px + 'px';
  popup.style.top = py + 'px';

  // draw the Г-line connector immediately — px/py/pw/ph above are exactly
  // what the popup's rect will be, since we just set them ourselves, so
  // there's no need to wait a frame and re-measure via
  // getBoundingClientRect() like chain-tip.js does. Vertical segment first
  // (up or down from the word to the popup's title-bar height), then
  // horizontal to whichever side the popup landed on — a Г/L elbow.
  const icX = r.left + r.width / 2;
  const icY = r.top + r.height / 2;
  // On a narrow viewport the vw-4 clamp above can force the popup to
  // overlap the word it's linked to horizontally — connecting to whichever
  // edge is "closer" would then draw the horizontal segment underneath the
  // popup's own opaque background, making it invisible. Detect that case
  // and go straight up/down to the word's own X instead (no bend needed,
  // it's already vertically aligned).
  const toX = icX < px ? px : icX > px + pw ? px + pw : icX;
  const toY = py + 20;
  const total = Math.abs(icY - toY) + Math.abs(toX - icX);
  arrowSvg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  arrowSvg.style.width = vw + 'px';
  arrowSvg.style.height = vh + 'px';
  arrowSvg.style.display = 'block';
  arrowSvg.innerHTML = `
    <circle cx="${icX}" cy="${icY}" r="3" fill="#50556a"/>
    <polyline points="${icX},${icY} ${icX},${toY} ${toX},${toY}"
      fill="none" stroke="#50556a" stroke-width="1.5"
      stroke-dasharray="${total}" stroke-dashoffset="${total}"
      style="animation:dashIn .3s ease forwards"/>`;
}

closeBtn.addEventListener('click', hideNoteLinkPopup);

// click-outside-closes — but not for a click on an <note> ref itself, that's
// handled by the toggle/relocate logic in showNoteLinkPopup() above.
document.addEventListener('click', (e) => {
  if (!popup.classList.contains('visible')) return;
  if (popup.contains(e.target)) return;
  if (e.target.closest('.inline-note-ref')) return;
  hideNoteLinkPopup();
});

// the connector line is anchored to a specific on-screen rect — closing on
// resize avoids leaving it pointing at a stale position.
window.addEventListener('resize', hideNoteLinkPopup);
