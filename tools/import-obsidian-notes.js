#!/usr/bin/env node
// ── Obsidian notes.md → default.notes.js ──
// Simplest possible converter: one input .md file, one output .js file.
// Usage: node tools/import-obsidian-notes.js [input.md] [output.js]
//   input.md  default: notes.md (current directory)
//   output.js default: configs/default/default.notes.js
//
// Input format (one note per `# Heading`, repeated in the same file):
//   # 📜 Title
//
//   > Body text, may contain [[#Other Title|label]] links and ==highlights==.
//   >
//   > — Author line
//
// The blockquote's last "— ..." line becomes `author`; everything else in
// the blockquote becomes `content`. `[[#Title|label]]` is resolved against
// every other title in the same file and turned into
// `<note id="...">label</note>` — `id` is a kebab-case transliteration of
// the target title (leading emoji stripped), matching this project's
// existing convention in default.notes.js.
const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || 'notes.md';
const outputPath =
  process.argv[3] || path.join('configs', 'default', 'default.notes.js');

const raw = fs.readFileSync(inputPath, 'utf8');

// ── strip markdown emphasis from a title ──
// Titles are shown as plain .textContent everywhere in the app (never
// markdown-rendered), unlike `content`, which goes through renderMD(). None
// of the existing hand-authored notes have markdown in their title, so any
// **bold**/==highlight==/_italic_ marks Obsidian let the author add to a
// heading must come out here, or they show up as literal asterisks/equals
// signs in the UI.
function stripEmphasis(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/==(.+?)==/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/(?<![*\w])\*(.+?)\*(?!\w)/g, '$1')
    .replace(/(?<![_\w])_(.+?)_(?!\w)/g, '$1');
}

// ── split into blocks at each top-level heading ──
const lines = raw.split(/\r?\n/);
const blocks = [];
for (const line of lines) {
  if (/^#\s+/.test(line)) {
    const title = stripEmphasis(line.replace(/^#\s+/, '').trim());
    blocks.push({ title, bodyLines: [] });
  } else if (blocks.length) {
    blocks[blocks.length - 1].bodyLines.push(line);
  }
}

// ── cyrillic → latin transliteration (matches ids already in default.notes.js) ──
const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
function slugify(title) {
  const noEmoji = title.replace(/\p{Extended_Pictographic}/gu, '');
  const translit = [...noEmoji.toLowerCase()]
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join('');
  return translit
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── extract content/author from each block's blockquote body ──
// A blank `>` line is a PARAGRAPH BREAK in the source, not filler to
// discard — losing that distinction was the bug: everything got joined
// with a single space, collapsing 3 paragraphs into 1. Real newlines are
// used between paragraphs (`\n\n`) here specifically because renderMD()
// runs the content through marked.parse(), which treats a blank line as a
// new <p> — no custom <line-break> tag needed for plain paragraph breaks,
// only for a forced mid-paragraph hard break.
function extractContentAndAuthor(bodyLines) {
  const quotedRaw = bodyLines
    .filter((l) => l.trim().startsWith('>'))
    .map((l) => l.replace(/^\s*>\s?/, ''));

  const paragraphs = [];
  let current = [];
  for (const line of quotedRaw) {
    if (line.trim() === '') {
      if (current.length) {
        paragraphs.push(current.join(' ').trim());
        current = [];
      }
    } else {
      current.push(line.trim());
    }
  }
  if (current.length) paragraphs.push(current.join(' ').trim());

  let author = null;
  let contentParagraphs = paragraphs;
  const last = paragraphs[paragraphs.length - 1];
  if (last && /^[—-]\s*/.test(last)) {
    author = last;
    contentParagraphs = paragraphs.slice(0, -1);
  }
  return { content: contentParagraphs.join('\n\n'), author };
}

// ── pass 1: build title -> id map ──
const titleToId = new Map();
for (const block of blocks) {
  titleToId.set(block.title, slugify(block.title));
}

// warn on id collisions — cheap safety, no extra machinery
const seen = new Map();
for (const [title, id] of titleToId) {
  if (seen.has(id)) {
    console.warn(
      `[import-obsidian-notes] id collision "${id}": "${seen.get(id)}" and "${title}"`,
    );
  }
  seen.set(id, title);
}

// ── pass 2: parse content/author + resolve [[#Title|label]] links ──
const WIKILINK = /\[\[#([^\]|]+?)(?:\|([^\]]+))?\]\]/g;

const notes = blocks.map((block) => {
  const { content, author } = extractContentAndAuthor(block.bodyLines);
  const resolvedContent = content.replace(WIKILINK, (full, targetTitle, label) => {
    // strip the same way the title map's keys were built (Обsidian lets
    // the link target itself carry **bold**/etc, e.g. [[#📜 **Аксиома**]])
    // — without this the lookup key never matches the stripped title.
    const target = stripEmphasis(targetTitle.trim());
    const id = titleToId.get(target);
    if (!id) {
      console.warn(
        `[import-obsidian-notes] dangling link in "${block.title}": [[#${target}]] has no matching heading`,
      );
      return label || target;
    }
    return `<note id="${id}">${(label || target).trim()}</note>`;
  });
  return {
    id: titleToId.get(block.title),
    title: block.title,
    content: resolvedContent,
    author,
  };
});

// ── serialize ──
function jsString(text) {
  if (text.includes('\n')) {
    return '`' + text.replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
  }
  return "'" + text.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

const entries = notes.map((n) => {
  const fields = [
    `    id: ${jsString(n.id)},`,
    `    title: ${jsString(n.title)},`,
    `    content: ${jsString(n.content)},`,
  ];
  if (n.author) fields.push(`    author: ${jsString(n.author)},`);
  return `  {\n${fields.join('\n')}\n  },`;
});

const output = `export const notes = [\n${entries.join('\n')}\n];\n`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output, 'utf8');

console.log(`[import-obsidian-notes] wrote ${notes.length} notes to ${outputPath}`);
