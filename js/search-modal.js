import { CONFIG } from './load-config.js';
import { notes } from './load-notes.js';
import { tips } from '../configs/default/default.tips.js';
import { resolvePerkInline, renderMD, renderLevelMD } from './markdown.js';
import { focusPerkById } from './perk-focus.js';
import { hideTooltip } from './tooltip.js';
import { showNoteLinkPopup, showTipPopup } from './note-link-popup.js';

export const searchToolbar = document.getElementById('search-toolbar');
export const searchOverlay = document.getElementById('search-overlay');
const searchModal = document.getElementById('search-modal');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchCounter = document.getElementById('search-counter');

// ── BUILD SEARCH INDEX (once, at module load — see design.md) ──

function buildAbilityEntries() {
  const entries = [];
  CONFIG.skills.forEach((ch) => {
    ch.perks.forEach((p) => {
      entries.push({
        type: 'ability',
        id: p.id,
        title: p.name || '',
        text: p.description || '',
        hex: resolvePerkInline(p.id).hex,
      });
    });
  });
  return entries;
}

function buildComboEntries() {
  const entries = [];
  const lvlDescs = CONFIG.skillLevelDescriptions || {};
  Object.entries(lvlDescs).forEach(([hostId, lvlData]) => {
    const combo = lvlData?.combo;
    if (!combo) return;
    Object.entries(combo).forEach(([partnerId, info]) => {
      const desc = info?.desc || '';
      // leading ==Name== marker gives an explicit combo title (the same
      // ==text== convention markdown.js turns into <mark> elsewhere in the
      // app, but only a LEADING match counts as a title here — it also
      // appears mid-sentence for unrelated emphasis, see design.md).
      const m = /^==([^=\n]+)==\s*/.exec(desc);
      const title = m
        ? m[1].trim()
        : `Комбо: ${resolvePerkInline(partnerId).name}`;
      const text = m ? desc.slice(m[0].length) : desc;
      entries.push({
        // click target is the HOST perk — the only place this combo
        // actually renders in the tree (see design.md)
        type: 'combo',
        id: hostId,
        title,
        text,
        hex: resolvePerkInline(hostId).hex,
      });
    });
  });
  return entries;
}

function buildNoteEntries() {
  return notes.map((n) => ({
    type: 'note',
    id: n.id,
    title: n.title || '',
    text: n.content || '',
  }));
}

// Every current tips.js entry stores its body as <file src="....md"></file>
// (see js/note-link-popup.js's resolveFileTags — the runtime resolver for
// this tag when a tip popup actually opens) rather than inline text.
// Indexing that literal tag string would mean "search by content" never
// matches anything real for a wiki article — this fetches the referenced
// file directly so the actual article text is searchable. Independent of
// resolveFileTags: that function also handles in-flight-request
// cancellation and Obsidian-embed conversion for rendering, neither of
// which a plain-text search index needs.
const FILE_TAG = /<file\s+src="([^"]+)"\s*>\s*<\/file>/i;
async function resolveTipText(content) {
  const m = FILE_TAG.exec(content);
  if (!m) return content;
  try {
    const res = await fetch(m[1]);
    if (!res.ok) throw new Error(String(res.status));
    return await res.text();
  } catch (e) {
    return `⚠ Не удалось загрузить ${m[1]}`;
  }
}
async function buildTipEntries() {
  return Promise.all(
    tips.map(async (t) => ({
      type: 'tip',
      id: t.id,
      title: t.title || '',
      text: await resolveTipText(t.content || ''),
    })),
  );
}

const indexPromise = (async () => {
  const [abilities, combos, noteEntries, tipEntries] = await Promise.all([
    buildAbilityEntries(),
    buildComboEntries(),
    buildNoteEntries(),
    buildTipEntries(),
  ]);
  return [...abilities, ...combos, ...noteEntries, ...tipEntries];
})();

let _entries = [];
indexPromise.then((entries) => {
  _entries = entries;
  // covers the (rare, local-fetch-speed) race where the user opens search
  // and types before the tip fetches above have resolved
  if (searchModal.classList.contains('visible')) renderResults();
});

