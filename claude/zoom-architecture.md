# UI zoom architecture (`js/zoom.js`)

The user wanted a local, in-app zoom (topbar `−`/`+`, 5% steps, 50–200%,
persisted to `localStorage['uiZoomPercent']`) instead of relying on native
browser zoom (their prior workaround: manually setting 125%).

## Rejected: CSS `zoom` on `<html>`

Scales the whole rendered page as one compositor-level transform — visually
the closest to native zoom, but **breaks tooltip/connector positioning**.
Root cause: this app computes secondary-window layout (`.win-img`/
`.win-combo`/etc in `tooltip.js`'s `runLayout`) via hand-rolled JS pixel
arithmetic against `getBoundingClientRect()`, evaluated once at open time.
Native browser zoom is engine-level, so `getBoundingClientRect()`
transparently reports already-scaled values and the JS math never needs to
know zoom exists. CSS `zoom` retroactively rescales already-positioned
fixed/absolute elements' *rendering* after the JS math already ran,
desyncing the two.

## What it actually does: two parallel mechanisms, kept in sync by one % value

Both driven by `currentZoom` in `js/zoom.js`:

1. **CSS dimensions** — every `font-size`/`width`/`height`/`padding`/
   `margin`/`gap` px value across the CSS codebase is `rem` (÷16, matching
   `html { font-size: 16px }` in `base.css`, the 100% baseline). `zoom.js`
   scales `document.documentElement.style.fontSize` directly; every
   rem-based rule scales for free.
2. **JS-computed layout** — `tooltip.js`'s `runLayout` and `windows.js`'s
   `createWin()` use raw pixel constants from `constants.js`
   (`SLOT_COL_W=320`, `SLOT_COL_GAP=36`, `SLOT_ROW_GAP=16`,
   `MIN_SECONDARY_H=80`, `MAX_TOOLTIP_HEIGHT_PX=600`) that `rem` has zero
   effect on. `zoom.js` exports `scale(px)` / `getZoomScale()`;
   `tooltip.js` imports the base constants under `_BASE`-suffixed aliases
   and **shadows** them near the top of the relevant block with
   `const SLOT_COL_W = scale(SLOT_COL_W_BASE)` etc. — every bare
   downstream reference in that closure picks up the scaled value
   automatically, no need to wrap `scale()` at each individual use site.
   See `gotchas.md` for a case (the main tooltip's own `tw`/width literal)
   that was missed by this treatment and had to be fixed later.

**If extending this** (a new secondary-window kind, a new popup with its
own raw-px JS positioning math): the new constant needs the same `_BASE`
alias + `scale()` shadow treatment. CSS `rem` alone is not sufficient for
anything whose size/position comes from reading raw JS constants rather
than browser-laid-out CSS.

## Reflow on zoom change

An already-open tooltip/popup has its old-scale layout baked in; changing
zoom doesn't reflow it live. `zoom.js` dispatches
`window.dispatchEvent(new CustomEvent('ui-zoom-changed'))` on every
`applyZoom()` (not a direct import of `hideTooltip`/etc — those modules
import `scale()`/`getZoomScale()` FROM zoom.js, so a reverse import would
be circular). `main.js` listens and closes everything (same list as the
Escape handler), then also does `requestAnimationFrame(redrawAll)` so the
tree's own connector lines (`connectors.js`) recompute against the new
(reflowed) DOM — this was a separate bug fixed after the first version
shipped (arrows stayed misaligned after a zoom change until this was
added).

## Known gaps / lessons

- `tooltip.js`'s `runLayout()` triple-nested rAF gate makes secondary
  window positioning hard to verify in the sandboxed browser tool — see
  `dev-workflow.md`.
- When bulk-converting a CSS file px→rem, do it in **one pass covering
  ALL relevant properties** (font-size AND box dimensions together), not
  two separate passes. `css/sidebar.css` got only a font-size pass
  initially and was missed by the later width/height/padding pass,
  silently leaving its `.sidebar`/`.rtable`/`.badge` etc. non-scaling
  until a user noticed the ranks panel wasn't growing with zoom at all.
