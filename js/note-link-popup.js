import { notes } from '../notes.js';
import { renderMD, renderLevelMD } from './markdown.js';

// ── LINKED NOTE POPUP — CASCADE CHAIN ──
// Opened by clicking a <note id="..."> reference (see processNoteTags in
// markdown.js) — visually the same box as the startup notes popup (reuses
// its .notes-title-box/.notes-content/.note-author-line classes), but
// positioned and connected to the clicked word the same way chain-tip.js
// links its tip to a chain icon: getBoundingClientRect() of the trigger,
// flips side at the screen edge, elbow polyline connector.
//
// A <note> ref clicked INSIDE an already-open popup opens ANOTHER one
// cascading off it, rather than replacing it — clicking through popup 1's
// own text can open popup 2, then popup 3 inside THAT, and so on with no
// hard depth limit (these are cheap static boxes). `chain` holds the
// currently open sequence root→leaf; each entry knows the trigger element
// it was opened from, so a NEW <note> ref clicked at some depth replaces
// whatever was already open at that depth and below (its old descendants),
// while everything ABOVE that depth (its ancestors) is left untouched.
const GAP = 8; // px gap between the clicked word and the popup, matches chain-tip.js

// createElementNS is required here — document.createElement('svg')/('g')
// creates an HTML-namespaced element that never actually renders as vector
// graphics (children assigned via innerHTML silently fail to paint too,
// even though every computed style looks correct). Every other SVG
// connector in this codebase sidesteps this by being a static <svg> tag in
// index.html, which the HTML parser namespaces automatically — this is the
// only one built dynamically in JS.
const SVG_NS = 'http://www.w3.org/2000/svg';

// One shared full-viewport overlay for every connector line in the chain —
// each link gets its own <g> inside it (removed individually when that
// link, or an ancestor of it, closes).
// z-index ABOVE .note-link-popup (700 — see notes.css), not below it. A
// depth-2+ connector's line necessarily starts inside its own parent popup
// (that's where the trigger word lives), so if the overlay sat below the
// popups, each parent would paint over the start of its own child's line —
// confirmed by pixel-sampling a rendered frame: the line was completely
// absent exactly where it crossed the parent popup's body. Above every
// popup, the (thin, pointer-events:none) line simply draws over whatever
// it crosses, the same way a leader line in a diagram would.
const arrowSvg = document.createElementNS(SVG_NS, 'svg');
arrowSvg.id = 'note-link-arrow-svg';
arrowSvg.style.cssText =
  'display:none;position:fixed;left:0;top:0;pointer-events:none;z-index:701;overflow:visible;';
document.body.appendChild(arrowSvg);

// ordered root→leaf: chain[0] was opened from outside every popup (tree/
// tooltip content), chain[i>0] was opened by clicking a <note> ref inside
// chain[i-1].popup.
let chain = [];

function syncArrowSvgSize() {
  const vw = window.innerWidth,
    vh = window.innerHeight;
  arrowSvg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  arrowSvg.style.width = vw + 'px';
  arrowSvg.style.height = vh + 'px';
}

// removes chain[index..end] — used both for closing a popup (which must
// also take its descendants with it, since their connector lines point at
// text that's part of the popup being removed) and for clearing out stale
// descendants before opening a replacement at that depth.
function closeFrom(index) {
  if (index < 0) index = 0;
  const removed = chain.splice(index);
  removed.forEach((link) => {
    link.popup.remove();
    link.connector.remove();
  });
  if (chain.length === 0) arrowSvg.style.display = 'none';
}

export function hideNoteLinkPopup() {
  closeFrom(0);
}

// which open chain link (if any) visually contains el — determines the
// depth a newly-clicked <note> ref belongs at.
function hostIndexFor(el) {
  return chain.findIndex((link) => link.popup.contains(el));
}

