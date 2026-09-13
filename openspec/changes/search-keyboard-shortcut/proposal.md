## Why

Search is currently only reachable by moving the mouse to the topbar lupa button. A keyboard shortcut lets it be opened without leaving the keyboard, matching how the app already treats Escape as a keyboard-first way to close things.

## What Changes

- Pressing `F` (case-insensitive, no modifier keys) opens the search modal and autofocuses its input, from anywhere in the app except while the user is already typing in a text field (so typing the letter "f" in the search box itself, or any other input, doesn't re-trigger it).
- No change to the existing lupa button, or to any other close/open behavior of the modal.

## Capabilities

### Modified Capabilities
- `content-search`: adds a keyboard shortcut as a second way to open the search modal, alongside the existing button.

## Impact

- **`js/search-modal.js`**: a new `keydown` listener, guarded against firing while an `<input>`/`<textarea>`/contenteditable element has focus.
- No changes to `index.html`, `css/search.css`, or the modal's open/close/filter logic itself — `showSearchModal()` already does everything needed (autofocus included).
