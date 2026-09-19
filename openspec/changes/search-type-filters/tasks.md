## 1. Implementation

- [x] 1.1 Add the four-checkbox filter row (Перки / Комбо / Заметки / Вики, all `checked`) to `#search-modal` in `index.html`, between the input row and the results.
- [x] 1.2 Style the filter row in `css/search.css` (compact, matching the modal's dark theme and orange accent).
- [x] 1.3 In `js/search-modal.js`, add filter state and apply it in `filteredEntries()` (one flag per entry type); re-render on checkbox change.

## 2. Verification

- [x] 2.1 All checked by default → full list (counter matches previous total).
- [x] 2.2 Each checkbox hides exactly its kind; Заметки and Вики each hide only their own kind; counter updates.
- [x] 2.3 Filters combine with a typed query; last checked box is disabled with a hint, re-enabled when another is checked.
- [x] 2.4 Filters persist across close/reopen; no console errors.
