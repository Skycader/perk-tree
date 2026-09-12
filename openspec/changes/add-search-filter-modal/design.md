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
Rather than duplicating the dim+glow highlight code a third time inside `search-modal.js`, extract the shared body (currently inline in both `js/main.js`'s `.inline-perk-ref` click handler and `js/tooltip.js`'s combo-square click handler) into one exported function, e.g. `focusPerkById(perkId)` in `js/main.js`, and have both existing call sites and the new search-result click handler call it. This was chosen over dispatching a synthetic click on a throwaway `.inline-perk-ref` element (which would work, but leaves a fake DOM node and an indirect call path just to reach code that has no reason not to be a normal function).

### Combo card title extraction
A combo's display name is derived by matching a leading `` /^==([^=\n]+)==/ `` against its `desc` (mirroring the `==text==` → `<mark>` convention `js/markdown.js` already parses elsewhere, but applied only to a *leading* match here, since `==...==` also appears mid-sentence for unrelated emphasis and is not always a title). When no leading marker is present, the fallback title is generated as `Комбо: <partner perk name>` — enough to identify the entry without inventing lore-sounding fake names.

### Combo card click target = host perk
A combo entry only renders inside its **host** perk's tooltip (`_comboPerkId` in `js/tooltip.js`, set from whichever perk's icon was clicked) — the partner perk's tooltip never shows it independently. So "identical to ability click behavior" (closing search + focusing one perk) is only well-defined if there's one perk to land on, and the host is the one place in the tree that actually contains this combo section. (Note: this differs from the *in-tooltip* combo-row click, which jumps to the *partner* perk — that makes sense there because the host's tooltip, with the combo row, is already open on screen. From cold search, jumping to the host is what actually shows the user the combo.)

### Note/wiki click keeps the search modal open
`showNoteLinkPopup`/`showTipPopup` (`js/note-link-popup.js`) already render at `z-index: 10001`/`10000`+, above every other popup layer including a new search modal (planned around the same z-index range as `#license-modal`'s 601, well below that). So the linked popup naturally appears on top without the search modal needing to close itself first — matching how these popups already stack when opened from inside another popup (the existing cascade system). This keeps the search results in place so the user can open several notes/articles from one query without re-searching.

### Search index rebuilt on modal open, not kept live
The four source arrays (`CONFIG.skills`, `CONFIG.skillLevelDescriptions`, `notes`, `tips`) are static for the lifetime of a page load (no runtime editing UI exists), so the flattened searchable-entry list is built once, lazily, the first time the modal opens (or once at module load) rather than re-derived on every keystroke — only the substring filter and pagination re-run as the user types.

### Highlighting reuses `<mark>`, not a new highlight mechanism
The visual highlight for a matched substring is implemented by wrapping it in `<mark>` when building each card's description/content HTML (escaping the surrounding text, since this content is not markdown-rendered inside the card — descriptions/content here are shown as plain highlighted text, not passed through `renderMD`, keeping cards fast to render and avoiding double-processing content that will be markdown-rendered again if/when opened in its real popup). `.notes-content` and card-local CSS already define `<mark>`-compatible dark-theme styling conventions to follow (see `css/notes.css`).

## Risks / Trade-offs

- Factoring `focusPerkById` out of `js/main.js`/`js/tooltip.js` touches two existing, working click handlers. Risk is mitigated by keeping the extracted function's behavior byte-for-byte identical to the current inline code — this is a pure refactor of that one piece, not a behavior change, and both existing call sites keep working exactly as before.
- Rendering plain (non-markdown) text in cards means a description containing inline `<perk>`/`<note>` markup will show that raw markup as text in the card preview. Accepted trade-off: the card is a preview, not the real detail view — clicking through still opens the real, fully-rendered popup or focuses the real perk.
