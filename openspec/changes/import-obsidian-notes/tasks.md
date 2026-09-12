## 1. Setup

- [ ] 1.1 Create `tools/import-obsidian-notes.js` with CLI argument parsing (a single optional input-file path argument, defaulting to `notes.md` in the cwd; output path defaulting to `configs/default/default.notes.js`; a `--write` flag gating actual file overwrite vs. report-only) and verify `node tools/import-obsidian-notes.js --help` prints usage without touching any file
- [ ] 1.2 Decide and document the explicit-id-override mechanism (design.md's Open Question) in the script's header comment and `--help` text, and verify a sample note using it round-trips to the chosen id

## 2. Parsing (pass 1)

- [ ] 2.1 Implement splitting the single input file into note blocks at each top-level `# Heading` line, and verify a file with two `# Title` sections back-to-back produces exactly two blocks with correctly separated bodies
- [ ] 2.2 Implement per-block parsing of `# Title`, blockquote body, and trailing `> — Author` line into `{title, rawContent, author?, explicitId?}`, and verify against the `📜 Тень души` example from the proposal
- [ ] 2.3 Implement title-only note (no author line) parsing and verify it does not error and omits `author`
- [ ] 2.4 Build the `title → id` map using the priority order from design.md Decision 3 (explicit id → existing id from current `default.notes.js` → transliterated), and verify against at least 5 existing titles in `default.notes.js` that the transliteration step (when reached) reproduces their current ids

## 3. Link resolution (pass 2)

- [ ] 3.1 Implement `[[#Target Title|label]]` and `[[#Target Title]]` substitution into `<note id="...">label</note>` using the title map from 2.4, and verify against the proposal's worked example (`элементалей души` link resolving to `fundamentalnye-chastitsy-dushi`)
- [ ] 3.2 Collect unresolved wikilinks (target title not in the map) into a report list instead of substituting, and verify a deliberately-broken test link appears in the script's console output
- [ ] 3.3 Verify `==highlight==` syntax passes through `rawContent` unmodified (no transformation needed, just confirm nothing in 3.1/3.2 touches it)

## 4. Id integrity checks

- [ ] 4.1 Implement id-collision detection across the full parsed set (generated-vs-generated, generated-vs-explicit, explicit-vs-existing) and verify it reports both colliding titles for a synthetic collision test case
- [ ] 4.2 Implement the cross-reference scan of `configs/default/default.config.js` and `configs/default/default.notes.js` text for `<note id="([^"]+)">`, diff referenced ids against the new output's id set, and verify a synthetic "referenced id removed" test case is reported

## 5. Diff report against existing output

- [ ] 5.1 When the target output file already exists, parse its current `notes` array (by requiring/evaluating it in a sandboxed way, or a targeted regex extraction of existing `{id, title}` pairs — pick one in implementation) and compute added/changed/removed ids by comparing `{title, content, author}` per id
- [ ] 5.2 Print a clear before-write summary (counts and ids for added/changed/removed, plus every warning from tasks 3.2 and 4.1/4.2) and verify it's shown even when `--write` is not passed (report-only mode)

## 6. Output generation

- [ ] 6.1 Implement the serializer choosing single-quoted strings vs. template literals per design.md Decision 5, with correct escaping, and verify round-tripping a note containing an apostrophe and a note containing a literal newline both produce valid JS (parse the generated file with `node --check`)
- [ ] 6.2 Emit the final `export const notes = [...]` module preserving existing entries whose source wasn't touched this run (only overwrite entries that actually changed) unless `--write` explicitly requests a full regeneration, and verify by running twice on unchanged input and diffing the output file (byte-identical, per design.md's determinism goal)

## 7. End-to-end verification

- [ ] 7.1 Run the script against the real `notes.md` file with `--write` omitted (report-only) and manually review the report for plausibility (no unexpected dangling links or collisions among real existing notes)
- [ ] 7.2 Run with `--write` against a copy of `configs/default/default.notes.js` (not the real file) and verify the result loads correctly in the app: `node --check` on the output, then open the dev server and confirm the startup notes popup and a cross-linked `<note>` reference still render (see `claude/dev-workflow.md` for how to actually verify this painted, not just that the file parses)
- [ ] 7.3 Confirm no changes were made to `js/markdown.js`, `js/load-notes.js`, `js/note-link-popup.js`, or any other runtime file — `git diff --stat` should show only the new `tools/` script and the regenerated `default.notes.js`