export function showNoteLinkPopup(triggerEl, noteId) {
  const hostIndex = hostIndexFor(triggerEl);
  const childIndex = hostIndex + 1;

  // re-clicking the exact word that's already open at this depth toggles
  // it (and everything cascaded under it) closed, instead of reopening.
  const existingChild = chain[childIndex];
  if (existingChild && existingChild.triggerEl === triggerEl) {
    closeFrom(childIndex);
    return;
  }

  const note = notes.find((n) => n.id === noteId);
  if (!note) return;

  // clicking a *different* link at/under this depth replaces whatever was
  // cascaded from here — ancestors (0..hostIndex) are left alone.
  closeFrom(childIndex);

  const popup = document.createElement('div');
  popup.className = 'note-link-popup';
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

  titleEl.textContent = note.title || '';
  const authorLine = note.author
    ? `<div class="note-author-line">${renderLevelMD(note.author)}</div>`
    : '';
  contentEl.innerHTML = renderMD(note.content || '') + authorLine;

  const r = triggerEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pw = popup.offsetWidth;
  const ph = popup.offsetHeight;

  let py = r.top - ph / 2 + r.height / 2;
  if (py < 4) py = 4;
  if (py + ph > vh - 4) py = vh - ph - 4;

  // rects of every popup already open, gathered before this one is placed —
  // used below so a new popup avoids covering them when there's room to.
  const openRects = chain.map((link) => link.popup.getBoundingClientRect());
  const overlapsAny = (px) => {
    const rect = { left: px, right: px + pw, top: py, bottom: py + ph };
    return openRects.some(
      (o) =>
        !(
          rect.right <= o.left ||
          rect.left >= o.right ||
          rect.bottom <= o.top ||
          rect.top >= o.bottom
        ),
    );
  };

  let px = null;
  if (hostIndex >= 0) {
    // cascaded off a parent popup — prefer sitting beside it rather than
    // beside the word alone: positioning off the word (a rule that works
    // fine for the root case below, where the word sits in the much
    // narrower tooltip) can otherwise land the new popup right on top of
    // the much wider popup it came from. Try the parent's right edge
    // first, then its left edge, taking whichever is both on-screen and
    // clear of every currently open popup.
    const parentRect = chain[hostIndex].popup.getBoundingClientRect();
    const rightCandidate = parentRect.right + GAP;
    const leftCandidate = parentRect.left - pw - GAP;
    if (rightCandidate + pw <= vw - 4 && !overlapsAny(rightCandidate)) {
      px = rightCandidate;
    } else if (leftCandidate >= 4 && !overlapsAny(leftCandidate)) {
      px = leftCandidate;
    }
  }

  if (px === null) {
    // root popup, or no clean spot beside the parent — fall back to the
    // word-relative placement (left of the word, flips right if that'd go
    // off-screen), same rule as showChainTip() in chain-tip.js. Clamped to
    // the viewport as a last resort even if that means some overlap —
    // there's nowhere else left to put it.
    px = r.left - pw - GAP;
    if (px < 4) px = r.right + GAP;
    if (px + pw > vw - 4) px = vw - pw - 4;
  }

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

  syncArrowSvgSize();
  arrowSvg.style.display = 'block';
  const connector = document.createElementNS(SVG_NS, 'g');
  connector.innerHTML = `
    <circle cx="${icX}" cy="${icY}" r="3" fill="#50556a"/>
    <polyline points="${icX},${icY} ${icX},${toY} ${toX},${toY}"
      fill="none" stroke="#50556a" stroke-width="1.5"
      stroke-dasharray="${total}" stroke-dashoffset="${total}"
      style="animation:dashIn .3s ease forwards"/>`;
  arrowSvg.appendChild(connector);

  closeBtn.addEventListener('click', (e) => {
    // stopPropagation matters here: this removes `popup` from the DOM, and
    // if this click were left to bubble to the document click-outside
    // listener below, it would find e.target no longer inside ANY
    // remaining popup (its own was just removed) and misread that as a
    // click outside the whole chain, wiping ancestors that should survive.
    e.stopPropagation();
    closeFrom(childIndex);
  });

  chain.push({ popup, connector, triggerEl, noteId });
}

// click-outside-closes-everything — but not for a click on a <note> ref
// itself, that's handled by the toggle/relocate logic in
// showNoteLinkPopup() above, and not for a click on any popup in the chain.
document.addEventListener('click', (e) => {
  if (chain.length === 0) return;
  if (e.target.closest('.inline-note-ref')) return;
  if (chain.some((link) => link.popup.contains(e.target))) return;
  hideNoteLinkPopup();
});

// every connector line is anchored to a specific on-screen rect — closing
// the whole chain on resize avoids leaving them pointing at stale positions.
window.addEventListener('resize', hideNoteLinkPopup);
