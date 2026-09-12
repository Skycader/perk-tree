## Why

The tree has grown to the point where finding a specific ability, combo, note, or wiki article means scrolling and scanning by eye — there's no way to jump straight to something by name or by a word in its text. A single search entry point that filters across all four content types (abilities, combo-abilities, unknown's notes, wiki articles) and reuses each type's existing detail UI removes that friction without introducing a second, parallel content-display system.

## What Changes

- Add a magnifying-glass ("lupa") button to the topbar, between `.tb-app-version` (the "0.9" label) and `.zoom-controls`, matching the visual style of the existing `.btn`/`.zoom-btn` controls.
- Clicking it opens a modal ("Поиск") built on the same overlay + centered-box pattern as `js/license-modal.js`/`css/license.css` (the app's one existing full-modal precedent): dimmed backdrop, body-scroll lock, closable via an X in the top-right, closable via Escape/backdrop click for consistency with the rest of the app's popups.
- The modal's only input is a single autofocused search box at the top. This is filtering, not full-text search: as the user types, results are recomputed and shown live, matching on case-insensitive substring.
- Four content types are searched together, each rendered as a rectangular card:
  1. **Abilities** (`CONFIG.skills[].perks[]`): card shows a colored square (category color, same palette as the tree's perk icons) and the perk's name/description; matches on `name` + `description` only (not per-level `skillLevelDescriptions` text).
  2. **Combo-abilities** (`CONFIG.skillLevelDescriptions[hostId].combo[partnerId]`): same card shape as abilities, using the combo's own color square; title is the combo's own name (a leading `==Name==` marker in its `desc`, stripped of the markers) falling back to a generated label when no such marker is present; matches on that title + the combo `desc` text.
  3. **Unknown's notes** (`configs/default/default.notes.js` entries): card is the same rectangle shape as ability cards but with no color square, since notes have no category; matches on `title` + `content`.
  4. **Wiki articles** (`configs/default/default.tips.js` entries): same shape as notes; matches on `title` + `content`.
  - In every card, the word(s) that matched inside the description/content are visually highlighted.
- Results are paginated 10 cards at a time with next/previous controls, rather than scrolling one long list.
- Clicking an ability or combo card closes the search modal, scrolls the tree to the corresponding perk, and re-uses the existing `<perk>`-inline-ref focus effect (dim overlay + glow highlight around the target `.perk` element) already wired up in `js/main.js`. For a combo card, the target is the host perk (the one whose tooltip actually displays that combo entry), since that's the single perk this combo lives on in the tree.
- Clicking a note or wiki-article card opens that entry's existing linked-popup UI (`showNoteLinkPopup`/`showTipPopup` from `js/note-link-popup.js`) — the identical popup already used everywhere else in the app for these two content types. The search modal itself stays open behind it (the linked popup already renders at a higher z-index than every other popup layer in the app), so the user can pick another result without re-opening search.

## Capabilities

### New Capabilities
- `content-search`: the search/filter modal itself — trigger button, open/close/modal chrome, live substring filtering across abilities/combos/notes/wiki-articles, per-type card rendering and match highlighting, pagination, and per-type click-through behavior.

### Modified Capabilities
(none — this reuses existing focus-jump and note/tip popup behavior as-is, without changing their contracts)

## Impact

- **`index.html`**: new lupa button in `.tb-right`, new modal + overlay markup (mirroring `#license-modal`/`#license-overlay`'s structure).
- **New `js/search-modal.js`**: owns the modal's open/close, the live filter/pagination logic, and building the four card types from `CONFIG` (via `js/load-config.js`), `notes` (via `js/load-notes.js`), and `tips` (`configs/default/default.tips.js`).
- **New `css/search.css`** (or an addition to an existing stylesheet): modal chrome (reusing `css/license.css`'s conventions) plus the result-card and highlight styling.
- **`js/main.js`**: the click-to-focus logic currently inlined in the `.inline-perk-ref` delegated click handler needs to be reachable from `search-modal.js` too — either by triggering it through the same delegated listener (a synthetic click on a matching element) or by factoring it out into an exported function; the concrete approach is a design decision, not a proposal-level one.
- No changes to `configs/default/default.config.js`, `default.notes.js`, `default.tips.js`, or any data files — this only adds a new way to find and jump to existing content.
