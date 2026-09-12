## Purpose

Defines how content fetched via `<file src="....md"></file>` (used inside notes/tips, resolved by `js/note-link-popup.js`'s `resolveFileTags`) is rendered — specifically, closing the gap between Obsidian's own markdown dialect (used to author these files) and what `renderMD()` understands, for image embeds and tables.

## ADDED Requirements

### Requirement: Convert Obsidian image embeds to real images
Content fetched from a `<file src="...">` SHALL have every Obsidian image-embed reference of the form `![[filename.ext]]` converted to a real image element before being passed to `renderMD()`, with `filename.ext` resolved against the `assets/` folder (the same convention every other image reference in this app already uses).

#### Scenario: Bare filename embed
- **WHEN** fetched file content contains `![[visible-spectrum_799_599.png]]`
- **THEN** the rendered output contains an image whose resolved source is `assets/visible-spectrum_799_599.png`

#### Scenario: Referenced asset does not exist
- **WHEN** fetched file content contains `![[nonexistent.png]]`
- **THEN** the conversion still emits an `<img>` pointing at `assets/nonexistent.png` (broken-image handling is left to normal browser/img behavior — the same as any other missing image reference elsewhere in the app, not a new special case)

### Requirement: Tables render legibly against the dark theme
Any GFM table produced by `renderMD()` from `<file>`-sourced content SHALL be visually styled — not left to unstyled browser defaults — consistent with this app's dark, `JetBrains Mono` visual language, wherever `.notes-content` is used (the startup notes popup and every linked note/tip cascade popup).

#### Scenario: Table in fetched content
- **WHEN** fetched file content contains a GFM pipe table
- **THEN** the rendered table's header row, cell borders, and text are visibly distinct against the popup's dark background, not relying on unstyled browser table defaults

## Out of Scope

- Obsidian's extended embed syntax (`![[filename.png|alt text]]`, `![[filename.png|200]]` width/alt modifiers) — not present in current content; only the bare `![[filename.ext]]` form is handled.
- Embedding other note files via `![[Some Note]]` (transclusion) — only image embeds are addressed; the source content in scope for this change uses only image embeds.
- Any change to `<file>`'s own tag syntax, fetch behavior, or error handling (missing/failed fetch already shows `⚠ Не удалось загрузить ...`, unchanged).
