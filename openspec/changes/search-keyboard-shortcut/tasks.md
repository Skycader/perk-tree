## 1. Keyboard shortcut

- [x] 1.1 In `js/search-modal.js`, add a `window.addEventListener('keydown', ...)` that opens the search modal (`showSearchModal()`) when the physical `F` key is pressed (`e.code === 'KeyF'`, layout-independent — not `e.key`, which reports the character the active layout produces) and no modifier key is held, unless `document.activeElement` is an `INPUT`, `TEXTAREA`, or `isContentEditable` element.
- [x] 1.2 Call `e.preventDefault()` before `showSearchModal()` — without it, the browser still delivers this key's default text-insertion action to `searchInput` after it gains focus mid-event, so the "f" that opened search also types itself into the box.

## 2. Manual verification

- [x] 2.1 In the running dev server, press `F` with focus elsewhere on the page and confirm the search modal opens with the input autofocused.
- [x] 2.2 Confirm pressing `F` while typing in the search input itself (or any other focused text field) does not re-trigger/interfere — the letter "f" types normally.
- [x] 2.3 Confirm the existing lupa button still opens search unchanged, and Escape/backdrop/× still close it.
- [x] 2.4 Confirm the shortcut fires under a non-Latin layout too (simulate via `e.code: 'KeyF'` with `e.key` set to the Russian layout's character, "а").
- [x] 2.5 Confirm the search input is empty immediately after the shortcut opens it — the triggering "f"/"а" keystroke must not appear as its first character.
