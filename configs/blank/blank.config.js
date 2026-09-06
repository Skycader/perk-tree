// ── BLANK CONFIG TEMPLATE ──
// Minimal, structurally-complete CONFIG — every top-level key the app
// actually reads is present (see configs/default/default.config.js for the
// full reference shape), but content is placeholder/example only. Meant as
// a clean start for a brand-new perk tree, loaded via ?configName=blank —
// see js/load-config.js.
export const CONFIG = {
  shadowName: 'Новый Стэнд',
  desc: 'Описание нового стэнда.',
  version: '0.1',
  user: '',
  range_columns: ['RANGE', 'NAME', 'LOGO'],
  tags: {
    title: 'Альтернативные имена',
    array: [],
  },
  spectre: {
    red: '',
    orange: '',
    yellow: '',
    blue: '',
    green: '',
    purple: '',
    black: '',
  },

  skills: [
    {
      chapterTitle: '1. Пример главы',
      color: 'Orange',
      perks: [
        {
          id: 'examplePerk',
          name: 'Пример перка',
          description: 'Описание примера перка.',
        },
      ],
    },
  ],

  ranks: [{ lvl: 1, name: 'Ранг 1', badge: '◽️' }],

  vulns: [],

  skillLevelDescriptions: {
    examplePerk: {
      0: 'Уровень 0.',
    },
  },
};
