## 1. Refactor: shared perk-focus function

- [ ] 1.1 Extract the dim-overlay + glow-highlight body currently inlined in `js/main.js`'s `.inline-perk-ref` delegated click handler into an exported `focusPerkById(perkId)` function in `js/main.js`.
- [ ] 1.2 Update that same click handler to call `focusPerkById(rid)` instead of the inline body.
- [ ] 1.3 Update `js/tooltip.js`'s combo-square/combo-name click handler to import and call `focusPerkById` instead of its own duplicated copy of the same body.
- [ ] 1.4 Verify both existing call sites (inline `<perk>` refs, and combo rows inside an open tooltip) still scroll/highlight exactly as before.

## 2. Topbar trigger button

- [ ] 2.1 Add a magnifying-glass button to `index.html`'s `.tb-right`, between `.tb-app-version` and `.zoom-controls`, styled per the existing `.btn`/`.zoom-btn` conventions in `css/base.css`.
- [ ] 2.2 Wire its click to open the search modal.

## 3. Modal chrome

- [ ] 3.1 Add `#search-overlay`/`#search-modal` markup to `index.html`, mirroring `#license-overlay`/`#license-modal`'s structure (title "Поиск", × close control, top search input).
- [ ] 3.2 Add `css/search.css` (or extend an existing stylesheet) with overlay/modal styling following `css/license.css`'s conventions.
- [ ] 3.3 Implement open/close in a new `js/search-modal.js`: `.visible`/`.active` class toggling, body scroll lock, autofocus the input on open, close on × / Escape / backdrop click, matching `license-modal.js`'s mechanics.

## 4. Search index and filtering

- [ ] 4.1 In `js/search-modal.js`, build a flattened searchable-entry list from `CONFIG.skills[].perks[]` (abilities), `CONFIG.skillLevelDescriptions[hostId].combo[partnerId]` (combos), `notes` (`js/load-notes.js`), and `tips` (`configs/default/default.tips.js`) — lazily, once.
- [ ] 4.2 For each combo entry, derive its title via a leading `` /^==([^=\n]+)==/ `` match on `desc` (stripped of the markers), falling back to `Комбо: <partner name>` when absent.
- [ ] 4.3 Implement case-insensitive substring filtering across each entry type's designated fields (ability: name+description; combo: title+desc; note/tip: title+content).
- [ ] 4.4 Wire the search input to re-filter on every keystroke and reset pagination to page 1 on query change.

## 5. Result cards and pagination

- [ ] 5.1 Render ability/combo cards: colored category square (top-left) + title + description, with matched substrings wrapped in `<mark>` (escaping the rest of the text — not markdown-rendered).
- [ ] 5.2 Render note/wiki cards: same card shape without the colored square.
- [ ] 5.3 Paginate the combined, ordered result list at 10 cards per page with next/previous controls; disable/hide controls at the start/end of the result set.

## 6. Click-through behavior

- [ ] 6.1 Ability/combo card click: close the search modal, then call `focusPerkById` with the ability's own id (ability cards) or the combo's host perk id (combo cards).
- [ ] 6.2 Note card click: call `showNoteLinkPopup` (or the equivalent existing entry point) for that note's id, using the clicked card as the trigger element; do not close the search modal.
- [ ] 6.3 Wiki-article card click: call `showTipPopup` for that tip's id, using the clicked card as the trigger element; do not close the search modal.

## 7. Manual verification

- [ ] 7.1 In the running dev server, open search, confirm autofocus, confirm typing filters live across all four types, confirm highlighting appears on matched substrings.
- [ ] 7.2 Confirm pagination at 10/page, next/previous controls, and reset-to-page-1 on query change.
- [ ] 7.3 Confirm ability/combo clicks close search and land on the correct perk with the existing highlight effect; confirm combo clicks land on the host perk.
- [ ] 7.4 Confirm note/tip clicks open the correct existing popup UI without closing search, and that closing search afterward still works.
- [ ] 7.5 Confirm Escape, ×, and backdrop-click all close the modal and restore page scroll.
