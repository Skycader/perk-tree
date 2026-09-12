## Context

`js/search-modal.js` (from the just-archived `add-search-filter-modal` change) already builds one flattened in-memory array of all searchable entries once, at module load (55 abilities + 41 combos + 92 notes + a few tips — call it `N`, comfortably under 200). `renderResults()` currently: returns `[]` from `filteredEntries()` on an empty query, slices the filtered array to `PAGE_SIZE = 10` starting at `_page * PAGE_SIZE`, and drives `#search-prev`/`#search-next`/`#search-counter` off that pagination state.

## Goals / Non-Goals

**Goals:**
- Opening the modal (or clearing the query) shows the full content set immediately, unfiltered.
- Drop pagination entirely — one scrollable list, no page state to keep in sync.
- Keep showing the user *how much* content matched/exists, since that's the actual motivation, not just removing a number.

**Non-Goals:**
- Virtual/windowed scrolling. `N` stays in the low hundreds even with future content growth of the same order — a plain `<div>` with `overflow-y: auto` renders that many simple cards without a measurable performance concern, so building a windowing layer would be solving a problem this app doesn't have. Revisit only if `N` grows by an order of magnitude.
- Any change to matching, card rendering, highlighting, or click-through behavior — untouched by this change.

## Decisions

### Empty query renders the full index, unhighlighted
`filteredEntries()` returns `_entries` as-is (not `[]`) when `_query` is empty, instead of a separate "browse mode" code path — filtering and browsing become the same rendering path with a no-op filter, which is also why `highlight(text, '')` already degrades to plain escaped text (it did before this change too, for the title of a query that matched only the title, say) — nothing new needed there.

### The pager row becomes a plain count, not a second UI element
Rather than adding a new counter element alongside the removed pager, `#search-counter` (already present, already wired) is repointed at `results.length` — "N результатов" — every time `renderResults()` runs. `#search-prev`/`#search-next` and their listeners are deleted outright rather than hidden, since there's no state left for them to control. This keeps the modal's footer row doing one job with no dead code standing in for a feature that no longer exists.

### No debounce added to the input handler
`filteredEntries()`'s work is a single `.filter()` pass over well under 200 plain objects, string-`.includes()` per field — this was already fast enough at 10-per-page; removing the slice doesn't change the filter cost, only how many of the (still cheap) card-render calls happen afterward per keystroke. Not worth the added complexity of a debounce for a list this size.

## Risks / Trade-offs

- Rendering the full list on every keystroke (rather than 10 items) means more DOM nodes created per render pass. At `N` in the low hundreds this is not expected to be perceptible, but it's the one change here worth confirming live in the browser (typing rapidly, and the initial browse-all render) rather than assuming from the entry count alone.
