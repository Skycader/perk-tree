import { notes } from '../notes.js';
import { tips } from '../tips.js';
import { renderMD, renderLevelMD } from './markdown.js';

// kind → data source, matches processNoteTags/processTipTags in markdown.js
const SOURCES = { note: notes, tip: tips };

// <file src="path/to/thing.md"></file> — lazily fetches an external file's
// raw text and substitutes it in place of the tag, so long-form content
// doesn't have to live inline in notes.js/tips.js. `src` is any relative
// URL the static server can serve — not limited to a particular folder.
// Resolved HERE (not in markdown.js) specifically because it's async and
// this is the one render path that can afford to await before building the
// popup DOM — renderMD/renderLevelMD stay fully synchronous everywhere
// else in the app (tooltip/tree/sidebar rendering all assume synchronous
// innerHTML + immediate scrollHeight measurement right after). No caching
// — refetches every time the popup opens, by design (not preloaded, not
// memoized). Only resolved when a note/tip popup is actually opened, never
// eagerly.
async function resolveFileTags(content) {
  const FILE_TAG = /<file\s+src="([^"]+)"\s*>\s*<\/file>/gi;
  const matches = [...content.matchAll(FILE_TAG)];
  if (!matches.length) return content;
  const results = await Promise.all(
    matches.map(async (m) => {
      const src = m[1];
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(String(res.status));
        return await res.text();
      } catch (e) {
        return `⚠ Не удалось загрузить ${src}`;
      }
    }),
  );
  let i = 0;
  return content.replace(FILE_TAG, () => results[i++]);
}

// ── LINKED NOTE/TIP POPUP — CASCADE CHAIN ──
// Opened by clicking a <note id="..."> or <tip id="..."> reference (see
// processNoteTags/processTipTags in markdown.js) — visually the same box as
// the startup notes popup (reuses its .notes-title-box/.notes-content/
// .note-author-line classes), but positioned and connected to the clicked
// word the same way chain-tip.js links its tip to a chain icon:
// getBoundingClientRect() of the trigger, flips side at the screen edge,
// elbow polyline connector. Notes (in-universe lore, notes.js) and tips
// (out-of-character clarifications, tips.js) share this exact same engine —
// see `kind` in openLinkPopup — they only differ in data source and a CSS
// color modifier (.note-link-popup--tip / .inline-tip-ref).
//
// A <note>/<tip> ref clicked INSIDE an already-open popup opens ANOTHER one
// cascading off it, rather than replacing it — clicking through popup 1's
// own text can open popup 2, then popup 3 inside THAT, and so on with no
// hard depth limit (these are cheap static boxes), and a note can cascade
// into a tip or vice versa freely. `chain` holds the currently open
// sequence root→leaf; each entry knows the trigger element it was opened
// from, so a NEW ref clicked at some depth replaces whatever was already
// open at that depth and below (its old descendants), while everything
// ABOVE that depth (its ancestors) is left untouched.
const GAP = 8; // px gap between the clicked word and the popup, matches chain-tip.js
const CASCADE_STEP_X = 160; // px each cascade level steps sideways off its parent — a staircase "tread" width, not a clearance distance (the vertical placement is what guarantees no overlap, see showNoteLinkPopup). Wide enough that the trigger word is usually OUTSIDE the new popup's own horizontal span, which is what lets the connector reach a side edge at header height without crossing the header — see the toX/toY comment below.

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
// z-index ABOVE .note-link-popup (10001 — see notes.css), not below it. A
// depth-2+ connector's line necessarily starts inside its own parent popup
// (that's where the trigger word lives), so if the overlay sat below the
// popups, each parent would paint over the start of its own child's line —
// confirmed by pixel-sampling a rendered frame: the line was completely
// absent exactly where it crossed the parent popup's body. Above every
// popup, the (thin, pointer-events:none) line simply draws over whatever
// it crosses, the same way a leader line in a diagram would. Also above
// #notes-popup's own 10000 — a <note> ref can live inside the startup
// notes popup itself, whose z-index otherwise beats everything here.
const arrowSvg = document.createElementNS(SVG_NS, 'svg');
arrowSvg.id = 'note-link-arrow-svg';
arrowSvg.style.cssText =
  'display:none;position:fixed;left:0;top:0;pointer-events:none;z-index:10002;overflow:visible;';
