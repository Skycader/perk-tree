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
  {
    id: 'visible-spectre',
    title: '📜 Визуальный спектр',
    content: '<file src="wiki/tips/visible-spectre.md"></file>',
    author: '— Википедия',
  },
  {
    id: 'hormones',
    title: '📜 Список гормонов',
    content: '<file src="wiki/tips/hormones.md"></file>',
    author: '— Википедия',
  },
  {
    id: 'hormone-adrenaline',
    title: '📜 Адреналин и норадреналин',
    content: '<file src="wiki/tips/hormones/adrenaline.md"></file>',
    author: '— Википедия',
  },
  {
    id: 'hormone-cortisol',
    title: '📜 Кортизол',
    content: '<file src="wiki/tips/hormones/cortisol.md"></file>',
    author: '— Википедия',
  },
  {
    id: 'hormone-testosterone',
    title: '📜 Тестостерон',
    content: '<file src="wiki/tips/hormones/testosterone.md"></file>',
    author: '— Википедия',
  },
  {
    id: 'hormone-estrogen-progesterone',
    title: '📜 Эстрогены и прогестерон',
    content: '<file src="wiki/tips/hormones/estrogen-progesterone.md"></file>',
    author: '— Википедия',
  },
  {
    id: 'hormone-gonadotropins',
    title: '📜 ФСГ и ЛГ (гонадотропины)',
    content: '<file src="wiki/tips/hormones/gonadotropins.md"></file>',
    author: '— Википедия',
  },
  {
    id: 'hormone-hcg',
    title: '📜 ХГЧ и беременность',
    content: '<file src="wiki/tips/hormones/hcg.md"></file>',
    author: '— Википедия',
  },
  {
    id: 'hormone-dopamine',
    title: '📜 Дофамин',
    content: '<file src="wiki/tips/hormones/dopamine.md"></file>',
    author: '— Википедия',
  },
  {
    id: 'hormone-endorphins',
    title: '📜 Эндорфины',
    content: '<file src="wiki/tips/hormones/endorphins.md"></file>',
    author: '— Википедия',
  },
  {
    id: 'hormone-serotonin',
    title: '📜 Серотонин',
    content: '<file src="wiki/tips/hormones/serotonin.md"></file>',
    author: '— Википедия',
  },
  {
    id: 'hormone-oxytocin',
    title: '📜 Окситоцин',
    content: '<file src="wiki/tips/hormones/oxytocin.md"></file>',
    author: '— Википедия',
  },
  {
    id: 'neurotoxins',
    title: '📜 Таблица нейротоксинов',
    content: '<file src="wiki/tips/neurotoxins.md"></file>',
    author: '— Википедия',
  },
  {
    id: 'intent',
    title: '📜 Намерения (Одрадек)',
    content: '<file src="wiki/tips/intent.md"></file>',
    author: '— Пояснение',
  },
  {
    id: 'moods',
    title: '📜 Настроения',
    content: '<file src="wiki/tips/moods.md"></file>',
    author: '— Пояснение',
  },
  {
    id: 'mentat-intent',
    title: '📜 Намерения (ментат)',
    content: '<file src="wiki/tips/mentat-intent.md"></file>',
    author: '— Пояснение',
  },
  {
    id: 'polygraph',
    title: '📜 Живой полиграф',
    content: '<file src="wiki/tips/polygraph.md"></file>',
    author: '— Пояснение',
  },
  {
    id: 'zombie',
    title: '📜 Зомби',
    content: '<file src="wiki/tips/zombie.md"></file>',
    author: '— Пояснение',
  },
  {
    id: 'noosphere-distortion',
    title: '📜 Явление искажения',
    content: '<file src="wiki/tips/noosphere-distortion.md"></file>',
    author: '— Пояснение',
  },
];
