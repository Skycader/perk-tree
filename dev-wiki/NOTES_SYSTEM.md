# Notes system — technical reference

How the "заметки" (notes.js) feature works, end to end: the startup tip popup, cross-linking between notes, and the cascading chain of linked popups. Written so a future read of just this file (without re-deriving from the code) is enough to safely change any part of it.

## Data source

`notes.js` (project root) exports a flat array:

```js
export const notes = [
  { id: 'angel-tears', title: '📜 Ангельские слёзы', content: '...', author: '— Записки неизвестного.' },
  ...
];
```

- `id` is looked up by both linking syntaxes below (`<note id>` and `[[id:...]]`). **IDs are not currently guaranteed unique** — `notes.find(n => n.id === id)` always resolves to the *first* match, so a duplicate id silently shadows every later entry with that id. Confirmed duplicates exist as of this writing (`ten-dushi`, `oskolok-dushi`, `khroniki-vlastitelya` — 2-3 entries each). Not code-enforced; if a note-link ever opens the "wrong" content, check for a duplicate id first.
- `title` already includes its own leading emoji (e.g. `'📜 Тень Души'`) — don't re-prefix it.
- `author` already includes its own em-dash prefix — don't re-prefix that either.
- `content` is markdown, rendered through the shared `renderMD` pipeline (see below) — it can itself contain links to *other* notes, which is what makes the popups cascade.

## Two ways to author a cross-link inside note/perk/etc. content

Both resolve to the exact same clickable element (`<span class="inline-note-ref" data-note-id="...">`) and both support markdown inside the label. Implemented in `js/markdown.js`.

**1. `<note>` tag:**
```
<note id="chelovecheskaya-dusha">**крохотных**</note>
```

**2. Wiki-link, by title:**
```
[[#📜 Тень души|тени]]
```
Looks up `notes` by `title` — exact `trim()` match first, falls back to case-insensitive (titles carry a leading emoji that's easy to mistype the case of). Degrades to plain label text (no link) if nothing matches.

**3. Wiki-link, by id:**
```
[[id:ten-dushi|тени]]
```

Pick whichever syntax is more convenient to write; there's no functional difference. The `[[...]]` form is generally easier to write inline (no need to remember the target's `id` if you only know the title).

### Why the two syntaxes are processed at different pipeline stages

`renderMD`/`renderLevelMD` in `markdown.js`:

```
raw text
  → processWikiLinkTags()   [[...]]  resolved BEFORE marked.parse()
  → marked.parse() / marked.parseInline()
  → processHighlightTags()  ==text==
  → processNoteTags()       <note id="...">...</note>  resolved AFTER marked
  → processPerkTags()
  → processSvgTags()
```

- `<note>` looks like real HTML, so `marked` already leaves it untouched (raw-HTML passthrough, same treatment as `<perk>`) — `processNoteTags` picks it up *after* `marked.parse()`, matching on the still-raw inner text.
- `[[...]]` is **not** valid CommonMark and isn't guaranteed to survive `marked`'s own link/reference parsing untouched (double brackets can collide with reference-link syntax) — so it's resolved to the same `<span>` markup *before* `marked` ever sees it, while it's still template text.
- Both funnel through a shared `buildNoteRefSpan(noteId, labelSource)` helper that does the inner `marked.parseInline()` call and produces the `<span>`.

### `.inline-note-ref` click wiring

Delegated document-level listener in `main.js` (mirrors the pre-existing `.inline-perk-ref` pattern):
```js
document.addEventListener('click', (e) => {
  const ref = e.target.closest('.inline-note-ref');
  if (!ref) return;
  showNoteLinkPopup(ref, ref.dataset.noteId);
});
```
`.inline-note-ref` styling (purple, hover) lives in `css/base.css`.

## Two separate popup UIs — don't conflate them

### A. Startup notes popup (`js/notes-popup.js`, `#notes-popup`)

Singleton, bottom-anchored. Shows one random note on page load (if `localStorage['showNotesOnStartup'] !== 'false'`), with prev/next cycling arrows and a close button. Populated *twice*:

1. **Early** — an inline `<script type="module" async>` near the top of `index.html`, deliberately importing only `notes.js` + `constants.js` (not `markdown.js`, to avoid dragging in `config.js` while the loading spinner is still up). Has its own tiny inline `md()` helper (marked.parseInline + `==→<mark>` regex only) — **does not support `<note>` or `[[...]]` links**. If you need note-links to work on the very first randomly-shown note, this is the file to extend (duplicate the same regex-resolution logic, or accept the current limitation until the user cycles to a different note via arrows, which re-renders through the real `renderMD`).
2. **Later** — `notes-popup.js`'s `renderNote()`, used for the initial render if the early script didn't run, and for every prev/next cycle. Uses the real `renderMD`, so `<note>`/`[[...]]` links work fine here.

Positioning (`applyRestPosition()`): always bottom-anchored, `top` recomputed on every open/switch so the box hugs the bottom by a constant gap (`NOTES.bottomGap`, `constants.js`) regardless of content height. Capped by `NOTES.topGap` from the top of the screen for pathologically long notes, beyond which `.notes-content` scrolls internally instead of the box growing off-screen. `z-index: 10000` (`notes.css`) — deliberately very high, since it's meant to sit above the whole app while visible.

The "author" line is rendered as the *last line inside* `.notes-content` (a `.note-author-line` div appended after the markdown-rendered body), not a separate footer element — same technique used by the linked-popup chain below.

### B. Linked note popup chain (`js/note-link-popup.js`, `.note-link-popup`)

Opened by clicking any `.inline-note-ref`. Not a singleton — clicking a link *inside* an already-open linked popup opens another one cascading off it, with no hard depth limit.

