## 1. Image embed conversion

- [x] 1.1 Add `![[filename]]` → `![](assets/filename)` conversion inside `resolveFileTags` (`js/note-link-popup.js`), applied to each fetched file's text before it's substituted back into `content` — verify against `wiki/tips/visible-spectre.md`'s two real embeds
- [x] 1.2 Verify end-to-end: open the `visible-spectre` tip in the app, confirm both images render (not literal `![[...]]` text) and pick up `.notes-content img`'s existing styling (bordered, rounded, responsive) with no CSS changes needed
- [x] 1.3 Verify a deliberately-missing filename (`![[does-not-exist.png]]`) degrades to a normal broken-image `<img>`, not a script error

## 2. Table styling

- [x] 2.1 Add `table`/`thead`/`tbody`/`tr`/`th`/`td` rules under `.notes-content` in `css/notes.css`, matching the app's dark/JetBrains-Mono visual language
- [x] 2.2 Verify the `visible-spectre` tip's real 7-row table is legible (visible borders, distinct header row, readable text) against the popup's dark background, in both the light and dark checks that matter here (there's only one theme in this app — verify in the actual running page, not just by reading the CSS)

## 3. Regression check

- [x] 3.1 Confirm `water-run` (`wiki/tips/water-run.md`, no embeds/tables) still renders unchanged — its `**bold**`/`==highlight==` content shouldn't be affected by either change
- [x] 3.2 Confirm a normal (non-`<file>`) note/tip with an ordinary `![alt](url)` markdown image (if any exist) is unaffected — the new regex only matches the `![[...]]` form, not standard markdown image syntax
- [x] 3.3 `git diff --stat` shows only `js/note-link-popup.js` and `css/notes.css` changed — no edits to `js/markdown.js`, `configs/default/default.tips.js`, or `wiki/**`
