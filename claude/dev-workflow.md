# Dev workflow & verification quirks

## Running the app

`.claude/launch.json` → `python .claude/nocache_server.py 8199`. Never open
via `file://` — ES modules require http. The custom server exists because
Python's stock `http.server` sends `Cache-Control` based on 1-second
`Last-Modified` granularity, which serves stale 304s during rapid file
edits; `nocache_server.py` sends `Cache-Control: no-store` instead. Always
`preview_start({name: "static"})`, port 8199 — don't reach for python's
default server.

## Sandboxed browser tool quirks (Claude Code's preview browser specifically)

The sandboxed preview browser sometimes reports `document.hidden === true`,
which **throttles** (does not fully block) `requestAnimationFrame` — a
single rAF callback eventually fires, but only after a real-world delay of
roughly 1–3+ seconds (background-tab throttling), not on the next paint.
Don't conclude "it never fires" from checking immediately after the
triggering action — wait several seconds (`sleep 3` via Bash, or repeated
`computer{action:"wait"}`) before re-checking.

`tooltip.js`'s `runLayout()` uses a **triple-nested** rAF gate, a harder
case — treat single-rAF and multi-nested-rAF code paths as having different
reliability here; the nested case may need a much longer wait, or you may
need to fall back to inspecting underlying values (e.g. inline
`style.width`) rather than requiring full visibility.

`computer{action:"screenshot"}` is flaky in this environment — frequent 30s
timeouts, `UnknownVizError`, or a silently blank capture despite a correct
live DOM. Don't gate correctness-relevant logic on rAF timing when it's
easy to avoid (compute positions synchronously instead where possible).

## DOM/computed-style checks are necessary but NOT sufficient proof of paint

A real bug slipped through this exact style of check twice:
- Every computed style (`display`, `opacity`, `z-index`, geometry) was
  correct yet nothing rendered — root cause was creating an SVG via
  `document.createElement('svg')` instead of `createElementNS` (see
  `gotchas.md`).
- A connector line had perfect coordinates/styles but was silently
  painted-over by a sibling with a higher z-index that the style check
  never compared against.

When a visual claim needs real proof and `computer{screenshot}` is
unavailable/flaky: dynamically load `libs/html2canvas.min.js` (already
vendored, normally lazy-loaded by `export-png.js`), render the region with
`html2canvas(document.documentElement, {x,y,width,height,backgroundColor:null})`,
and sample actual pixel colors with `ctx.getImageData()`.

**Diff, don't just compare to an expected color.** Against a busy backdrop
a thin anti-aliased line blends into whatever's underneath, reading as "no
match" even when it's genuinely there. Robust version: sample the target
coordinates once with the element visible, again with it
`style.display='none'`, and diff — if the pixel changed, that element is
provably contributing to the render, regardless of what color it blended
into.

Caveat: `html2canvas` does **not** properly capture CSS keyframe animations
(e.g. the app-wide `dashIn` stroke-dasharray draw-in — see `gotchas.md`) —
it can render the pre-animation state (fully offset, i.e. invisible),
making a genuinely-fine element look absent. Don't trust a pixel-diff
"nothing changed" result for an animated connector line without accounting
for this.

## A cheap alternative to pixel-sampling: `window.dbl(true)` (`js/debug.js`)

Call in console (or via `javascript_exec`) with the relevant tooltip/window
open. Logs a JSON snapshot (tooltip rect, every visible `win-*` box's rect,
every connector's line/circle coordinates) **and**, with `true`, draws
colored ring/line overlays at z-index `999999` (above everything in the
app) directly on the page — the fastest way to see whether a connector's
actual coordinates land somewhere sane without fighting screenshot
flakiness.

## Forcing synchronous rAF for testing (use sparingly)

```js
window.requestAnimationFrame = function (cb) { cb(performance.now()); return 0; };
```
Monkey-patching this before clicking a perk can push `runLayout()` further
than waiting alone, though it doesn't always get every secondary window
past `display:none` — some kinds (EXTRA/TIP/AUDIO/COMBO) still depend on
this specific perk's data actually having that content, not just on rAF
timing.
