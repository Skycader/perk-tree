## Context

See `proposal.md` - Why for the confirmed root causes. Relevant current state:

- `js/note-link-popup.js`'s `resolveFileTags(content)` is the only place `<file src="...">` gets resolved — it fetches the referenced `.md` file's raw text and substitutes it into `content` in place of the tag, before that whole string is handed to `renderMD()`. It's async, `renderMD`/`renderLevelMD` are not — this is explicitly the one render path in the app that can afford to await (per the existing comment there).
- `.notes-content img` (`css/notes.css`) is already fully styled (responsive, bordered, rounded) — a real `<img>` tag dropped into this content already looks right with zero additional CSS. The only missing piece is producing that `<img>` tag at all from `![[filename]]`.
- `css/notes.css` has rich styling for `p`/`strong`/`em`/`code`/`ul`/`ol`/`li`/`blockquote`/`hr`/`img` under `.notes-content`, but nothing for `table`/`th`/`td`/`tr` — this class is shared by both `#notes-popup` (startup) and `.note-link-popup` (cascading), so one set of rules covers both.
- `css/windows.css` already has an equivalent table treatment under `.win-extra-content` (a different, unrelated content area — perk `extra` text) that can be used as a styling reference for tone/spacing, without literally sharing selectors (these are two independent CSS namespaces for two independent popup systems).

## Goals / Non-Goals

**Goals:**
- `![[filename.ext]]` anywhere in `<file>`-sourced content becomes a real, correctly-styled image.
- Tables in `<file>`-sourced content are legible against the dark theme, matching the app's established visual language.

**Non-Goals:**
- Touching `js/markdown.js`'s `renderMD`/`renderLevelMD` — the embed conversion is specific to text that came from a `<file>` fetch, not a general markdown feature every perk/note/tip needs (nothing else in the app currently authors content with Obsidian embed syntax).
- Supporting Obsidian's `|`-suffixed embed variants (alt text / width) — no current content uses them (see spec.md's Out of Scope).
- A build step, bundler, or new dependency — this is a small regex substitution plus CSS rules, well within the project's existing zero-dependency, vanilla-JS approach.

## Decisions

**1. Convert `![[filename]]` inside `resolveFileTags`, after the fetch, before the text is returned.**
This is the one place that already owns "take raw fetched Obsidian-authored text, prepare it for `renderMD()`" — adding the embed conversion here (rather than inside `renderMD` itself) keeps the change scoped to `<file>`-sourced content specifically, per the Non-Goals above, and avoids adding an Obsidian-specific concern to the general-purpose markdown pipeline every perk description also runs through.

```js
// after fetching `text` for a given <file src> match, before returning it:
text = text.replace(/!\[\[([^\]|]+)\]\]/g, (_, filename) => `![](assets/${filename.trim()})`);
```
Converting to a **standard Markdown image** (`![](assets/filename)`) rather than raw `<img>` HTML is deliberate: it stays inside `renderMD()`'s normal CommonMark path (marked already handles `![]()` → `<img>` with correct escaping), instead of hand-building an HTML string outside the markdown pipeline and risking a different escaping/attribute path than every other image the app renders through markdown.

**2. Resolve bare filenames against `assets/` unconditionally.**
Every image this app already references (`img`/`imgs[]` in configs, the two files this bug report is based on) lives under `assets/`. Obsidian's own embed syntax carries no path — just whichever filename the vault's attachment folder used — so there's no path information to preserve or reinterpret; `assets/` is the only convention this project has for "where images live," and both confirmed real cases already match it.

**3. Table CSS lives in `css/notes.css`, scoped to `.notes-content`, not shared with `css/windows.css`.**
`.notes-content` already covers both notes and tips, startup and cascaded — one set of rules under it reaches every `<file>`-sourced table automatically. Mirroring `css/windows.css`'s `.win-extra-content table` rules in spirit (dark cell backgrounds, thin borders, muted header) but writing independent rules under `.notes-content` — not extending the selector list to add `.notes-content` there — keeps the two popup systems' CSS independent, matching how the rest of `notes.css` already duplicates (rather than imports) styling patterns from elsewhere in the app instead of cross-referencing another stylesheet's classes.

## Risks / Trade-offs

- **[Risk] A future `<file>`-sourced document uses the `|alt`/`|width` embed variant** → Mitigation: the regex only matches `![[name]]` (no `|`), so a piped variant would pass through unmatched and render as literal text, same as today — a visible, not silent, failure mode; extending the regex later is a small, isolated change if this comes up.
- **[Risk] A referenced asset filename doesn't actually exist under `assets/`** → Mitigation: produces a normal broken-image `<img>`, the same non-fatal failure every other missing image reference in the app already has — no new error class introduced.
- **[Trade-off] Duplicating table styling conventions from `css/windows.css` instead of sharing a class** → accepted per Decision 3; these two popup systems have never shared CSS classes across files, and introducing that coupling now for one rule set isn't worth it for two files.
