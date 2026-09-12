import { CONFIG } from './load-config.js';
import { notes } from './load-notes.js';
import { tips } from '../configs/default/default.tips.js';
import { resolvePerkInline } from './markdown.js';
import { focusPerkById } from './perk-focus.js';
import { hideTooltip } from './tooltip.js';
import { showNoteLinkPopup, showTipPopup } from './note-link-popup.js';

export const searchToolbar = document.getElementById('search-toolbar');
export const searchOverlay = document.getElementById('search-overlay');
const searchModal = document.getElementById('search-modal');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchPrev = document.getElementById('search-prev');
const searchNext = document.getElementById('search-next');
const searchCounter = document.getElementById('search-counter');

const PAGE_SIZE = 10;

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
let _page = 0;

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
function highlight(text, q) {
  const esc = escapeHtml(text);
  if (!q) return esc;
  const re = new RegExp(escapeRegExp(escapeHtml(q)), 'gi');
  return esc.replace(re, (mm) => `<mark>${mm}</mark>`);
}

function matches(entry, ql) {
  return (
    entry.title.toLowerCase().includes(ql) ||
    entry.text.toLowerCase().includes(ql)
  );
}

function filteredEntries() {
  if (!_query) return [];
  const ql = _query.toLowerCase();
  return _entries.filter((e) => matches(e, ql));
}

function renderCard(entry) {
  const card = document.createElement('div');
  card.className = 'search-card';
  const sqHtml =
    entry.hex != null
      ? `<div class="search-sq" style="background:${entry.hex}"></div>`
      : '';
  card.innerHTML = `${sqHtml}<div class="search-card-content">
    <div class="search-card-title">${highlight(entry.title, _query)}</div>
    <div class="search-card-desc">${highlight(entry.text, _query)}</div>
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

function renderResults() {
  const results = filteredEntries();
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  if (_page >= totalPages) _page = totalPages - 1;
  if (_page < 0) _page = 0;

  searchResults.innerHTML = '';
  if (!_query) {
    searchResults.innerHTML =
      '<div class="search-empty">Начните вводить запрос…</div>';
  } else if (!results.length) {
    searchResults.innerHTML =
      '<div class="search-empty">Ничего не найдено</div>';
  } else {
    const start = _page * PAGE_SIZE;
    results
      .slice(start, start + PAGE_SIZE)
      .forEach((entry) => searchResults.appendChild(renderCard(entry)));
  }

  searchCounter.textContent = results.length
    ? `${_page + 1} / ${totalPages}`
    : '';
  searchPrev.disabled = _page <= 0;
  searchNext.disabled = _page >= totalPages - 1;
}

searchInput.addEventListener('input', () => {
  _query = searchInput.value.trim();
  _page = 0;
  renderResults();
});
searchPrev.addEventListener('click', () => {
  if (_page > 0) {
    _page--;
    renderResults();
  }
});
searchNext.addEventListener('click', () => {
  _page++;
  renderResults();
});

export function showSearchModal() {
  searchModal.classList.add('visible');
  searchOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  _query = '';
  _page = 0;
  searchInput.value = '';
  renderResults();
  searchInput.focus();
}

export function hideSearchModal() {
  searchModal.classList.remove('visible');
  searchOverlay.classList.remove('active');
  document.body.style.overflow = '';
}
