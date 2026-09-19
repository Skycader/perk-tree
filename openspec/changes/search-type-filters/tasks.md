## 1. Implementation

- [x] 1.1 Add the three-checkbox filter row (Перки / Комбо / Заметки, all `checked`) to `#search-modal` in `index.html`, between the input row and the results.
- [x] 1.2 Style the filter row in `css/search.css` (compact, matching the modal's dark theme and orange accent).
- [x] 1.3 In `js/search-modal.js`, add filter state and apply it in `filteredEntries()` (tips governed by the Заметки flag); re-render on checkbox change.

## 2. Verification

- [x] 2.1 All checked by default → full list (counter matches previous total).
- [x] 2.2 Each checkbox hides exactly its kind; Заметки hides notes and wiki articles; counter updates.
- [x] 2.3 Filters combine with a typed query; all unchecked → empty state, counter 0.
- [x] 2.4 Filters persist across close/reopen; no console errors.
