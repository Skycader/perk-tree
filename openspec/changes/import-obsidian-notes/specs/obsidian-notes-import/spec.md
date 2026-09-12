## Purpose

Converts the author's single Obsidian notes file (Markdown, Obsidian wikilink syntax, one file containing every note) into `configs/default/default.notes.js`'s `{id, title, content, author}` shape, so new lore is authored once in Obsidian instead of hand-transcribed into JS, with link and id integrity checked before the output file is overwritten.

## ADDED Requirements

### Requirement: Split one input file into multiple notes by heading
The script SHALL always read exactly one input file (`notes.md` by convention) and split it into one note block per top-level `# Heading`: each block runs from its `# Heading` up to (but not including) the next top-level `# Heading` or end-of-file. The script is not a directory/vault scanner — it never reads more than the one file it was given.

#### Scenario: File containing multiple notes back-to-back
- **WHEN** the input file contains two `# Title` sections one after another
- **THEN** the script produces two separate note entries, one per section, each containing only that section's own body

### Requirement: Parse a note block into title/content/author
For each note block produced by the heading split, the script SHALL extract the heading text as `title`, the block's body as `content`, and a trailing attribution line (`> — <text>`) as `author` when present.

#### Scenario: Note with title, content, and attribution
- **WHEN** a note block starts with `# 📜 Тень души`, has a blockquote body, and ends with a trailing `> — Заметки неизвестного` line
- **THEN** the script produces an entry with `title: '📜 Тень души'`, `content` equal to the body text (attribution line excluded), and `author: '— Заметки неизвестного'`

#### Scenario: Note with no attribution line
- **WHEN** a note block has a title and body but no trailing `> — ...` line
- **THEN** the script produces an entry with `title` and `content` set and omits (or leaves empty) the `author` field, without treating this as an error

### Requirement: Convert Obsidian wikilinks to `<note>` tags
The script SHALL convert every Obsidian heading-link of the form `[[#Target Title|label]]` (or `[[#Target Title]]` with no explicit label) found in a note block's body into `<note id="target-id">label</note>`, where `target-id` is the `id` of the note block (anywhere in the same file, before or after this one) whose title matches `Target Title`.

#### Scenario: Wikilink resolves to a known title
- **WHEN** a note block's body contains `[[#📜 Фундаментальные частицы души|элементалей души]]` and another block parsed from the same file has the title `📜 Фундаментальные частицы души` with id `fundamentalnye-chastitsy-dushi`
- **THEN** the output `content` contains `<note id="fundamentalnye-chastitsy-dushi">элементалей души</note>` in place of the wikilink

#### Scenario: Wikilink with no explicit label
- **WHEN** a note body contains `[[#Some Title]]` with no `|label` part
- **THEN** the script uses `Some Title` itself as the `<note>` tag's inner label

### Requirement: Preserve highlight syntax unchanged
The script SHALL pass `==highlighted text==` through to `content` unchanged, since this project's own note format already uses the same syntax.

#### Scenario: Highlight in source note
- **WHEN** a note body contains `==тень==`
- **THEN** the output `content` contains `==тень==` unmodified

### Requirement: Generate a stable id when one is not supplied
The script SHALL derive a kebab-case `id` for every note by transliterating its title (Cyrillic-aware) when the source note does not already specify one explicitly, following the convention already used in `default.notes.js` (e.g. "Тень души" → `ten-dushi`).

#### Scenario: Title-derived id
- **WHEN** a source note titled `📜 Тень души` carries no explicit id
- **THEN** the generated entry's `id` is a kebab-case transliteration derived from `Тень души` (leading emoji excluded)

### Requirement: Preserve existing ids for already-known titles
When the target `default.notes.js` already contains a note whose `title` matches a source note's title, the script SHALL reuse that note's existing `id` rather than regenerating one, even if the transliteration scheme would produce a different string.

#### Scenario: Re-running the import for a note that already exists
- **WHEN** a source note's title matches the title of a note already present in `default.notes.js`
- **THEN** the regenerated entry keeps the existing `id`, not a freshly transliterated one

### Requirement: Flag id changes that would break existing cross-references
Before writing output, the script SHALL scan `configs/default/default.config.js` (perk descriptions, `skillLevelDescriptions`, `combo` entries) and `configs/default/default.notes.js` itself for `<note id="...">` references, and SHALL report any referenced id that would no longer exist after this run (dropped or renamed), since such perks/notes would silently lose a working cross-link.

#### Scenario: A note referenced by a perk is removed from the input file
- **WHEN** `default.config.js` contains `<note id="some-id">...</note>` and the new run's output no longer contains a note with `some-id`
- **THEN** the script reports this as a broken reference before writing the output, identifying where `some-id` is referenced from

### Requirement: Report dangling links instead of silently dropping them
The script SHALL detect any `[[#Target Title|...]]` wikilink whose `Target Title` does not match any note block's title parsed from the input file, and SHALL report it to the console by source title (the note block containing the link) and target title without silently emitting broken output for it.

#### Scenario: Unresolvable wikilink
- **WHEN** a note block's body contains a wikilink targeting a title that does not exist among the parsed notes
- **THEN** the script prints a warning identifying the note block it was found in and the unresolved target title, and does not silently convert it into a `<note id="...">` reference with an invalid id

### Requirement: Report id collisions instead of silently overwriting
The script SHALL detect when two or more note blocks parsed from the input file would resolve to the same `id` (whether both ids are generated, both are explicit, or one of each) and report every colliding id together with the titles involved, without silently dropping any of the colliding entries from the output.

#### Scenario: Two notes generate the same id
- **WHEN** two note blocks' titles transliterate to the same kebab-case id
- **THEN** the script reports the collision (both titles) and still includes both entries in its report, rather than silently keeping only one

### Requirement: Summarize differences before overwriting existing output
When the target `default.notes.js` already exists, the script SHALL compare the newly generated notes against the existing ones (by `id`) and report, before writing, which ids are new, which changed (title/content/author differs), and which existing ids are no longer present in the new output.

#### Scenario: Re-running after editing one note in Obsidian
- **WHEN** the target file already contains a note with a given id and the regenerated content for that id differs
- **THEN** the script's report lists that id under "changed" before the file is overwritten

#### Scenario: A previously-present note is missing from the new run
- **WHEN** an id present in the existing `default.notes.js` is absent from the newly parsed notes
- **THEN** the script's report lists that id as removed, and does not delete it from the output without this being visible in the report

### Requirement: Configurable input file path, single file only
The script SHALL accept the input file's path as an optional command-line argument (defaulting to `notes.md` in the current working directory when omitted) rather than a hardcoded machine-specific path, so it runs on a different machine without modification. It SHALL NOT accept a directory or scan multiple files.

#### Scenario: Running with an explicit path argument
- **WHEN** the script is invoked with a file path argument
- **THEN** it reads that single file instead of the `notes.md` default

#### Scenario: Running with no argument
- **WHEN** the script is invoked with no path argument
- **THEN** it looks for `notes.md` in the current working directory

### Requirement: Output matches the existing default.notes.js shape
The generated file SHALL export a `notes` array of `{id, title, content, author}` objects in the same module shape `configs/default/default.notes.js` already uses, so no changes are required in `js/load-notes.js`, `js/markdown.js`, or any other consumer.

#### Scenario: Generated file is a drop-in replacement
- **WHEN** the script writes its output to `configs/default/default.notes.js`
- **THEN** the file is a valid ES module exporting `export const notes = [...]` with the same field names and types the app's existing consumers already read
