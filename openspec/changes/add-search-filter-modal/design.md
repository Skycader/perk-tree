## Context

Four separate data sources need to feed one result list:
- `CONFIG.skills[].perks[]` (abilities) — `CONFIG` from `js/load-config.js`. Category color comes the same way `js/tree.js` already resolves it (chapter `color` field / `ic-${c}` class → `COL_HEX`/`ICON_HEX` in `js/constants.js`).
- `CONFIG.skillLevelDescriptions[hostId].combo[partnerId]` (combos) — keyed by host perk id, one entry per partner.
- `notes` from `js/load-notes.js` (`{id, title, content, author}[]`).
- `tips` from `configs/default/default.tips.js` directly (same shape as notes; every current entry's `content` is a `<file src="wiki/...">` tag, not inline text — see below).

The app's one existing full-modal precedent is `js/license-modal.js` + `css/license.css`: `.visible`/`.active` class toggling on an overlay + a centered box, `document.body.style.overflow = 'hidden'` while open. The new search modal follows the same mechanics rather than inventing a second modal pattern.

The existing perk-focus effect (dim overlay + glow) lives inline inside a delegated `document.addEventListener('click', ...)` handler in `js/main.js`, matching `.inline-perk-ref` elements by `closest()` and reading `data-rid`/`data-hex` off them. It is duplicated a second time (with the same body) in `js/tooltip.js` for combo-square clicks. Neither copy is an exported function today.

## Goals / Non-Goals

**Goals:**
- One search entry point covering all four content types, reusing each type's existing detail-display UI rather than building a new one.
- No changes to data files or to the existing note/tip popup or perk-focus behavior's own contracts.

**Non-Goals:**
- Fuzzy/ranked search, multi-word AND/OR logic, or highlighting across word boundaries smarter than plain substring matching — this is filtering by substring, per the proposal.
- Searching per-level ability text (`skillLevelDescriptions[id]["1"]`..`["N"]`) — explicitly excluded per the user's own scoping.
- A generic "reusable modal" abstraction — one new modal, following the license modal's existing pattern directly, is enough; extracting a shared base is not needed for two instances.

## Decisions

### Reuse the focus-jump effect via factoring it into an exported function
Rather than duplicating the dim+glow highlight code a third time inside `search-modal.js`, extract the shared body (currently inline in both `js/main.js`'s `.inline-perk-ref` click handler and `js/tooltip.js`'s combo-square click handler) into one exported `focusPerkById(perkId)`. This was chosen over dispatching a synthetic click on a throwaway `.inline-perk-ref` element (which would work, but leaves a fake DOM node and an indirect call path just to reach code that has no reason not to be a normal function).

It lives in a **new, neutral module `js/perk-focus.js`** (importing only `resolvePerkInline` from `js/markdown.js` and `FOCUS_DIM` from `js/constants.js` — both leaf modules with no dependency on `main.js` or `tooltip.js`), not inside `js/main.js` as first sketched: `js/tooltip.js` needs to call it too, and `js/main.js` already imports `hideTooltip` from `js/tooltip.js` — putting the shared function in `main.js` would make `tooltip.js` import back from `main.js`, a circular module dependency that doesn't exist anywhere else in this codebase today. `focusPerkById` itself does not call `hideTooltip` — that one-line call stays at each existing call site (each already has its own direct reference to it: `main.js` via import, `tooltip.js` locally), and the new `search-modal.js` call site adds its own. Only the actual duplicated logic (find perk, scroll, dim overlay, glow, cleanup) is centralized.

### Combo card title extraction
A combo's display name is derived by matching a leading `` /^==([^=\n]+)==/ `` against its `desc` (mirroring the `==text==` → `<mark>` convention `js/markdown.js` already parses elsewhere, but applied only to a *leading* match here, since `==...==` also appears mid-sentence for unrelated emphasis and is not always a title). When no leading marker is present, the fallback title is generated as `Комбо: <partner perk name>` — enough to identify the entry without inventing lore-sounding fake names.

### Combo card click target = host perk
A combo entry only renders inside its **host** perk's tooltip (`_comboPerkId` in `js/tooltip.js`, set from whichever perk's icon was clicked) — the partner perk's tooltip never shows it independently. So "identical to ability click behavior" (closing search + focusing one perk) is only well-defined if there's one perk to land on, and the host is the one place in the tree that actually contains this combo section. (Note: this differs from the *in-tooltip* combo-row click, which jumps to the *partner* perk — that makes sense there because the host's tooltip, with the combo row, is already open on screen. From cold search, jumping to the host is what actually shows the user the combo.)

### Note/wiki click keeps the search modal open
`showNoteLinkPopup`/`showTipPopup` (`js/note-link-popup.js`) already render at `z-index: 10001`/`10000`+, above every other popup layer including a new search modal (planned around the same z-index range as `#license-modal`'s 601, well below that). So the linked popup naturally appears on top without the search modal needing to close itself first — matching how these popups already stack when opened from inside another popup (the existing cascade system). This keeps the search results in place so the user can open several notes/articles from one query without re-searching.

### Search index built once at module load, not kept live
The four source arrays (`CONFIG.skills`, `CONFIG.skillLevelDescriptions`, `notes`, `tips`) are static for the lifetime of a page load (no runtime editing UI exists), so the flattened searchable-entry list is built once, at module load, rather than re-derived on every keystroke — only the substring filter and pagination re-run as the user types.

### Wiki-article ("tip") text is fetched, not read from `tips.js` as-is
Every current entry in `configs/default/default.tips.js` stores its body as `<file src="wiki/tips/....md"></file>`, not inline text (see `js/note-link-popup.js`'s `resolveFileTags`, the existing runtime resolver for this tag when a tip popup actually opens). Indexing the raw `content` string as written would mean the "content" match requirement (spec: "Matching is performed against the entry's title and content") only ever matches the literal tag text, never the real article body — for every current wiki article. Confirmed with the user this gap is worth closing rather than shipping silently.

`search-modal.js` therefore extracts `<file src="...">` references with the same regex `resolveFileTags` already uses (`/<file\s+src="([^"]+)"\s*>\s*<\/file>/gi`) and `fetch()`s each referenced file directly, using the raw fetched text as that entry's searchable/displayable text — this is a second, independent resolution of the same tag, not a call into `resolveFileTags` itself, since that function is coupled to the popup-open flow (async Obsidian-embed conversion, in-flight-request cancellation via a generation counter) that search-index building doesn't need; a failed fetch falls back to a short placeholder string so one broken link can't break building the rest of the index. Index-building kicks off once, immediately, when `search-modal.js` loads (fetching a handful of small local files takes well under the time it takes a user to notice and click the search button), and the modal's open handler awaits that one shared promise before running its first filter pass.

### Highlighting reuses `<mark>`, not a new highlight mechanism
The visual highlight for a matched substring is implemented by wrapping it in `<mark>` when building each card's description/content HTML (escaping the surrounding text, since this content is not markdown-rendered inside the card — descriptions/content here are shown as plain highlighted text, not passed through `renderMD`, keeping cards fast to render and avoiding double-processing content that will be markdown-rendered again if/when opened in its real popup). `.notes-content` and card-local CSS already define `<mark>`-compatible dark-theme styling conventions to follow (see `css/notes.css`).

## Risks / Trade-offs

- Factoring `focusPerkById` out of `js/main.js`/`js/tooltip.js` touches two existing, working click handlers. Risk is mitigated by keeping the extracted function's behavior byte-for-byte identical to the current inline code — this is a pure refactor of that one piece, not a behavior change, and both existing call sites keep working exactly as before.
- Rendering plain (non-markdown) text in cards means a description containing inline `<perk>`/`<note>` markup will show that raw markup as text in the card preview. Accepted trade-off: the card is a preview, not the real detail view — clicking through still opens the real, fully-rendered popup or focuses the real perk.
