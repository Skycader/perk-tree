## Why

Lore notes currently only enter `configs/default/default.notes.js` by hand-copying prose from the author's Obsidian vault into JS object literals — retyping Obsidian's `[[wikilink]]` syntax as `<note id="...">` tags, and inventing a kebab-case `id` for every entry. This is repetitive, easy to get subtly wrong (a mistyped id silently breaks a cross-link, per `dev-wiki/NOTES_SYSTEM.md`'s own documented "IDs are not currently guaranteed unique" caveat), and gates every new batch of notes on manual transcription instead of just writing in Obsidian.

## What Changes

- New standalone Node.js CLI script (no dependency on the app's own ES modules or a bundler) that always reads exactly **one** input file — `notes.md`, containing every note back-to-back in the same file — and emits a `default.notes.js`-shaped JS module. Not a vault/directory scan: one file in, one file out.
- Notes are split from that single file at each top-level `# Title` heading: everything from one `# Title` up to (but not including) the next `# Title` or end-of-file is one note's block.
- Converts Obsidian syntax to this project's note syntax, per note block:
  - `# Title` (H1) → `title` field
  - `[[#Target Title|label]]` (Obsidian's own heading-link form) → `<note id="target-id">label</note>`, resolving `Target Title` to an `id` by title, matching against every note block parsed from the same file (a link can point forward or backward in the file — order doesn't matter)
  - `==highlight==` passes through unchanged (already the same syntax both sides use)
  - trailing `> — Author line` (blockquote attribution) → `author` field
- Generates a kebab-case `id` (Cyrillic-aware transliteration) for any note whose source file doesn't already carry one, following the existing convention visible in `default.notes.js` (e.g. "Тень души" → `ten-dushi`).
- Validation pass, reported to the console, not silently swallowed:
  - Any `[[...]]` link the script cannot resolve to a known title (dangling link) — listed explicitly, not dropped silently
  - Any `id` collision (including against ids already duplicated in the current `default.notes.js`, per the known-duplicates caveat)
  - A diff-style summary against the previous `default.notes.js` output (if one exists at the target path) so the author can see what was added, changed, or removed before overwriting
- Does **not** touch `configs/default/default.tips.js`, any `<tip>` syntax, or any other config's notes file — scope is `default.notes.js` only, matching the concrete example given.

## Capabilities

### New Capabilities
- `obsidian-notes-import`: a standalone Node.js CLI script that converts Obsidian-vault markdown notes into `configs/default/default.notes.js`, with link resolution and validation reporting as described above.

### Modified Capabilities
(none — this adds a new offline authoring tool; it does not change any runtime behavior of the app itself, and `default.notes.js`'s own consumed shape — `{id, title, content, author}` — is unchanged)

## Impact

- **New file(s)**: a new script (e.g. `tools/import-obsidian-notes.js` or similar — exact location decided in design.md) plus whatever small parsing helpers it needs. Proposed to live outside `js/` (that tree is browser ES modules served as-is; this is a Node-only dev tool and must not be pulled into the app's own module graph or served to the browser).
- **Regenerated file**: `configs/default/default.notes.js` (overwritten by running the script; the script is the source of truth going forward, Obsidian vault is the input of record).
- **No changes** to `js/markdown.js`, `js/load-notes.js`, `js/note-link-popup.js`, or any other runtime consumer of `notes` — the script's output must remain byte-shape-compatible with what those already expect.
- **External dependency**: the single `notes.md` file typically lives outside the repository (e.g. inside the author's Obsidian vault, a machine-specific path) — the script accepts the input file path as a CLI argument rather than hardcoding an absolute path, so it isn't broken on another machine (see `CLAUDE.md`'s own note about repo portability). Defaults to looking for `notes.md` in the current working directory when no argument is given.