// ── FILTER + RENDER ──
let _query = '';

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// title: plain text, escaped then highlighted
function highlightPlain(text, q) {
  const esc = escapeHtml(text);
  if (!q) return esc;
  const re = new RegExp(escapeRegExp(escapeHtml(q)), 'gi');
  return esc.replace(re, (mm) => `<mark>${mm}</mark>`);
}
// description/content: wrap matches in <mark> in the RAW markdown text
// first (same trick markdown.js's own ==text==→<mark> conversion relies
// on — marked leaves inline HTML like <mark> untouched), THEN render
// through the same renderer this content uses everywhere else in the app,
// so cards show real formatting instead of literal **/== markers. Escaping
// of plain-text runs is left to that renderer, exactly as for every other
// piece of user content in this app — not hand-rolled here.
function markMatches(text, q) {
  if (!q) return text;
  const re = new RegExp(escapeRegExp(q), 'gi');
  return text.replace(re, (mm) => `<mark>${mm}</mark>`);
}
const DESC_RENDERER = {
  ability: renderLevelMD, // matches tree.js's own perk-desc rendering
  combo: renderMD, // matches tooltip.js's renderComboRow
  note: renderMD, // matches note-link-popup.js's popup content
  tip: renderMD,
};

// Cards are a compact preview, not the real detail view (which the user
// reaches by clicking through) — images and tables are replaced with a
// short "there's one here" placeholder instead of being rendered, so a
// card's height reflects its actual TEXT (now shown in full, uncapped —
// see .search-card-desc) rather than however tall an embedded image or
// table happens to be, and so the modal never pays for image decode/table
// layout work across what can be ~200 rendered cards at once.
const IMAGE_PLACEHOLDER =
  '<span class="search-media-placeholder" title="Изображение — откройте, чтобы посмотреть">🖼️ Изображение</span>';
const TABLE_PLACEHOLDER =
  '<span class="search-media-placeholder" title="Таблица — откройте, чтобы посмотреть">📊 Таблица</span>';
// <table> only ever comes from marked's own GFM table parsing (real <img>
// tags don't currently occur in this app's description/content text either,
// but are handled for safety); Obsidian's ![[file]] embed syntax isn't
// CommonMark, so marked leaves it as literal text — caught directly here
// rather than first converting it to a real <img> just to strip it again.
function replaceHeavyMedia(html) {
  return html
    .replace(/<table[\s\S]*?<\/table>/gi, TABLE_PLACEHOLDER)
    .replace(/<img\b[^>]*>/gi, IMAGE_PLACEHOLDER)
    .replace(/!\[\[[^\]]+\]\]/g, IMAGE_PLACEHOLDER)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, IMAGE_PLACEHOLDER);
}

function renderDesc(entry) {
  const html = (DESC_RENDERER[entry.type] || renderMD)(
    markMatches(entry.text, _query),
  );
  return replaceHeavyMedia(html);
}

function matches(entry, ql) {
  return (
    entry.title.toLowerCase().includes(ql) ||
    entry.text.toLowerCase().includes(ql)
  );
}

// empty query = browse everything, unfiltered — lets the user see the full
// content set without typing anything (see design.md)
// type checkboxes (#search-filters). Wiki articles ('tip') share the
// "Заметки" checkbox — the UI lists three kinds, not four.
const _filters = { ability: true, combo: true, note: true };
const TYPE_TO_FILTER = { ability: 'ability', combo: 'combo', note: 'note', tip: 'note' };

function filteredEntries() {
  const ql = _query.toLowerCase();
  return _entries.filter(
    (e) => _filters[TYPE_TO_FILTER[e.type]] && (!ql || matches(e, ql)),
  );
}

document.querySelectorAll('#search-filters input[data-filter]').forEach((cb) => {
  cb.addEventListener('change', () => {
    _filters[cb.dataset.filter] = cb.checked;
    renderResults();
  });
});