document.body.appendChild(arrowSvg);

// ordered root→leaf: chain[0] was opened from outside every popup (tree/
// tooltip content), chain[i>0] was opened by clicking a <note> ref inside
// chain[i-1].popup.
let chain = [];

// Bumped by every closeFrom(0) (hideNoteLinkPopup — tooltip closing,
// click-outside, resize, Escape) and by every openLinkPopup call. A
// <file src="..."> fetch takes real (if usually brief) wall-clock time —
// if the popup that requested it gets closed, or a different ref gets
// clicked, while the fetch is still in flight, the fetch's eventual
// resolution must NOT go on to build a popup nobody asked for anymore.
// Each openLinkPopup call captures the generation at entry and re-checks
// it after the await; a mismatch means it was superseded, and it bails.
let requestGen = 0;

// Which way each new cascade level steps from its parent (+1/-1 per axis),
// decided once when the root popup opens (see showNoteLinkPopup) from
// which half of the screen it landed in — so the chain always cascades
// toward the open side of the screen instead of off the edge the root is
// already hugging. Root on the left → cascade rightward; root on the
// right → cascade leftward; same idea for top/bottom.
let cascadeDirX = 1;
let cascadeDirY = 1;

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
  if (index === 0) requestGen++; // invalidate any in-flight fetch — see requestGen above
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

