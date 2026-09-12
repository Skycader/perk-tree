## 1. Setup

- [x] 1.1 Create `tools/import-obsidian-notes.js` with CLI argument parsing (optional input-file path, defaulting to `notes.md` in the cwd; optional output-file path, defaulting to `configs/default/default.notes.js`) — verified: `node tools/import-obsidian-notes.js notes.md configs/default/default.notes.js` runs end to end

## 2. Parsing

- [x] 2.1 Implement splitting the single input file into note blocks at each top-level `# Heading` line — verified against the real `notes.md` (94 headings → 94 blocks)
- [x] 2.2 Implement per-block parsing of `# Title`, blockquote body, and trailing `> — Author` line into `{title, rawContent, author?}` — verified against the `📜 Тень души` example
- [x] 2.3 Group blockquote lines into paragraphs (blank `>` line = paragraph break, real `\n\n` in output; consecutive non-blank lines = soft-wrap, joined with a space) — verified: the `📜 Аксиома` note's 3 source paragraphs render as 3 separate `<p>` via `renderMD()`, not 1
- [x] 2.4 Implement title-only note (no author line) parsing — verified it does not error and omits `author`
- [x] 2.5 Strip markdown emphasis (`**`/`__`/`==`/`~~`/`*`/`_`) from extracted titles — verified: `# 📜 **Аксиома**` → `title: '📜 Аксиома'`, no literal asterisks in the rendered popup
- [x] 2.6 Build the `title → id` map via transliteration (Cyrillic-aware, emoji stripped) — verified against several existing ids in the real `default.notes.js`

## 3. Link resolution

- [x] 3.1 Implement `[[#Target Title|label]]` and `[[#Target Title]]` substitution into `<note id="...">label</note>` — verified against the worked example (`элементалей души` → `fundamentalnye-chastitsy-dushi`)
- [x] 3.2 Apply the same emphasis-stripping (2.5) to a wikilink's target title before lookup — verified: `[[#📜 **Аксиома**]]` now resolves against the stripped title `📜 Аксиома` (previously a dangling-link false positive)
- [x] 3.3 Warn (console) on unresolved wikilinks and degrade to plain label text instead of emitting a broken `<note>` tag — verified with a synthetic broken-link test file
- [x] 3.4 Verify `==highlight==` passes through untouched (no code needed — confirmed nothing in 3.1–3.3 touches it, and `renderMD()` converts it correctly downstream)

## 4. Id collisions

- [x] 4.1 Warn (console) when two note blocks transliterate to the same id, without dropping either — verified with a synthetic collision test

## 5. Output generation

- [x] 5.1 Implement the serializer: single-quoted string when `content` has no real newline, template literal (with backtick/`${` escaping) when it does — verified `node --check` passes on generated output, including notes with apostrophes and multi-paragraph notes
- [x] 5.2 Emit `export const notes = [...]` — verified the file is a valid drop-in for `js/load-notes.js`'s existing consumer shape

## 6. End-to-end verification (real data)

- [x] 6.1 Ran against the real `notes.md` (94 notes) and loaded the result in the app — startup popup, prev/next cycling, and cross-linked `<note>` refs render correctly
- [x] 6.2 Cross-checked every `<note id="...">` reference in `configs/default/default.config.js` and within `default.notes.js` itself against the generated id set — found and manually corrected one pre-existing mismatch (`angelskie-slyozy` vs. the transliterated `angelskie-slezy`); confirmed the known pre-existing duplicate id (`oskolok-dushi`) is unrelated to this script
- [x] 6.3 Confirmed no changes were made to `js/markdown.js`, `js/load-notes.js`, `js/note-link-popup.js`, or any other runtime file — only `tools/import-obsidian-notes.js` (new) and `configs/default/default.notes.js` (regenerated) changed

## Not built (see spec.md's "Out of Scope")

- [ ] ~~Preserve existing ids across runs (explicit > existing > generated priority)~~ — cut, script always regenerates ids from scratch
- [ ] ~~Scan `default.config.js` for `<note id>` references and flag breaks before writing~~ — cut; done manually once instead (task 6.2)
- [ ] ~~Diff summary (added/changed/removed) against existing output before overwriting~~ — cut, script always writes immediately
- [ ] ~~`--write` flag / report-only mode~~ — cut, no such flag exists
