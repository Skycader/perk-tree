import {
  COL_FILL_ORDER_LTR,
  COL_FILL_ORDER_RTL,
  COL_FILL_ORDER,
  LEVELS_SCREEN_COL,
  SLOT_COL_W,
  SLOT_COL_GAP,
} from './constants.js';
import { scale } from './zoom.js';

// ── DYNAMIC WINDOW FACTORY ──
// Creates a secondary window box + connector SVG and appends to body.
// type: 'img'|'extra'|'tip'|'combo'|'extended'|'audio'
// Returns { box, svg, content } — content is the inner scrollable div.
export const WIN_SVG_STYLE =
  'display:none;position:fixed;left:0;top:0;pointer-events:none;z-index:499;overflow:visible;';
export const WIN_BOX_STYLE =
  'display:none;position:fixed;z-index:500;pointer-events:auto;flex-direction:column;overflow:hidden;';

export function createWin(type, extraClasses = '') {
  const box = document.createElement('div');
  box.className = `win-${type}${extraClasses ? ' ' + extraClasses : ''}`;
  box.style.cssText =
    WIN_BOX_STYLE +
    `width:${scale(SLOT_COL_W)}px;background:#0d0e18;border:1px solid #2a3050;` +
    'box-shadow:0 8px 40px rgba(0,0,0,0.9);';

  const hdr = document.createElement('div');
  hdr.className = 'tt-header';
  box.appendChild(hdr);

  // content area
  const content = document.createElement('div');
  content.className = `win-${type}-content`;
  box.appendChild(content);

  const svg = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  );
  svg.setAttribute('class', 'win-connector-svg');
  svg.style.cssText = WIN_SVG_STYLE;

  document.body.appendChild(box);
  document.body.appendChild(svg);

  return { box, svg, hdr, content };
}

// Destroy all dynamic windows (called by hideTooltip)
export function destroyWins() {
  document
    .querySelectorAll(
      '.win-img,.win-extra,.win-tip,.win-combo,.win-audio,.win-connector-svg',
    )
    .forEach((el) => el.remove());
}

// ── WINDOW PLACEMENT RESOLVER ──
// Returns [{kind, col}] — col is 1/2/3 (screen column).
// positions: {combo: 2} overrides column for that kind.
export function resolveWindowCols(
  activeKinds,
  positions,
  perkRowIdx,
  localOrder,
) {
  // localOrder: 'from_left' | 'from_right' — per-perk override
  // falls back to WINDOW_ORDER[row] → COL_FILL_ORDER
  let fillOrder;
  if (localOrder) {
    const _rtl = localOrder.toLowerCase() === 'from_right';
    fillOrder = (_rtl ? COL_FILL_ORDER_RTL : COL_FILL_ORDER_LTR)[
      perkRowIdx
    ] || [2, 3];
  } else {
    fillOrder = COL_FILL_ORDER[perkRowIdx] || [2, 3];
  }
  const levelsCol = LEVELS_SCREEN_COL[perkRowIdx] || 1;

  // parse explicit positions (integer column)
  const explicitCol = {}; // kind → col number
  if (positions) {
    for (const [k, v] of Object.entries(positions)) {
      const kind = k.toUpperCase();
      const col = parseInt(v);
      if (!isNaN(col) && col >= 1 && col <= 3 && col !== levelsCol) {
        explicitCol[kind] = col;
      }
    }
  }

  const result = [];
  const colUsed = {}; // col → [kinds] (just for tracking)

  for (const kind of activeKinds) {
    if (explicitCol[kind]) {
      result.push({ kind, col: explicitCol[kind] });
    } else {
      // assign to first fill column (overflow handled in runLayout)
      result.push({ kind, col: fillOrder[0] });
    }
    const col = result[result.length - 1].col;
    (colUsed[col] = colUsed[col] || []).push(kind);
  }

  return result;
}

// ── COLUMN X POSITION ──
// Returns {x, side} for a given screen column (1/2/3) relative to mainR.
export function colToX(screenCol, mainR, vwC) {
  // col1 = left of tooltip, col2 = right of tooltip, col3 = further right (or left if no room)
  const levCol = mainR; // levels tooltip rect
  const gap = SLOT_COL_GAP;
  const w = SLOT_COL_W;

  const rightX = levCol.right + gap; // col to the right of levels
  const leftX = levCol.left - gap - w; // col to the left of levels
  const right2X = levCol.right + gap * 2 + w; // second col to the right
  const left2X = levCol.left - gap * 2 - w * 2; // second col to the left

  let x, side;
  // We don't know which physical column (left/right) maps to screen col 1/2/3
  // without knowing perkRowIdx — caller passes pre-resolved x via colXMap.
  // This function is called with already-resolved x; kept for reference.
  // Actual resolution is in runLayout via colXMap.
  return { x: rightX, side: 'right' }; // fallback
}
