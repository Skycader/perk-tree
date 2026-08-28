# `note-link-popup.js` cascade chain layout

When the user asked for cascading note-link popups to look like a
"staircase" (ступеньки), three geometries were tried before landing on the
right one:

1. Side-by-side, no overlap, small diagonal offset (42px/32px) — rejected:
   still overlapping for adjacent-but-not-touching windows at those small
   offsets against a 420px-wide popup.
2. Horizontal step = full parent width + gap, small vertical stagger
   (32px) — zero overlap, but rejected as "floating" — disconnected
   diagonal boxes, not a staircase.
3. **Correct**: vertical step = exact touch, zero gap (new popup's top =
   parent's bottom when stepping down, or vice versa) + a small horizontal
   step (`CASCADE_STEP_X`). Because each step's Y-range starts exactly
   where its parent's ends, and every step moves further in the same fixed
   direction, no two steps anywhere in the chain can ever overlap
   regardless of depth — while still reading as one continuous staircase
   (edges touch with no gap).

**The geometric trick**: keep ONE axis's offset at a value that exactly
cancels the previous window's size in that axis (`parent.height`, not a
fixed constant), while the OTHER axis's offset stays a small arbitrary
constant purely for the sideways lean. If this needs revisiting, don't
reach for "small offset on both axes" (recreates overlap) or "full
clearance on one axis, small stagger on the other" (recreates floating).

## Follow-up bugs once real content was tested

- **z-index**: `#notes-popup` (startup popup) is `z-index: 10000`, far
  above `.note-link-popup`'s old `700`/connector's `701`. A `<note>` ref
  living *inside* the startup popup opened a chain that rendered
  underneath it. Fixed by bumping `.note-link-popup` to `10001` and the
  connector overlay to `10002`.
- **Connector elbow disappearing**: the old "if the trigger word's X falls
  inside the new popup's own span, skip the bend, go straight up"
  fallback became the *common* case once the horizontal step shrank to
  70px. Existed only to avoid drawing under the popup's opaque
  background — moot after the z-index fix. Replaced with: always bend to
  whichever popup edge (left/right) is numerically closer to the
  trigger's X.
- **Line cutting through the new popup's own header text**: the
  always-bend fix still used a fixed `toY = py + 20` — fine when the
  trigger's X is outside the popup, but with a small staircase step the
  trigger is often *inside* the new popup's own X-span, so the horizontal
  segment sliced across the title text.
- **Overcorrection**: snapping `toY` to the nearest Y-boundary
  unconditionally fixed the text-slicing but broke the normal case too —
  for a cascaded child, `icY` is *always* outside its own Y-range by
  construction (the touching-staircase design), so the boundary-snap fired
  for essentially every connector, not just the X-overlap case, killing
  the "arrow into header middle" look everywhere.
- **Landed fix**: widened `CASCADE_STEP_X` from 70 to 160px (trigger is
  usually outside the new popup's own span now) and made the geometry
  conditional: **outside the span** → side edge + `py + 20` (header
  middle). **Inside the span** (now the minority) → straight vertical
  only, no horizontal segment, touching the nearest Y-boundary directly
  above/below the word (`toX = icX`) — no bend, but nothing to cut
  through either. This exact edge case was a judgment call (an
  `AskUserQuestion` went unanswered — see `collaboration.md`) — if flagged
  again, this is the remaining fallback to revisit.
