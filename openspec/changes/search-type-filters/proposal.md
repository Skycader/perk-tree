## Why

The search list mixes ~190 entries of four kinds. When looking only for, say, a combo, the user has to scan past abilities and notes that happen to match the same word. Type checkboxes let them narrow the list to what they're after.

## What Changes

- A row of three checkboxes under the search input: **Перки**, **Комбо**, **Заметки**. All checked by default.
- Unchecking one hides that kind from the list (browse-all and filtered alike); the result counter reflects only what's shown.
- **Заметки** covers both unknown's notes and wiki articles (no separate wiki checkbox — the user listed three).
- Filter state persists while the page is open (reopening search keeps it); it is not saved across reloads.

## Capabilities

### Modified Capabilities
- `content-search`: adds type filtering to the results list.

## Impact

- `index.html`: filter row markup in `#search-modal`.
- `js/search-modal.js`: filter state + type check in `filteredEntries()`.
- `css/search.css`: filter row styling.
