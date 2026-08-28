# Древо — notes for Claude

This file is auto-loaded every session. Details live in `claude/` — read the
relevant file before touching the area it covers.

## Quick facts

- Dev server: `python .claude/nocache_server.py 8199` (never `file://` — ES
  modules need http). Launch via `preview_start({name: "static"})`. Custom
  server exists because stock `http.server`'s 1s `Last-Modified` granularity
  serves stale 304s during fast edits.
- No build step, vanilla JS/CSS, ES modules.
- `MOBILE_ADAPT` (mobile tab layout toggle) exists in **two** places that
  must be changed together by hand: `js/constants.js`'s `export const
  MOBILE_ADAPT` and a duplicate plain `var` in `index.html`'s early inline
  script. See `claude/mobile-layout.md`.

## Read before working in these areas

- **Any UI/DOM work, verification, or "is this actually rendering" doubt** →
  `claude/dev-workflow.md` (sandbox rAF/screenshot quirks, how to actually
  prove something painted).
- **Creating SVG elements in JS, or connector-line visuals** →
  `claude/gotchas.md`.
- **The UI zoom feature (`js/zoom.js`, +/− buttons)** →
  `claude/zoom-architecture.md`.
- **Mobile/tablet tab layout, `MOBILE_ADAPT`, anything touching `.col`
  visibility** → `claude/mobile-layout.md`.
- **`note-link-popup.js`'s cascading chain layout** →
  `claude/cascade-layout.md`.
- **Perk/ability lore, souls, memory, cloning, amuons** → `claude/lore.md`.
- **How this user gives feedback and expects iteration** →
  `claude/collaboration.md`.

These used to live only in Claude's local per-machine memory
(`~/.claude/projects/.../memory/`), which doesn't travel with the repo to
another computer — moved here instead so a fresh session on any machine has
the same context.
