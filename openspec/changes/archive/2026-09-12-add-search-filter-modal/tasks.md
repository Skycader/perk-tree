## 1. Refactor: shared perk-focus function

- [x] 1.1 Create `js/perk-focus.js` exporting `focusPerkById(perkId)`, containing the dim-overlay + glow-highlight body currently duplicated in `js/main.js`'s `.inline-perk-ref` click handler and `js/tooltip.js`'s combo click handler (find perk, scroll, overlay, glow, cleanup — not the `hideTooltip()` call, which stays at each call site).
- [x] 1.2 Update `js/main.js`'s `.inline-perk-ref` click handler to call `hideTooltip(); focusPerkById(rid);` instead of the inline body.
- [x] 1.3 Update `js/tooltip.js`'s combo-square/combo-name click handler to import `focusPerkById` from `js/perk-focus.js` and call `hideTooltip(); focusPerkById(rid);` instead of its own duplicated copy of the same body.
- [x] 1.4 Verify both existing call sites (inline `<perk>` refs, and combo rows inside an open tooltip) still scroll/highlight exactly as before.

## 2. Topbar trigger button

- [x] 2.1 Add a magnifying-glass button to `index.html`'s `.tb-right`, between `.tb-app-version` and `.zoom-controls`, styled per the existing `.btn`/`.zoom-btn` conventions in `css/base.css`.
- [x] 2.2 Wire its click to open the search modal.

## 3. Modal chrome

- [x] 3.1 Add `#search-overlay`/`#search-modal` markup to `index.html`, mirroring `#license-overlay`/`#license-modal`'s structure (title "Поиск", × close control, top search input).
- [x] 3.2 Add `css/search.css` (or extend an existing stylesheet) with overlay/modal styling following `css/license.css`'s conventions.
- [x] 3.3 Implement open/close in a new `js/search-modal.js`: `.visible`/`.active` class toggling, body scroll lock, autofocus the input on open, close on × / Escape / backdrop click, matching `license-modal.js`'s mechanics.

## 4. Search index and filtering

- [x] 4.1 In `js/search-modal.js`, build a flattened searchable-entry list from `CONFIG.skills[].perks[]` (abilities), `CONFIG.skillLevelDescriptions[hostId].combo[partnerId]` (combos), `notes` (`js/load-notes.js`), and `tips` (`configs/default/default.tips.js`) — once, at module load.
- [x] 4.1a For each `tips` entry whose `content` is a `<file src="...">` reference, `fetch()` the referenced file and use its raw text as that entry's searchable/displayable text instead of the tag itself (same extraction regex as `resolveFileTags` in `js/note-link-popup.js`, independently applied — not a call into that function). Fall back to a short placeholder string on fetch failure. The modal's open handler awaits the index-build promise before running its first filter pass.
- [x] 4.2 For each combo entry, derive its title via a leading `` /^==([^=\n]+)==/ `` match on `desc` (stripped of the markers), falling back to `Комбо: <partner name>` when absent.
- [x] 4.3 Implement case-insensitive substring filtering across each entry type's designated fields (ability: name+description; combo: title+desc; note/tip: title+content).
- [x] 4.4 Wire the search input to re-filter on every keystroke and reset pagination to page 1 on query change.

## 5. Result cards and pagination

- [x] 5.1 Render ability/combo cards: colored category square (top-left) + title + description, with matched substrings wrapped in `<mark>` (escaping the rest of the text — not markdown-rendered).
- [x] 5.2 Render note/wiki cards: same card shape without the colored square.
- [x] 5.3 Paginate the combined, ordered result list at 10 cards per page with next/previous controls; disable/hide controls at the start/end of the result set.

## 6. Click-through behavior

- [x] 6.1 Ability/combo card click: close the search modal, then call `focusPerkById` with the ability's own id (ability cards) or the combo's host perk id (combo cards).
- [x] 6.2 Note card click: call `showNoteLinkPopup` (or the equivalent existing entry point) for that note's id, using the clicked card as the trigger element; do not close the search modal.
- [x] 6.3 Wiki-article card click: call `showTipPopup` for that tip's id, using the clicked card as the trigger element; do not close the search modal.

## 7. Manual verification

- [x] 7.1 In the running dev server, open search, confirm autofocus, confirm typing filters live across all four types, confirm highlighting appears on matched substrings.
- [x] 7.2 Confirm pagination at 10/page, next/previous controls, and reset-to-page-1 on query change.
- [x] 7.3 Confirm ability/combo clicks close search and land on the correct perk with the existing highlight effect; confirm combo clicks land on the host perk.
- [x] 7.4 Confirm note/tip clicks open the correct existing popup UI without closing search, and that closing search afterward still works.
- [x] 7.5 Confirm Escape, ×, and backdrop-click all close the modal and restore page scroll.
