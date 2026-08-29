// ── TIPS DATA ──
// Same shape as notes.js's `notes` array, and referenced the exact same way
// via <tip id="..."> (see js/markdown.js's processTipTags) — the only
// difference is intent: a note is in-universe lore ("Заметки неизвестного"),
// a tip is an out-of-character mechanical clarification. Kept in a separate
// file/array (rather than a `kind` flag inside notes.js) specifically so the
// two are trivial to tell apart while browsing the data, not just on screen.
// See dev-wiki/NOTES_SYSTEM.md for how the whole cross-link/popup system works.
export const tips = [
  // {
  //   id: 'example-tip',
  //   title: '💡 Пример подсказки',
  //   content: 'Текст пояснения. Поддерживает markdown и вложенные <tip id="...">/<note id="...">/[[...]] ссылки, как и notes.js.',
  // },
];