// kind: 'note' | 'tip' — picks the data source (SOURCES above) and a CSS
// modifier class on the popup itself (.note-link-popup--tip) so a tip's
// header reads as visually distinct from a note's, same distinction the
// inline ref span already makes via .inline-tip-ref.
async function openLinkPopup(triggerEl, kind, refId) {
  const myGen = ++requestGen;
  const hostIndex = hostIndexFor(triggerEl);
  const childIndex = hostIndex + 1;

  // re-clicking the exact word that's already open at this depth toggles
  // it (and everything cascaded under it) closed, instead of reopening.
  const existingChild = chain[childIndex];
  if (existingChild && existingChild.triggerEl === triggerEl) {
    closeFrom(childIndex);
    return;
  }

  const entry = SOURCES[kind].find((n) => n.id === refId);
  if (!entry) {
    // the span still renders as a normal styled/clickable ref (see
    // buildNoteRefSpan in markdown.js) even when its id doesn't resolve —
    // there's no way to tell at render time, since notes.js/tips.js are
    // just plain arrays with no id-existence check. Without this warning a
    // missing entry looks identical to "nothing happens on click", which
    // has been mistaken for a real bug before.
    console.warn(
      `[Древо] <${kind} id="${refId}"> не найден в ${kind === 'tip' ? 'tips.js' : 'notes.js'} — добавь запись с этим id`,
    );
    return;
  }

  // resolve any <file src="..."> before touching the DOM at all — the
  // OLD popup at this depth (if any) stays visible while this awaits,
  // rather than flashing empty, and a second click on the same trigger
  // word while a fetch is still in flight will hit the toggle-close
  // branch above on its own next call, not race this one.
  const resolvedContent = await resolveFileTags(entry.content || '');
  // superseded while the fetch was in flight (popup closed, or a
  // different ref clicked at/under this depth) — don't open a popup for a
  // request nobody's waiting on anymore.
  if (myGen !== requestGen) return;

  // clicking a *different* link at/under this depth replaces whatever was
  // cascaded from here — ancestors (0..hostIndex) are left alone.
  closeFrom(childIndex);

  // .note-link-popup's title-box defaults to var(--perk-accent-color) too
  // (notes.css), same as the trigger ref itself — matches whatever perk
  // tooltip is currently open automatically. If the trigger used
  // color="main" (.inline-ref--main, see markdown.js), force the popup to
  // the same fixed purple rather than the ambient perk color, so the popup
  // matches the ref that opened it either way.
  const forceMain = triggerEl.classList.contains('inline-ref--main');
  const popup = document.createElement('div');
  popup.className = forceMain
    ? 'note-link-popup note-link-popup--main'
    : 'note-link-popup';
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

  titleEl.textContent = entry.title || '';
  const authorLine = entry.author
    ? `<div class="note-author-line">${renderLevelMD(entry.author)}</div>`
    : '';
  contentEl.innerHTML = renderMD(resolvedContent) + authorLine;

  const r = triggerEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pw = popup.offsetWidth;
  const ph = popup.offsetHeight;

  let px, py;
  if (hostIndex < 0) {
    // root popup — positioned off the trigger word itself: left of it by
    // default, flips right if that'd go off-screen, same rule as
    // showChainTip() in chain-tip.js.
    px = r.left - pw - GAP;
    if (px < 4) px = r.right + GAP;
    if (px + pw > vw - 4) px = vw - pw - 4;

    py = r.top - ph / 2 + r.height / 2;
    if (py < 4) py = 4;
    if (py + ph > vh - 4) py = vh - ph - 4;

    // decide which way later cascade levels step from here: toward
    // whichever half of the screen this root landed in has more room, so
    // the chain grows into open space instead of off the edge the root is
    // already hugging.
    cascadeDirX = px + pw / 2 < vw / 2 ? 1 : -1;
    cascadeDirY = py + ph / 2 < vh / 2 ? 1 : -1;
  } else {
    // cascaded off a parent popup — a real staircase: this popup's Y-range
    // sits immediately adjacent to the parent's, touching with zero gap
    // (top = parent's bottom when stepping down, or bottom = parent's top
    // when stepping up), stepped sideways by a small fixed tread width so
    // it reads as connected stairs rather than a single vertical stack.
    // Direction (which way is "up the stairs") was decided once when the
    // root opened. Positioning off the parent's own rect, not the trigger
    // word — the word can be anywhere inside a wide parent, which isn't a
    // useful anchor for where the next step should go.
    //
    // Because each step only ever touches its immediate parent and every
    // step in a chain moves further in the same fixed direction, no two
    // steps anywhere in the chain can overlap — step N+2's Y-range starts
    // exactly where step N+1's ends, which already starts beyond step N's,
    // regardless of how much they share in X.
    const parentRect = chain[hostIndex].popup.getBoundingClientRect();
    px = parentRect.left + cascadeDirX * CASCADE_STEP_X;
    py =
      cascadeDirY > 0
        ? parentRect.top + parentRect.height // steps down, touching the parent's bottom edge
        : parentRect.top - ph; // steps up, touching the parent's top edge
    if (px < 4) px = 4;
    if (px + pw > vw - 4) px = vw - pw - 4;
    if (py < 4) py = 4;
    if (py + ph > vh - 4) py = vh - ph - 4;
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
  // Normally: bend to whichever side edge is nearer the word, at roughly
  // header height (py + 20) — this is the "arrow into the middle of the
  // header" look every other connector in the app uses, and it's safe
  // here because the word is beside the popup, so the segment approaches
  // from outside and only ever touches that one edge.
  //
  // But if the word's X falls INSIDE the new popup's own width — which
  // CASCADE_STEP_X being a small tread width makes possible — bending to
  // a side edge at header height would instead draw the horizontal
  // segment straight across the popup's own interior (through its header
  // text, in the worst case), since this overlay paints above every
  // popup and the segment's whole path would sit inside that popup's
  // rect. In that case go straight up/down instead, with NO horizontal
  // travel: touch the nearest actual Y-boundary directly above/below the
  // word. Nothing to cross if there's no horizontal segment to cross with.
  const insideSpanX = icX > px && icX < px + pw;
  const toX = insideSpanX ? icX : icX < px ? px : px + pw;
  const toY = insideSpanX
    ? icY < py
      ? py
      : icY > py + ph
        ? py + ph
        : py
    : py + 20;
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

  chain.push({ popup, connector, triggerEl, kind, refId });
}

export function showNoteLinkPopup(triggerEl, noteId) {
  openLinkPopup(triggerEl, 'note', noteId);
}

export function showTipPopup(triggerEl, tipId) {
  openLinkPopup(triggerEl, 'tip', tipId);
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
