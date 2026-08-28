# Codebase gotchas

## `document.createElement('svg')` silently fails — use `createElementNS`

`document.createElement('svg')` creates the element in the HTML namespace,
not the SVG namespace. It never renders as vector graphics, and children
added via `.innerHTML` fail too — while every computed style (`display`,
`z-index`, `opacity`) looks completely correct, a nasty silent failure. The
tell: `element.getBBox is not a function` (only exists on real
`SVGGraphicsElement`s).

Every *static* `<svg>` in `index.html`'s own markup is auto-namespaced
correctly by the HTML parser, so this never bit anything until a connector
SVG was built dynamically in JS. **Any time a new SVG element is created
via JS in this project, use
`document.createElementNS('http://www.w3.org/2000/svg', 'svg')`.**

## Connector-line visual convention (app-wide)

Every Г/L-shaped connector line (word/icon → linked popup or tooltip) uses:
gray `#50556a`, `stroke-width: 1.5`, anchor circle `r="3"`, animated in via
the shared `dashIn` keyframe (`stroke-dasharray`/`stroke-dashoffset` set to
the path length, `animation: dashIn .3s ease forwards`). Don't deviate
(e.g. an accent color) unless explicitly asked — confirmed this is expected
by default.

## Click-outside self-removal bug pattern

If an element's own click handler removes an ancestor of itself from the
DOM (e.g. a popup's × button removing that popup), and a separate
`document`-level "click outside closes X" listener exists without stopping
propagation — the same click keeps bubbling *after* the removal. By then
`e.target` is detached from everything, the outside-check sees no match,
and treats it as a genuine outside click, closing far more than intended.

Hit this in `note-link-popup.js`'s cascade chain: closing a *middle* popup
via × wiped the entire chain, because the close handler's `chain.splice()`
ran first, then the bubbling click hit the document click-outside listener
and closed everything.

**Rule**: any handler that removes its own ancestor from the DOM on click
must call `e.stopPropagation()` if a document/window-level listener
elsewhere might reinterpret the bubbling, now-detached event. When adding a
new "click outside closes this" listener, check whether anything inside
that region can self-remove on click.

## `MOBILE_ADAPT` toggle lives in two places, must be hand-synced

`js/constants.js`'s `export const MOBILE_ADAPT` is the canonical value used
by the rest of the code, but `index.html` has a **duplicate** plain `var
MOBILE_ADAPT` in its early synchronous inline script — it can't `import`
from constants.js because that script must run before any CSS/content
loads (avoiding a flash of the wrong layout), and ES module imports defer
past that point. **Changing one without the other silently does nothing**
— this already happened once (user set it in constants.js, forgot
index.html, reported "I set false but nothing changed"). Always grep for
`MOBILE_ADAPT` and update both.

## Raw pixel constants need `scale()`, `rem` alone is not enough

Two different classes of "size" exist in this codebase, and the zoom
feature (`js/zoom.js`) only automatically covers one of them:

1. CSS dimensions (`rem`-based) — scale automatically via
   `document.documentElement.style.fontSize`. No JS needed per-property.
2. **Raw pixel literals inside JS** — anything like `const tw = 340;` or a
   constant imported from `constants.js` (`SLOT_COL_W`, etc.) used in
   hand-rolled position/size math. `rem` conversion in CSS does **not**
   touch these — they must be wrapped in `scale(...)` (imported from
   `js/zoom.js`) explicitly, or they silently desync from the real
   (rem-scaled) CSS box the moment zoom ≠ 100%.

Concrete instance of this bug: `tooltip.js`'s `showTooltip()` had
`const tw = 340` (the main tooltip's width, matching `.tooltip`'s
`21.25rem` in CSS) completely unscaled. At 125% zoom the real rendered
width became 425px while the positioning/arrow math still assumed 340,
so the tooltip rendered ~85px wider than the code thought — enough to
visually overrun the clicked icon/tree column it's supposed to clear.
Fixed by `const tw = scale(340)`. The identical bug existed a second time
in the spectre cascade tooltip's own `tw`/gap literals. **When adding any
new raw-px layout constant to a hand-positioned popup/window, wrap it in
`scale()` from the start** — see `zoom-architecture.md` for the full
constant-shadowing pattern used for the bigger layout constants.
