## Why

Content pulled in via `<file src="....md"></file>` (see `js/note-link-popup.js`'s `resolveFileTags`) is fetched and passed straight to `renderMD()`, which only understands standard CommonMark/GFM plus this project's own `<note>`/`<tip>`/`<perk>`/`<square>` extensions — not Obsidian's own markdown dialect. Two gaps confirmed against the real file `wiki/tips/visible-spectre.md` (linked from `configs/default/default.tips.js`'s `visible-spectre` tip):
1. Obsidian's image-embed syntax `![[filename.png]]` is not CommonMark — `marked.parse()` leaves it as literal text (`<p>![[visible-spectrum_799_599.png]]</p>`), even though the referenced files (`assets/visible-spectrum_799_599.png`, `assets/visible-light-definition_768_299.png`) already exist in the repo.
2. A GFM pipe-table in the same file *does* parse into a valid `<table>` (verified directly via `renderMD()`) — the actual problem is that `css/notes.css` (which styles both `#notes-popup` and `.note-link-popup`, i.e. every `<file>`-backed tip/note) has zero rules for `table`/`th`/`td`/`tr`, so the table renders with unstyled browser defaults against the app's dark theme — illegible in practice, which reads as "doesn't render."

## What Changes

- Convert Obsidian's `![[filename]]` embed syntax to a real `<img>` inside `<file>`-sourced content, resolving the bare filename against the `assets/` folder by convention (matching where these two files, and every other image the app already references via `img`/`imgs[]`, actually live).
- Add table styling to `css/notes.css`, scoped to `.notes-content` (shared by both the startup notes popup and the linked note/tip cascade popups per `dev-wiki/NOTES_SYSTEM.md`), matching the app's existing dark/JetBrains-Mono visual language — same spirit as `css/windows.css`'s already-existing `.win-extra-content table` rules, which this area never got.
- No change to the `<file src="...">` tag's own syntax or to `resolveFileTags`'s fetch/error-handling behavior — only what happens to the fetched text before/as it's rendered, and how the resulting HTML is styled.

## Capabilities

### New Capabilities
- `note-file-embeds`: rendering behavior for `<file src="....md">`-sourced content inside notes/tips — Obsidian image-embed conversion and table presentation. (The existing `obsidian-notes-import` capability covers the offline Node CLI script that builds `default.notes.js`; this is a different, runtime, in-browser concern and doesn't belong under that spec.)

### Modified Capabilities
(none)

## Impact

- **`js/note-link-popup.js`**: `resolveFileTags` (or a new step alongside it) gains `![[filename]]` → `<img>` conversion for fetched `<file>` content.
- **`css/notes.css`**: new `table`/`thead`/`tbody`/`tr`/`th`/`td` rules under `.notes-content`.
- **No change** to `js/markdown.js`'s `renderMD`/`renderLevelMD` (the embed conversion is specific to `<file>`-sourced content, not general markdown passed to every perk/note/tip elsewhere in the app, which doesn't use Obsidian embed syntax).
- **No change** to `configs/default/default.tips.js`, `wiki/tips/*.md`, or any asset files — this fixes the renderer, not the content.
