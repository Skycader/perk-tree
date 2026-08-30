// ── TIPS DATA ──
// Same shape as notes.js's `notes` array, and referenced the exact same way
// via <tip id="..."> (see js/markdown.js's processTipTags) — the only
// difference is intent: a note is in-universe lore ("Заметки неизвестного"),
// a tip is an out-of-character mechanical clarification. Kept in a separate
// file/array (rather than a `kind` flag inside notes.js) specifically so the
// two are trivial to tell apart while browsing the data, not just on screen.
// See dev-wiki/NOTES_SYSTEM.md for how the whole cross-link/popup system works.
export const tips = [
  {
    id: 'doppler',
    title: '📜 Эффект Допплера',
    content:
      'Когда источник звука или света движется к вам, его волны сжимаются и частота растет (звук становится выше, а свет уходит в синий спектр). Когда он удаляется — волны растягиваются (звук падает, свет краснеет). Именно поэтому рев пролетающей гоночной машины резко меняет тон, а астрономы по «покраснению» света видят, что Вселенная расширяется.',
    author: '— Википедия',
  },
  {
    id: 'water-run',
    title: '📜 Бег по воде',
    content: '<file src="wiki/tips/water-run.md"></file>',
    author: '— Википедия',
  },
];
