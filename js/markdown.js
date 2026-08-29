import { STAND_DATA } from '../config.js';
import { SVG_ICONS } from './constants.js';
import { notes } from '../notes.js';
import { tips } from '../tips.js';

// Resolve a perk id → {name, hex} for inline <perk> tags.
export function resolvePerkInline(pid) {
  const COLOR_HEX = {
    o: '#e09040',
    r: '#cc3838',
    b: '#3e80d0',
    g: '#28a860',
    p: '#7840c8',
    y: '#b89030',
    k: '#303030',
    orange: '#e09040',
    red: '#cc3838',
    blue: '#3e80d0',
    green: '#28a860',
    purple: '#7840c8',
    yellow: '#b89030',
    black: '#303030',
  };
  for (const skill of STAND_DATA.skills) {
    const found = skill.perks.find((pp) => pp.id === pid);
    if (found) {
      const hex = COLOR_HEX[(skill.color || '').toLowerCase()] || '#888';
      return { name: found.name, hex };
    }
  }
  return { name: pid, hex: '#888' };
}

// Replace <perk>id</perk> with a clickable coloured square + hover popup.

// Cache for fetched external SVGs
const _svgCache = {};

// Process <svg>path</svg> and <svg name="id"></svg> in already-rendered HTML.
// External SVGs are fetched async and replaced in the DOM after insert.
export function processSvgTags(html) {
  // named icons: <svg name="tip"></svg>
  html = html.replace(/<svg\s+name="([^"]+)"\s*><\/svg>/gi, (_, name) => {
    const icon = SVG_ICONS[name.trim()];
    return icon || '';
  });
  // external: <svg>assets/icon.svg</svg> — replaced with placeholder, fetched async
  html = html.replace(/<svg>([^<]+\.svg)<\/svg>/gi, (_, src) => {
    const id = 'svg-placeholder-' + Math.random().toString(36).slice(2);
    const s = src.trim();
    if (_svgCache[s]) return _svgCache[s];
    // async fetch after DOM insert
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      fetch(s)
        .then((r) => (r.ok ? r.text() : ''))
        .then((txt) => {
          _svgCache[s] = txt;
          if (el.parentNode) el.outerHTML = txt;
        })
        .catch(() => {
          if (el.parentNode) el.remove();
        });
    });
    return `<span id="${id}" style="display:inline-block;width:14px;height:14px"></span>`;
  });
  return html;
}

// Replace ==text== with <mark>text</mark> (marked has no native syntax for this).
export function processHighlightTags(html) {
  return html.replace(/==([^=\n]+?)==/g, '<mark>$1</mark>');
}

// Shared by processNoteTags/processTipTags and processWikiLinkTags below —
// all resolve to the same clickable span (see note-link-popup.js), just via
// different reference syntaxes/kinds. `kind` picks the popup data source
// note-link-popup.js reads from (notes.js vs tips.js) — a note is
// in-universe lore, a tip is an out-of-character mechanical clarification.
// `labelSource` is always raw, un-rendered markdown text (neither caller
// has had marked touch it yet), hence the explicit parseInline call.
//
// Default color: no CSS is set here at all — .inline-note-ref (base.css)
// reads var(--perk-accent-color), which tooltip.js's showTooltip() sets to
// whatever perk's tooltip is currently open, falling back to the original
// purple when none is. `colorAttr === 'main'` is the explicit escape hatch
// back to that fixed purple regardless of context — see .inline-ref--main.
function buildNoteRefSpan(kind, refId, labelSource, colorAttr) {
  const innerHtml =
    typeof marked !== 'undefined'
      ? marked.parseInline(labelSource.trim())
      : labelSource.trim();
  let cls = kind === 'tip' ? 'inline-note-ref inline-tip-ref' : 'inline-note-ref';
  if (colorAttr === 'main') cls += ' inline-ref--main';
  const dataAttr = kind === 'tip' ? 'data-tip-id' : 'data-note-id';
  return `<span class="${cls}" ${dataAttr}="${refId}">${innerHtml}</span>`;
}

// Pulls id="..." and an optional color="..." out of a tag's raw attribute
// string, order-independent (so both <note id="x" color="main"> and
// <note color="main" id="x"> work).
function parseRefAttrs(attrs) {
  const id = attrs.match(/\bid="([^"]+)"/)?.[1] || null;
  const color = attrs.match(/\bcolor="([^"]+)"/)?.[1] || null;
  return { id, color };
}

// Replace <note id="chelovecheskaya-dusha">**крохотных**</note> with a
// clickable purple-highlighted span that opens the matching notes.js entry
// as a linked popup. marked already left the tag untouched (raw HTML
// passthrough, same as <perk> below), inner text included — so
// buildNoteRefSpan's own parseInline call is what renders any markdown
// inside the label.
export function processNoteTags(html) {
  return html.replace(
    /<note\s+([^>]*)>([\s\S]*?)<\/note>/gi,
    (full, attrs, inner) => {
      const { id, color } = parseRefAttrs(attrs);
      return id ? buildNoteRefSpan('note', id, inner, color) : full;
    },
  );
}

// Same as processNoteTags, but for out-of-character mechanical tips
// (tips.js) instead of in-universe lore — <tip id="...">label</tip>.
// Kept as a distinct tag (not a `kind` attribute on <note>) purely so the
// two read as visually/semantically different at the authoring site too.
export function processTipTags(html) {
  return html.replace(
    /<tip\s+([^>]*)>([\s\S]*?)<\/tip>/gi,
    (full, attrs, inner) => {
      const { id, color } = parseRefAttrs(attrs);
      return id ? buildNoteRefSpan('tip', id, inner, color) : full;
    },
  );
}

