## Context

See `proposal.md` - Why/What Changes for motivation. Relevant current state:

- `configs/default/default.notes.js` exports `notes = [{id, title, content, author}]`, hand-authored. Some entries use single-quoted single-line strings, others use backtick template literals for multi-line content (e.g. the `ogranichennost-teni` entry) — the file mixes both styles depending on whether the source content itself contains hard line breaks.
- Ids visible in the file follow simple phonetic Cyrillic→Latin transliteration of the title with the leading emoji stripped (`Тень души` → `ten-dushi`, `Феномен Властителя` → `fenomen-vlastitelya`), lowercased, spaces to hyphens.
- Per `dev-wiki/NOTES_SYSTEM.md`, ids are **not** currently guaranteed unique — confirmed duplicates already exist (`ten-dushi`, `oskolok-dushi`, `khroniki-vlastitelya`). The importer must not make this worse and should surface (not silently fix) existing duplicates it encounters.
- `<note id="...">` cross-references exist not just between notes, but also from `configs/default/default.config.js` (perk `description`, `skillLevelDescriptions` level text, and `combo[...].desc`) — e.g. `angelskie-slyozy`, `homo-deus` are both referenced from combo descriptions. Any id that silently changes or disappears breaks a link with no build-time error (it just renders as a dead `<note>` reference at runtime, per `note-link-popup.js`'s console-warning-only failure mode).
- `js/markdown.js`'s `processWikiLinkTags` already defines the app's own (unrelated) `[[#Title|label]]` / `[[id:x|label]]` runtime wiki-link syntax. Obsidian's native `[[#Heading|label]]` link syntax looks similar but is a **different, Obsidian-only** syntax being converted away by this script — it must not be confused with the app's own passthrough wiki-link feature, which this script does not need to touch.
- No `package.json` exists in the repo; the browser app is deliberately dependency-free (see `CLAUDE.md`).

## Goals / Non-Goals

**Goals:**
- Deterministic, re-runnable conversion: running the script twice on unchanged input produces byte-identical output.
- Preserve every id already in use by the current `default.notes.js` and by anything that references those ids elsewhere in the repo.
- Fail loud (console report), never fail silent, for anything that would otherwise corrupt or quietly drop content.

**Non-Goals:**
- Two-way sync (writing back to Obsidian) — one-directional, vault is always the source of truth for content.
- Handling `default.tips.js` or any non-default config's notes file — out of scope per the proposal.
- General-purpose Markdown-to-anything conversion — this only needs to understand the specific subset of syntax the vault's notes actually use (H1 title, blockquote body, `> — author` line, `[[#Title|label]]`, `==highlight==`).
- Adding a `package.json`/npm dependency — the parsing surface is small and regular enough to hand-roll; introducing a dependency would be the first one in this repo and isn't justified by this script's scope.

## Decisions

**1. Zero-dependency, hand-rolled line/regex parser (not a Markdown AST library).**
The source syntax is narrow and regular (H1 + blockquote + optional attribution line + inline `[[...]]`/`==...==`). A full CommonMark parser is more machinery than this needs and would be this repo's first npm dependency for a one-script tool. Alternative considered: reuse `libs/marked.min.js` (already vendored for the browser) — rejected because it's built for rendering to HTML, not for round-tripping structured `{title, content, author}` extraction, and pulling a browser-oriented vendored file into a Node script blurs the "browser module graph vs Node tool" boundary the proposal calls out.

**2. Two-pass parse: split and collect titles first, substitute links second.**
Pass 1 reads the single input file, splits it into note blocks at each top-level `# Heading` (Decision-level detail: a simple line-scan — every line matching `/^#\s+/` at the start of a line begins a new block, everything up to the next such line or EOF belongs to it), and builds an in-memory list of `{title, rawContent, explicitId?}` plus a `title → id` map (see Decision 3 for how `id` is chosen). Pass 2 re-scans each block's `rawContent` and replaces every resolved `[[#Title|label]]` with `<note id="...">label</note>`, now that all titles in the file are known regardless of which block comes first. Unresolved links are collected into the validation report instead of being substituted.

**3. Id resolution priority (most important correctness decision): explicit > existing > generated.**
For each parsed note block, in order:
1. If the block specifies an id explicitly (mechanism TBD in tasks — e.g. an `id:: some-id` Obsidian inline field on its own line within the block), use it as-is.
2. Else, if `configs/default/default.notes.js` already has a note whose `title` matches exactly, reuse that note's existing `id`.
3. Else, generate one via transliteration (Decision 4).

This ordering exists specifically so re-running the importer after editing a note's *body* in Obsidian never changes that note's `id` — which would otherwise silently break every `<note id="...">` reference to it from every perk/combo/other note in `default.config.js`, with no error at build time (see Context). This is the load-bearing decision in this design; everything else is replaceable, this one is not.

**4. Transliteration table fixed to match the existing convention.**
A standard phonetic Cyrillic→Latin table (а→a, б→b, в→v, г→g, д→d, е→e, ё→e, ж→zh, з→z, и→i, й→i, к→k, л→l, м→m, н→n, о→o, п→p, р→r, с→s, т→t, у→u, ф→f, х→kh, ц→ts, ч→ch, ш→sh, щ→shch, ъ→'', ы→y, ь→'', э→e, ю→yu, я→ya), applied only to *new* titles (per Decision 3, step 3) — lowercase, strip leading emoji/punctuation, spaces→hyphens, collapse repeated hyphens. Verified against existing ids (`ten-dushi`, `fenomen-vlastitelya`, `budushchee-ne-predopredeleno`) to confirm the table matches what's already in the file before relying on it for new entries.

**5. Content serialization: single-quoted string, falling back to a template literal only when the content contains a literal newline.**
Matches the mixed style already observed in `default.notes.js`. Single quotes inside `content` are escaped (`\'`); backticks/`${` inside content (unlikely in this prose but possible via `<note>`/`**`/`==` markup) are escaped in the template-literal path. This keeps generated entries visually consistent with hand-written ones rather than introducing a third style.

**6. Cross-reference check reads `default.config.js` as text, not by importing it.**
The config module has top-level side effects when imported (via `load-config.js`'s dynamic import chain) and isn't meant to run outside the browser. The script instead greps the raw file text for `<note id="([^"]+)">` (and the same pattern in `default.notes.js` for note-to-note references) to collect the set of currently-referenced ids, then diffs that set against the new output's id set. Simple and sufficient — this only needs the set of referenced ids, not a full parse of the config.

## Risks / Trade-offs

- **[Risk] Obsidian source notes may not have an established way to carry an explicit id today** (the vault predates this tool) → Mitigation: Decision 3's priority order makes explicit ids optional in practice — nearly every real note will hit "existing" (already in `default.notes.js`) or "generated" (genuinely new), so this only matters for the rare case for an author who wants to pin an id different from what transliteration would produce.
- **[Risk] Transliteration table producing a different string than an existing id for an edge case not yet seen** (e.g. an existing id that was hand-picked rather than mechanically transliterated) → Mitigation: this is exactly why Decision 3 checks "existing" before "generate" — the table is only ever load-bearing for brand-new titles, never for regenerating an id that already exists.
- **[Risk] Duplicate titles within the one input file** (two `# Title` blocks with the same heading text) would collide in the title→id map the same way duplicate ids already do in the current file → Mitigation: covered by the spec's id-collision requirement; report, don't silently pick one.
- **[Trade-off] Hand-rolled parsing is less robust to unusual Markdown the file might contain in the future** (nested blockquotes, footnotes, etc.) than a real parser would be → accepted per Non-Goals; the file's actual note format is narrow today, and this can be revisited if the format grows richer.

## Open Questions

- Exact mechanism for an explicit per-note id override within a block (Decision 3, step 1) — e.g. an `id:: some-id` Obsidian inline field on its own line inside the block. Doesn't change the spec, the id-priority approach, or the task breakdown — any reasonable mechanism slots into "step 1" the same way. Pick one during implementation and document it in the script's own `--help`/header comment.
