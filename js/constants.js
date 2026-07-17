// ── COLOUR CYCLE for chapters ──
export const COLOURS = [
  'o',
  'b',
  'o',
  'p',
  'o',
  'r',
  'g',
  'r',
  'b',
  'r',
  'b',
  'y',
  'b',
  'g',
  'g',
  'y',
  'y',
  'p',
  'o',
];
export const COL_HEX = {
  o: '#c87830',
  r: '#a02828',
  b: '#2860a8',
  g: '#208850',
  p: '#6030a8',
  y: '#907820',
  k: '#303030',
};
export const SPINE = '#2e3448';
export const FOCUS_DIM = 0.75; // затемнение фона при фокусе (0–1)

// Дефолтный порядок вторичных окон тултипа. Каждое окно получает
// СЛОТ (1, 2, 3...) — либо явный из perkData.positions, либо
// следующий свободный по этому порядку. Слот НЕ считает основное
// окно уровней — слот 1 это первое доп. окно, слот 2 под ним,
// слот 3 это новый столбик (рядом со слотом 1), и т.д.
export const IPR_GLOW_BLUR = 4; // px — glow blur on <perk> square hover
export const IPR_GLOW_SPREAD = 2; // px — glow spread
export const debugLines = false; // set true to show red connector anchors

export const WINDOW_PRIORITY = ['IMG', 'AUDIO', 'EXTRA', 'TIP', 'COMBO'];

// ── TOOLTIP HEIGHT LIMITS ──
// maxH = min(vh * PERCENT, PX_CAP) so the tooltip never exceeds either bound.
// Raise PX_CAP to remove the hard pixel ceiling (e.g. set to Infinity).
export const MAX_TOOLTIP_HEIGHT_PERCENT = 0.8; // fraction of viewport height
export const MAX_TOOLTIP_HEIGHT_PX = 600; // hard pixel cap (set to Infinity to disable)

// Какой столбик сетки 3×2 занимает окно уровней, в зависимости от
// колонки дерева (0=левая, 1=средняя, 2=правая).
// Остальные 4 слота свободны для вторичных окон.
// Сетка: LT MT RT / LB MB RB
// ── WINDOW PLACEMENT SYSTEM ──
// Columns are numbered 1, 2, 3 (left to right on screen).
// The levels tooltip occupies one column; secondary windows fill the rest top→bottom.
//
// perk row 0 (leftmost):  levels in col 1 → windows fill col 2, then col 3
// perk row 1 (middle):    levels in col 2 → windows fill col 1, then col 3
// perk row 2 (rightmost): levels in col 2 → windows fill col 1, then col 3
//
// positions: {combo: 2} — explicit column override (integer 1/2/3)
// Windows stack top→bottom within a column; overflow → next column.

export const MIN_SECONDARY_H = 80; // minimum px a window needs to be placed

export const SLOT_COL_W = 320; // width of each secondary window
export const SLOT_COL_GAP = 36; // horizontal gap between columns
export const SLOT_ROW_GAP = 16; // vertical gap between windows
export const IMG_MAX_H = 420; // maximum height of img box (px)
export const SOLO_MAX_H = 560; // max height when window is solo in column

// ── WINDOW RENDER DIRECTION ──
// Per-row direction: keys are perk row numbers (1-based in config, 0-based internally).
// 'FROM_LEFT'  — fill nearest column first, then further (default)
// 'FROM_RIGHT' — fill furthest column first, then closer (RTL style)
export const WINDOW_ORDER = {
  1: 'FROM_LEFT', // perk row 1 (leftmost col)
  2: 'FROM_RIGHT', // perk row 2 (middle col)
  3: 'FROM_LEFT', // perk row 3 (rightmost col)
};

// column fill order per perk row (column indices, 1-based)
export const COL_FILL_ORDER_LTR = {
  0: [2, 3],
  1: [1, 3],
  2: [1, 3],
};
export const COL_FILL_ORDER_RTL = {
  0: [3, 2],
  1: [3, 1],
  2: [3, 1],
};
// build COL_FILL_ORDER from WINDOW_ORDER (convert 1-based keys to 0-based)
export const COL_FILL_ORDER = {
  0: (WINDOW_ORDER[1] === 'FROM_RIGHT'
    ? COL_FILL_ORDER_RTL
    : COL_FILL_ORDER_LTR)[0],
  1: (WINDOW_ORDER[2] === 'FROM_RIGHT'
    ? COL_FILL_ORDER_RTL
    : COL_FILL_ORDER_LTR)[1],
  2: (WINDOW_ORDER[3] === 'FROM_RIGHT'
    ? COL_FILL_ORDER_RTL
    : COL_FILL_ORDER_LTR)[2],
};

// which screen column (1/2/3) the levels tooltip occupies
export const LEVELS_SCREEN_COL = { 0: 1, 1: 2, 2: 2 };

export const MEDIA_LOADING_SVG = `<svg class="media-loading-svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="9"></circle>
</svg>`;

// ── BUILT-IN SVG ICONS ──
export const SVG_ICONS = {
  tip: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"
    style="display:inline-block;vertical-align:middle;flex-shrink:0">
    <rect x="1" y="1" width="12" height="12" rx="3" ry="3"
      fill="none" stroke="#8090a0" stroke-width="1.2"/>
    <text x="7" y="10" text-anchor="middle"
      font-family="JetBrains Mono,monospace" font-size="8"
      font-weight="700" fill="#8090a0">i</text>
  </svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"
    style="display:inline-block;vertical-align:middle;flex-shrink:0">
    <rect x="1" y="1" width="12" height="12" rx="3" ry="3"
      fill="rgba(160,40,40,0.18)" stroke="#a03028" stroke-width="1.2"/>
    <text x="7" y="10" text-anchor="middle"
      font-family="JetBrains Mono,monospace" font-size="9"
      font-weight="700" fill="#cc4038">!</text>
  </svg>`,
};

export const LEVEL_COLOURS = [
  '#585e72',
  '#4a7a50',
  '#4a7a50',
  '#5a7a30',
  '#5a7a30',
  '#7a7020',
  '#7a7020',
  '#7a5020',
  '#7a5020',
  '#904030',
  '#a03028',
];

export const COLOUR_KEYS = {
  red: '#cc3838',
  orange: '#e09040',
  yellow: '#b89030',
  blue: '#3e80d0',
  green: '#28a860',
  purple: '#7840c8',
  black: '#282827',
};

// ── STARTUP NOTES POPUP (notes.js) ──
export const NOTES = {
  timer: false, // false = no auto-close countdown, stays until closed manually
  check: false, // false = hide the "show notes on startup" checkbox
};

// ── PAGE LOADER ──
// Simulated minimum loading-screen duration (ms), so the spinner + loader
// tip (see index.html) stay up long enough to actually read — same trick
// big-level loading screens in games use, even after the real work is
// already done. Set to 0 to disable and hide the loader as soon as ready.
export const MIN_LOADER_MS = 5000;

// ── DOCUMENTATION MODAL ──
// Tabs and their source files are declared here. Add/remove entries to
// change what shows up in the modal — tabs, panes, and fetch calls are
// all generated from this list, nothing else needs editing.
export const MODAL = [
  { title: 'Лицензия', src: 'LICENSE' },
  { title: 'Обновления', src: 'CHANGELOG' },
];