// Wiki-link-style alternative to <note>, resolved by title or id:
//   [[#Some Note Title|displayed label]]  — looked up by note.title
//   [[id:some-note-id|displayed label]]   — looked up by note.id directly
// Unlike processNoteTags, this runs BEFORE marked.parse (see renderMD/
// renderLevelMD) — [[ ]] isn't valid CommonMark syntax marked would pass
// through untouched the way it does real HTML tags, so it's resolved to the
// same span markup pre-parse instead, before marked's own link/reference
// parsing gets a chance to touch the double brackets. Title lookup tries an
// exact trim() match first, then falls back to a case-insensitive one (note
// titles carry a leading emoji that's easy to mistype the case of).
// An unresolved reference degrades to its plain label text rather than
// breaking the surrounding render.
export function processWikiLinkTags(text) {
  return text.replace(
    /\[\[([^\]|]+)\|([^\]]+)\]\]/g,
    (_, selector, label) => {
      selector = selector.trim();
      let noteId = null;
      if (selector.startsWith('#')) {
        const title = selector.slice(1).trim();
        const match =
          notes.find((n) => (n.title || '').trim() === title) ||
          notes.find(
            (n) => (n.title || '').trim().toLowerCase() === title.toLowerCase(),
          );
        noteId = match ? match.id : null;
      } else if (selector.startsWith('id:')) {
        noteId = selector.slice(3).trim();
      }
      return noteId ? buildNoteRefSpan('note', noteId, label) : label;
    },
  );
}

export function processPerkTags(html) {
  // New syntax: <perk name="standVisor">optional label</perk>
  // Old syntax: <perk>standVisor</perk> (still supported for compat)
  return html.replace(
    /<perk(?:\s+name="([^"]+)")?\s*>([^<]*)<\/perk>/gi,
    (_, attrId, inner) => {
      const pid = (attrId || inner).trim();
      const label = attrId ? inner.trim() : ''; // text only for new syntax
      const { name: perkName, hex } = resolvePerkInline(pid);
      const displayText = label || perkName;
      return `<span class="inline-perk-ref" data-rid="${pid}" data-hex="${hex}"
      style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;vertical-align:middle;">
      <span class="ipr-sq" style="display:inline-block;width:8px;height:8px;background:${hex};border-radius:1px;flex-shrink:0;transition:box-shadow .2s"></span>
      ${displayText ? `<span class="ipr-label" style="color:inherit;transition:color .2s;font-size:inherit;">${displayText}</span>` : ''}
    </span>`;
    },
  );
}

// Strip the common leading whitespace that template-literal config values
// pick up from matching the surrounding object's indentation in the source
// file (e.g. `extra: \`text...\n          more text\`` — the 10 spaces are
// a source-formatting artifact, not part of the actual content). Without
// this, a second paragraph indented 4+ spaces after a blank line gets
// misread by CommonMark as an indented code block. The first line is
// ignored when computing the common indent since it always starts at the
// opening backtick with zero indentation, regardless of the rest.
function dedent(text) {
  const lines = text.split('\n');
  if (lines.length < 2) return text;
  let minIndent = Infinity;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    minIndent = Math.min(minIndent, lines[i].match(/^[ \t]*/)[0].length);
  }
  if (!isFinite(minIndent) || minIndent === 0) return text;
  return lines
    .map((line) => line.slice(Math.min(line.match(/^[ \t]*/)[0].length, minIndent)))
    .join('\n');
}

// Lightweight MD renderer for level description rows — avoids wrapping
// everything in <p> blocks which inflate scrollHeight and break layout.
// Uses parseInline for simple text, full parse only when block MD detected.
export function renderLevelMD(text) {
  if (!text) return '';
  const preprocessed = processWikiLinkTags(
    dedent(text)
      .replace(/<line-break\s*\/?>(<\/line-break>)?/gi, '<br>')
      .replace(
        /<empty-line\s*\/?>(<\/empty-line>)?/gi,
        '<span class="md-blank-line"></span>',
      ),
  );
  const hasBlock = /^\s*(#{1,6} |[*\-+] |\d+\. |>|\|.*\|)/m.test(
    preprocessed,
  );
  let html;
  if (typeof marked !== 'undefined') {
    html = hasBlock
      ? marked.parse(preprocessed)
      : marked.parseInline(preprocessed);
  } else {
    html = preprocessed.replace(/\n/g, '<br>');
  }
  return processSvgTags(
    processPerkTags(
      processTipTags(processNoteTags(processHighlightTags(html))),
    ),
  );
}

export function renderMD(text) {
  if (!text) return '';
  // normalise explicit line-break tags and \n before markdown parsing
  let preprocessed = processWikiLinkTags(
    dedent(text)
      .replace(/<line-break\s*\/?>(<\/line-break>)?/gi, '  \n') // → MD hard break
      .replace(
        /<empty-line\s*\/?>(<\/empty-line>)?/gi,
        '<span class="md-blank-line"></span>',
      )
      .replace(/\\n/g, '  \n'), // literal \n in config strings → MD hard break
  );
  let html;
  if (typeof marked !== 'undefined') {
    html = marked.parse(preprocessed);
  } else {
    html = preprocessed.replace(/\n/g, '<br>');
  }
  return processSvgTags(
    processPerkTags(
      processTipTags(processNoteTags(processHighlightTags(html))),
    ),
  );
}
