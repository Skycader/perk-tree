## Why

The search modal (`content-search` capability) currently shows nothing until the user types, and splits results into pages of 10. With real content volume now known — 55 abilities, 41 combo-abilities, 92 notes, and a handful of wiki articles, all comfortably under 200 items total — pagination adds UI (page controls, "N / M" state) to protect against a scale this app doesn't have, and hiding everything behind an empty input hides the one thing the user actually wants search to show off: how much content already exists. Letting the modal show everything by default, in one scrollable list, serves both problems with less code, not more.

## What Changes

- **Browse-all on empty query**: opening the search modal (or clearing the input) now shows every ability, combo-ability, note, and wiki article, unfiltered — instead of an empty "start typing" state. Typing still filters this same list live, exactly as before.
- **Remove pagination**: the 10-per-page split and its next/previous controls are removed. All matching (or, with an empty query, all) entries render in one list inside the existing scrollable results container — no virtual/windowed scrolling either, since a few hundred simple cards is well within what a plain scrollable `<div>` handles without it.
- The now-empty pager row's counter is repurposed to show a running total ("N результатов") instead of a page position — this directly serves the "feel how much content exists" goal even while filtered, not just when browsing everything.
- No change to matching logic, card rendering, highlighting, or click-through behavior for any of the four content types — only how much of the result set is shown at once and what's shown for an empty query.

## Capabilities

### Modified Capabilities
- `content-search`: empty-query behavior changes from "show nothing" to "show everything"; the `Pagination` requirement is removed and replaced by a plain full-list requirement.

## Impact

- **`js/search-modal.js`**: `filteredEntries()` returns the full entry list when the query is empty instead of `[]`; `_page`/`PAGE_SIZE` pagination state, `renderResults()`'s slicing, and the prev/next click handlers are removed; the results container renders the complete list; the counter element now shows a total-count string instead of "page / total".
- **`index.html`**: `#search-prev`/`#search-next` buttons removed from the `#search-pager` row; `#search-counter` stays (relabelled by role, not by markup).
- **`css/search.css`**: `#search-pager`/`.notes-nav:disabled` rules for prev/next become unnecessary; `#search-results` keeps its existing `overflow-y: auto` (already sized for an arbitrary-length list, nothing to change there).
- No changes to `configs/*/*.config.js`, `default.notes.js`, `default.tips.js`, or the click-through/highlight/focus-jump behavior implemented in the previous change.
