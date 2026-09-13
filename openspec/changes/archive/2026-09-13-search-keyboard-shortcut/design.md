## Context

`js/search-modal.js` already exports `showSearchModal()`, which resets the query, clears the input, renders, and calls `searchInput.focus()` — exactly what a keyboard shortcut needs, no new open logic required. The app's existing keydown listeners (`js/notes-popup.js`'s arrow-key nav, `js/main.js`'s Escape handler) are all plain `window.addEventListener('keydown', ...)` with an early-return guard, not a shared shortcut-registry — a new listener follows that same pattern rather than introducing a new abstraction for one shortcut.

## Goals / Non-Goals

**Goals:**
- `F` opens search from anywhere, without interfering with normal typing.

**Non-Goals:**
- A general keyboard-shortcut system/registry — one shortcut doesn't justify one.
- Any other shortcut (e.g. a dedicated close key beyond the existing Escape) — out of scope for this change.

## Decisions

### Guard by focused element, not by "search modal is closed"
The listener checks whether `document.activeElement` is a text-entry element (`INPUT`, `TEXTAREA`, or `isContentEditable`) and bails if so — not whether the search modal itself is already open. This matters because other text inputs exist in the app outside the search modal (e.g. nothing currently persists user text elsewhere, but the guard should hold even if one is added later) and because a user could conceivably focus something else while search is open; checking the modal's own visibility would miss the real hazard (typing "f" into a focused field) while this guard covers it directly and cheaply.

### `preventDefault()` is required, on the *triggering* event
Reasoning at first was "no default action to suppress, the element that had focus wasn't a form control" — true, but beside the point: `showSearchModal()` moves focus to `searchInput` as a side effect of handling this same keydown, and the browser resolves this key's default text-insertion action against whatever element is focused when the event finishes, not whatever was focused when it started. Without `preventDefault()`, the same "f" keystroke that opens search also lands in the now-focused search box as its first typed character. Calling it right before `showSearchModal()` (after the early-return guards, so a plain "f" typed in an already-focused field is never touched) suppresses that stray insertion.

### Match by physical key (`event.code`), not the character produced (`event.key`)
`event.key` reports whatever character the active keyboard layout actually produces — on a Russian ЙЦУКЕН layout, the physical key in the "F" position produces `"а"`, not `"f"`, so a check against `e.key.toLowerCase() === 'f'` silently never fires for anyone not on a Latin layout. `event.code === 'KeyF'` reports the physical key position regardless of layout, so the shortcut fires the same everywhere — this is the standard way to implement a layout-independent shortcut, and is what should have been used from the start rather than `event.key`.
