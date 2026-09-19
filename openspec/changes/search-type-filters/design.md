## Context

`filteredEntries()` in `js/search-modal.js` already returns either the full `_entries` (empty query) or a substring-filtered subset. Every entry has a `type`: `ability | combo | note | tip`.

## Decisions

- **Filter map, not four flags.** `_filters = { ability, combo, note }`; `tip` entries are looked up through the `note` flag (`TYPE_TO_FILTER`). One place to change if a separate wiki checkbox is wanted later.
- **Applied inside `filteredEntries()`,** before the substring match, so browse-all, filtered results, and the counter all stay consistent with no extra code paths.
- **State lives in a module variable, not reset on open** (unlike the query): the filters are a preference for what the user is looking for, and reopening search shouldn't silently re-enable what they turned off. Not persisted to storage — not asked for.
- **Re-render on `change`** of any checkbox via the existing `renderResults()`.
- Checkboxes are `<input type=checkbox>`, so the `F` shortcut's existing "focus is in a text-entry element" guard already ignores keystrokes while one is focused (checkboxes count as `INPUT`) — harmless, since the modal is open then anyway.