**Data model**: `chain` is a flat array, root→leaf. `chain[0]` was opened from *outside* every linked popup (a tooltip, the startup popup, sidebar text, wherever). `chain[i>0]` was opened by clicking a ref inside `chain[i-1].popup`. Each entry: `{ popup, connector, triggerEl, noteId }`.

- `hostIndexFor(el)` — which chain entry (if any) visually contains `el`, via `.popup.contains()`. Used to figure out what depth a newly-clicked ref belongs at.
- `closeFrom(index)` — splices `chain` from `index` to the end, removing each popup + its connector `<g>` from the DOM. Used both for closing (close button, Escape, click-outside — always `closeFrom(0)` via `hideNoteLinkPopup()`) and for clearing stale descendants before opening a replacement at some depth.
- Clicking a *different* ref at/under some depth replaces whatever was cascaded from there; clicking the *same* ref again toggles it (and its descendants) closed.

**Layout — "staircase", not free-floating cascade** (see `showNoteLinkPopup`):

- Root popup: positioned relative to the trigger word, chain-tip.js-style (left of the word, flips right at the screen edge).
- Every subsequent popup: positioned relative to its *parent's* rect, not the trigger word (the word can be anywhere inside a wide parent — not a useful anchor for the next box). Vertically, it sits *exactly touching* the parent — new popup's top = parent's bottom (stepping down) or new popup's bottom = parent's top (stepping up) — zero gap, zero overlap, and this stays true at any chain depth since each step only ever touches its immediate parent and every step moves further in the same fixed direction. Horizontally, it steps sideways by a small fixed tread width, `CASCADE_STEP_X` (160px).
- Direction (`cascadeDirX`/`cascadeDirY`, ±1 per axis) is decided *once*, when the root opens, from which screen quadrant it landed in — cascades toward the open half of the screen, away from whichever edge the root is hugging.
- This exact geometry (`touch on one axis + small step on the other`) is load-bearing — two other approaches (small offset on both axes; full clearance on one axis + small stagger on the other) were tried and explicitly rejected by the user for either still overlapping or looking like disconnected floating boxes. Don't casually change the offset formula — see the fuller account in Claude's own project memory if revisiting this.

**Connector line** (Г/L-shaped, one shared full-viewport `<svg id="note-link-arrow-svg">`, one `<g>` per chain entry):

- **Must** be built via `document.createElementNS('http://www.w3.org/2000/svg', ...)`, not `document.createElement`, for every element (`svg`, `g`, and anything set via `.innerHTML` on them) — `createElement('svg')` produces an HTML-namespaced element that silently never renders as vector graphics, even though every computed style looks correct. The tell, if this regresses: `element.getBBox is not a function`.
- z-index: connector `10002` > popups `10001` > startup popup `10000` > everything else. A `<note>` ref can live *inside* the startup popup itself, whose own z-index (10000) would otherwise beat a naively-lower value here.
- Endpoint logic is intentionally two-branch, not a single formula:
  - **Trigger word safely outside the new popup's own horizontal span** (the common case): bend to whichever side edge (left/right) is nearer, at roughly header height (`py + 20`) — reads as "arrow into the middle of the header," matching every other connector style in the app (`chain-tip.js`, `tooltip.js`, etc: gray `#50556a`, `stroke-width: 1.5`, `r="3"` circle, `dashIn` keyframe animation).
  - **Trigger word falls inside the new popup's own span** (possible because the horizontal tread is much narrower than the popup — rarer at 160px than it was at the original 70px, but not eliminated): bending to a side edge at header height would draw the horizontal segment straight across the popup's own interior — through its title text in the worst case, since the connector paints above every popup regardless of what's in its path. Falls back to a straight vertical touch (no horizontal segment) at the nearest actual Y-boundary (top or bottom edge) directly above/below the word — nothing to cut through if there's no horizontal segment at all. **This fallback's exact look has not been explicitly confirmed by the user** — if it gets flagged again, that's the open thread to revisit.
- `document.addEventListener('click', ...)` click-outside-closer: any click handler that removes its own popup from the DOM (the close button) **must** call `e.stopPropagation()`, or the same click keeps bubbling to this listener, which — seeing the now-detached `e.target` inside no remaining popup — misreads it as a click outside the whole chain and wipes ancestors that should have survived.

## Shared CSS

`css/notes.css` — `.notes-title-box`, `.notes-content`, `.note-author-line` are plain (non-ID-scoped) classes reused by *both* `#notes-popup` and `.note-link-popup`, which is what gives them identical typography/colors without duplicating rules. `.note-link-popup` and `#note-link-arrow-svg`'s z-indices are documented inline where they're set (see above).

## Quick file map

| File | Role |
|---|---|
| `notes.js` | Data: `{id, title, content, author}[]` |
| `js/markdown.js` | `processNoteTags`, `processWikiLinkTags`, `buildNoteRefSpan`, wired into `renderMD`/`renderLevelMD` |
| `js/notes-popup.js` | Startup tip popup — singleton, bottom-anchored, prev/next |
| `js/note-link-popup.js` | Cascading chain of linked popups opened from `.inline-note-ref` clicks |
| `js/main.js` | Delegated click listener wiring `.inline-note-ref` → `showNoteLinkPopup` |
| `js/tooltip.js` | Calls `hideNoteLinkPopup()` from `hideTooltip()` — a ref can live inside a perk tooltip, so closing the tooltip must close any chain it spawned |
| `css/notes.css` | Shared title-box/content/author styling + both popups' container rules |
| `css/base.css` | `.inline-note-ref` link styling |
| `index.html` | Early lightweight startup-note script (no `<note>`/`[[...]]` support — see above) |