function renderCard(entry) {
  const card = document.createElement('div');
  // .note-link-trigger: exempts this card from note-link-popup.js's
  // "click outside closes everything" listener — see the comment there.
  // Harmless on ability/combo cards too (that listener only acts when a
  // note/tip popup is already open), so applied unconditionally rather
  // than branching on entry.type.
  card.className = 'search-card note-link-trigger';
  const sqHtml =
    entry.hex != null
      ? `<div class="search-sq" style="background:${entry.hex}"></div>`
      : '';
  // note/tip content is long-form lore/wiki text that can run to several
  // thousand characters (a full note is one click away via the card
  // itself) — capped with a visible fade + "…" below, once its real
  // height is known (see renderResults). Ability/combo descriptions are
  // never long enough in practice to need this and stay fully uncapped —
  // clamping them was the original bug (a short combo description getting
  // cut mid-sentence at a much tighter, blanket cap).
  const clampCandidate = entry.type === 'note' || entry.type === 'tip';
  card.innerHTML = `${sqHtml}<div class="search-card-content">
    <div class="search-card-title">${highlightPlain(entry.title, _query)}</div>
    <div class="search-card-desc"${clampCandidate ? ' data-clamp-candidate' : ''}>${renderDesc(entry)}</div>
  </div>`;
  card.addEventListener('click', () => {
    if (entry.type === 'ability' || entry.type === 'combo') {
      hideSearchModal();
      hideTooltip();
      focusPerkById(entry.id);
    } else if (entry.type === 'note') {
      showNoteLinkPopup(card, entry.id);
    } else if (entry.type === 'tip') {
      showTipPopup(card, entry.id);
    }
  });
  return card;
}

// note/tip descriptions taller than this get clamped with a fade + "…" —
// generous enough that every current ability/combo description (never a
// clamp candidate anyway) and any short note fits without ever showing the
// affordance; only genuinely long-form lore (thousands of characters) hits
// it. Measured in JS, not via CSS-only line-clamp, because content here can
// include block elements (multiple <p>, <ul>, the media placeholders) that
// -webkit-line-clamp doesn't reliably clip across browsers (see the
// pagination-removal change's own note on this).
const DESC_CLAMP_PX = 152; // ~9.5rem

function renderResults() {
  const results = filteredEntries();

  searchResults.innerHTML = '';
  if (!results.length) {
    searchResults.innerHTML =
      '<div class="search-empty">Ничего не найдено</div>';
  } else {
    results.forEach((entry) => searchResults.appendChild(renderCard(entry)));
    // real (unclamped) height is only knowable once laid out in the DOM —
    // apply the cap in a second pass rather than guessing at build time.
    searchResults
      .querySelectorAll('.search-card-desc[data-clamp-candidate]')
      .forEach((el) => {
        if (el.scrollHeight > DESC_CLAMP_PX) el.classList.add('clamped');
      });
  }

  searchCounter.textContent = `${results.length} результат${pluralSuffix(results.length)}`;
}

// ru plural forms: 1 результат / 2-4 результата / 0,5-... результатов
function pluralSuffix(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return '';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'а';
  return 'ов';
}

searchInput.addEventListener('input', () => {
  _query = searchInput.value.trim();
  renderResults();
});

export function showSearchModal() {
  searchModal.classList.add('visible');
  searchOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  _query = '';
  searchInput.value = '';
  renderResults();
  searchInput.focus();
}

export function hideSearchModal() {
  searchModal.classList.remove('visible');
  searchOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// F opens search from anywhere — guarded by the currently focused element
// (not by whether the modal is already open) so typing the letter "f" into
// any text field, including the search input itself, never re-triggers it.
// Matched by e.code (physical key position), not e.key (the character the
// active layout produces) — on a Russian ЙЦУКЕН layout, e.g., this same
// physical key produces "а", not "f", so an e.key check would never fire
// for anyone not on a Latin layout.
// preventDefault matters here even though this fires on a non-input
// element: showSearchModal() moves focus to searchInput as part of this
// same keydown, and the browser still delivers this key's default text-
// insertion action to whatever element ends up focused when the event
// finishes — without this, the "f" that opened search also lands in the
// now-focused search box as its first character.
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyF') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable))
    return;
  e.preventDefault();
  showSearchModal();
});
