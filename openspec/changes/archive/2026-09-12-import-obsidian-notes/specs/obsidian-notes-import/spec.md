## Purpose

Converts the author's single Obsidian notes file (`notes.md`, one file containing every note) into `configs/default/default.notes.js`'s `{id, title, content, author}` shape, so new lore is authored once in Obsidian instead of hand-transcribed into JS.

## ADDED Requirements

### Requirement: Split one input file into multiple notes by heading
The script SHALL always read exactly one input file (`notes.md` by convention) and split it into one note block per top-level `# Heading`: each block runs from its `# Heading` up to (but not including) the next top-level `# Heading` or end-of-file.

#### Scenario: File containing multiple notes back-to-back
- **WHEN** the input file contains two `# Title` sections one after another
- **THEN** the script produces two separate note entries, one per section, each containing only that section's own body

### Requirement: Parse a note block into title/content/author, preserving paragraph breaks
For each note block, the script SHALL extract the heading text as `title`, the blockquote body as `content`, and a trailing attribution line (`> — <text>`) as `author` when present. Within the body, a blank `>` line SHALL be treated as a paragraph break (rendered as a real double newline in `content`, so `renderMD()`'s markdown parser produces separate `<p>` elements) rather than being discarded; consecutive non-blank `>` lines SHALL be joined with a single space (soft line-wrap, not a paragraph break).

#### Scenario: Note with title, content, and attribution
- **WHEN** a note block starts with `# 📜 Тень души`, has a blockquote body, and ends with a trailing `> — Заметки неизвестного` line
- **THEN** the script produces an entry with `title: '📜 Тень души'`, `content` equal to the body text (attribution line excluded), and `author: '— Заметки неизвестного'`

#### Scenario: Note with no attribution line
- **WHEN** a note block has a title and body but no trailing `> — ...` line
- **THEN** the script produces an entry with `title` and `content` set and no `author` field, without treating this as an error

#### Scenario: Multi-paragraph note body
- **WHEN** a note block's blockquote body contains three paragraphs separated by blank `>` lines
- **THEN** the generated `content` renders (via `renderMD()`) as three separate `<p>` elements, not one run-on paragraph

### Requirement: Strip markdown emphasis from titles
Since `title` is always displayed as plain text (`.textContent`) throughout the app — never markdown-rendered, unlike `content` — the script SHALL strip `**bold**`, `__bold__`, `==highlight==`, `~~strikethrough~~`, `*italic*`, and `_italic_` markers from both the extracted heading text and from any wikilink target title (see next requirement), leaving only the inner text.

#### Scenario: Heading with bold markup
- **WHEN** a note's heading is `# 📜 **Аксиома**`
- **THEN** the generated entry's `title` is `📜 Аксиома` with no literal `**` characters

#### Scenario: Wikilink target with bold markup
- **WHEN** a wikilink reads `[[#📜 **Аксиома**]]` and a note block is headed `# 📜 **Аксиома**`
- **THEN** the link resolves correctly (the same stripping is applied to both sides before matching)

### Requirement: Convert Obsidian wikilinks to `<note>` tags
The script SHALL convert every Obsidian heading-link of the form `[[#Target Title|label]]` (or `[[#Target Title]]` with no explicit label) found in a note block's body into `<note id="target-id">label</note>`, where `target-id` is the `id` of the note block (anywhere in the same file, before or after this one) whose title matches `Target Title`.

#### Scenario: Wikilink resolves to a known title
- **WHEN** a note block's body contains `[[#📜 Фундаментальные частицы души|элементалей души]]` and another block parsed from the same file has the title `📜 Фундаментальные частицы души` with id `fundamentalnye-chastitsy-dushi`
- **THEN** the output `content` contains `<note id="fundamentalnye-chastitsy-dushi">элементалей души</note>` in place of the wikilink

#### Scenario: Wikilink with no explicit label
- **WHEN** a note block's body contains `[[#Some Title]]` with no `|label` part
- **THEN** the script uses `Some Title` itself as the `<note>` tag's inner label

### Requirement: Preserve highlight syntax unchanged
The script SHALL pass `==highlighted text==` through to `content` unchanged, since this project's own note format already uses the same syntax.

#### Scenario: Highlight in source note
- **WHEN** a note block's body contains `==тень==`
- **THEN** the output `content` contains `==тень==` unmodified

### Requirement: Generate a stable id via transliteration
The script SHALL derive a kebab-case `id` for every note by transliterating its (emphasis-stripped) title (Cyrillic-aware), following the convention already used in `default.notes.js` (e.g. "Тень души" → `ten-dushi`). The id is regenerated from scratch on every run — the script does not read or preserve ids from a previously generated output file.

#### Scenario: Title-derived id
- **WHEN** a source note titled `📜 Тень души` is parsed
- **THEN** the generated entry's `id` is a kebab-case transliteration derived from `Тень души` (leading emoji excluded)

### Requirement: Warn on id collisions
The script SHALL detect when two or more note blocks parsed from the input file would resolve to the same `id` and print a console warning naming both titles. It SHALL NOT stop processing or drop either entry.

#### Scenario: Two notes generate the same id
- **WHEN** two note blocks' titles transliterate to the same kebab-case id
- **THEN** the script prints a warning naming both titles and still includes both entries in the output

### Requirement: Warn on dangling links instead of silently dropping them
The script SHALL detect any `[[#Target Title|...]]` wikilink whose (emphasis-stripped) `Target Title` does not match any note block's title parsed from the input file, print a console warning naming the containing note's title and the unresolved target, and degrade the link to its plain label text (or target title, if no label) instead of emitting a `<note id="...">` reference with an invalid id.

#### Scenario: Unresolvable wikilink
- **WHEN** a note block's body contains a wikilink targeting a title that does not exist among the parsed notes
- **THEN** the script prints a warning identifying the note block it was found in and the unresolved target title, and the output contains the link's plain label text instead of a broken `<note>` tag

### Requirement: Configurable input and output file paths, single file only
The script SHALL accept the input file's path as an optional first CLI argument (defaulting to `notes.md` in the current working directory) and the output file's path as an optional second CLI argument (defaulting to `configs/default/default.notes.js`). It SHALL NOT accept a directory or scan multiple input files.

#### Scenario: Running with explicit path arguments
- **WHEN** the script is invoked as `node tools/import-obsidian-notes.js <input> <output>`
- **THEN** it reads `<input>` and writes to `<output>` instead of the defaults

#### Scenario: Running with no arguments
- **WHEN** the script is invoked with no arguments
- **THEN** it reads `notes.md` from the current working directory and writes to `configs/default/default.notes.js`

### Requirement: Output matches the existing default.notes.js shape
The generated file SHALL export a `notes` array of `{id, title, content, author}` objects in the same module shape `configs/default/default.notes.js` already uses, so no changes are required in `js/load-notes.js`, `js/markdown.js`, or any other consumer. Content containing a real newline SHALL be emitted as a template literal; content without one SHALL be emitted as a single-quoted string.

#### Scenario: Generated file is a drop-in replacement
- **WHEN** the script writes its output to `configs/default/default.notes.js`
- **THEN** the file is a valid ES module (verifiable with `node --check`) exporting `export const notes = [...]` with the same field names and types the app's existing consumers already read

## Out of Scope (considered, not built)

The following were part of the original proposal/design but deliberately cut in favor of the simplest working script, per explicit direction. Not implemented; not requirements of this capability:

- Preserving ids across runs by matching against an existing output file's titles (every run regenerates every id from scratch — a transliteration change, or a re-run after `default.config.js` already hand-references an old id, can silently produce a mismatch; caught manually once so far, not automated)
- Scanning `configs/default/default.config.js` for `<note id="...">` references and flagging ones that would break
- A before-write diff summary (added/changed/removed ids) against an existing output file
- A `--write` flag / report-only mode — the script always writes immediately
