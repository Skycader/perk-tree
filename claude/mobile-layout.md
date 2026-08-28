# Mobile/tablet tab layout

Below ~768px, instead of a squeezed responsive reflow, the 3 perk columns +
ranks sidebar + dangers block ("Опасности") collapse into **one section at
a time**, picked via a 5-tab bar (1-я / 2-я / 3-я / Ранги / Опасности).

## `MOBILE_ADAPT` toggle

`js/constants.js`'s `MOBILE_ADAPT` (mirrored — see `gotchas.md` — as a
plain `var` in `index.html`'s early inline script, **both must be edited
together**):
- `true` — narrow screens get the tab layout + `width=device-width`
  responsive viewport meta.
- `false` — forced-desktop everywhere, even on a phone: original
  `width=1920, user-scalable=yes, initial-scale=0.3` viewport meta, and
  `html.mobile-adapt` is never added to `<html>`, so **none** of
  `css/mobile.css`'s rules fire regardless of actual screen width.

The inline script sets the viewport `<meta id="viewport-meta">` and adds
`html.mobile-adapt` before any CSS/content loads (same FOUC-avoidance
reasoning as the zoom-restore script — see `zoom-architecture.md`).

## Pieces

- **`js/tree.js`** tags each generated `.col` with `data-col-idx="1"/"2"/"3"`
  (1-based) — consumed by the CSS to show only the active one.
- **`index.html`** has the tab bar markup (`#mobile-tabs`, 5
  `.mobile-tab-btn`s with `data-tab`) right after `.topbar`.
- **`css/mobile.css`** — everything nested under
  `@media (max-width: 768px) { html.mobile-adapt { ... } }`. Hides
  `.col`/`.sidebar`/`.bottom-bar` by default, reveals only the one matching
  `body[data-mobile-tab="..."]`. Also: hides `.tb-stats` and lets
  `.topbar`/`.tb-right` wrap (the un-adapted topbar's natural width
  overflows a phone — see "Horizontal overflow" below); hides
  `.altnames-box` and gives `.title-box` full width (side-by-side with
  altnames overflowed and, fighting for space, squeezed title-box's name
  into wrapping tall); stacks `.bb-items` vertically instead of the
  desktop row (cards were shrinking to slivers with truncated text).
- **`js/mobile-tabs.js`** — tracks the active tab as
  `document.body.dataset.mobileTab`, toggles `.active` on the buttons, and
  dispatches `window.dispatchEvent(new CustomEvent('mobile-tab-changed'))`
  on every switch.
- **`js/main.js`** listens for `mobile-tab-changed` and does
  `requestAnimationFrame(redrawAll)` — necessary because a newly-revealed
  `.col` was `display:none` (zero-size) the last time its connector lines
  were computed.

## Bugs already hit and fixed here (watch for the same class of bug elsewhere)

**`getBoundingClientRect()`/`offsetLeft`/`offsetWidth` on a `display:none`
element all read as 0.** Any positioning code that reads geometry from an
element without checking it's actually visible will silently compute
garbage `(0,0)`-based coordinates once that element can be hidden. Hit
this twice in `connectors.js`'s `drawTopBus()`:

1. It draws a line from `altnames-box`'s bottom-center to the "bus" — with
   `.altnames-box` hidden on mobile, this became a line from `(0,0)`,
   visible as a stray diagonal artifact near the title box.
2. It collects target X coordinates from **every** `.col`'s `.ch-hdr` via
   `querySelectorAll('.col')` — which finds all 3 columns regardless of
   CSS `display`, not just the visible one. The 2 hidden columns each fed
   a bogus `(0,0)` target into the bus line, producing a duplicate stray
   arrow pointing up-left of the title box.

**Fix pattern used both times**: check
`getComputedStyle(el).display !== 'none'` before including an element as a
geometry source, and skip/null it out entirely rather than computing with
its zero rect.

## Horizontal overflow

The topbar (`.tb-left` + `.tb-stats` + `.tb-right`, ~46px fixed height,
`flex` row, none of it wrapping) has a combined natural width well past a
phone's — this was the dominant remaining source of horizontal page
overflow after fixing the meta-row. Fixed by letting `.topbar`/`.tb-right`
wrap (`flex-wrap: wrap`, `height: auto`) and hiding `.tb-stats` (perk/level
counts — redundant with the tree itself) under the mobile media query.
`.mobile-tabs` is **not** `position: sticky` — its old sticky offset
assumed the topbar's fixed 46px height, which no longer holds once it can
wrap to 2+ lines.

**When adding new UI to the topbar or meta-row, re-check for horizontal
overflow at 375px width with `MOBILE_ADAPT=true`** — nothing in the
existing layout wraps by default, everything needs an explicit mobile
override.
