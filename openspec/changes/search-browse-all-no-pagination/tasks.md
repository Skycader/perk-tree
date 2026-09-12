## 1. Browse-all on empty query

- [x] 1.1 In `js/search-modal.js`, change `filteredEntries()` to return the full `_entries` array (unfiltered) when `_query` is empty, instead of `[]`.
- [x] 1.2 Update `renderResults()`'s empty-state branch: an empty query no longer shows the "Начните вводить запрос…" placeholder — it renders cards for the full entry list, same as a filtered result.

## 2. Remove pagination

- [x] 2.1 In `js/search-modal.js`, remove `PAGE_SIZE`, `_page` state, the slicing in `renderResults()`, and the `searchPrev`/`searchNext` click handlers.
- [x] 2.2 Render every entry in `results` directly into `#search-results` (still one scrollable container, no slicing).
- [x] 2.3 In `index.html`, remove the `#search-prev`/`#search-next` buttons from `#search-pager` (or remove `#search-pager` and keep `#search-counter` on its own — whichever leaves the cleanest markup); keep `#search-counter`. (Renamed `#search-pager` → `#search-footer` since it's no longer a pager.)
- [x] 2.4 In `css/search.css`, remove the now-unused `#search-pager .notes-nav:disabled` rule (and any other pager-only styling that no longer applies once the buttons are gone).

## 3. Result count display

- [x] 3.1 In `renderResults()`, set `#search-counter`'s text to a total-count string (e.g. "N результатов", with correct Russian plural forms) reflecting `results.length`, replacing the old "page / total" text — updates on every keystroke, and reflects the full entry count when the query is empty.

## 4. Manual verification

- [x] 4.1 In the running dev server, open search with an empty query and confirm all abilities/combos/notes/wiki-articles render immediately, unhighlighted, with the results list scrolling normally (no page controls anywhere).
- [x] 4.2 Confirm the counter shows the full entry count on open, and updates live to the filtered count as a query is typed and cleared again.
- [x] 4.3 Confirm no next/previous controls remain in the DOM or CSS, and no console errors appear while typing quickly or scrolling the full unfiltered list.
- [x] 4.4 Confirm all four card types' click-through behavior (focus-jump for abilities/combos, popup-open for notes/tips) still works unchanged against the browse-all list, not just filtered results.
