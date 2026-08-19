import { COL_HEX, SPINE } from './constants.js';

// ── SVG CONNECTOR DRAWING ──
export function svgLine(x1, y1, x2, y2, stroke, sw = 1.5) {
  const l = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'line',
  );
  l.setAttribute('x1', x1);
  l.setAttribute('y1', y1);
  l.setAttribute('x2', x2);
  l.setAttribute('y2', y2);
  l.setAttribute('stroke', stroke);
  l.setAttribute('stroke-width', sw);
  return l;
}
export function svgArrowRight(svg, x, y, fill) {
  const p = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'polygon',
  );
  p.setAttribute(
    'points',
    `${x},${y} ${x - 5},${y - 3} ${x - 5},${y + 3}`,
  );
  p.setAttribute('fill', fill);
  svg.appendChild(p);
}
export function svgArrowDown(svg, x, y, fill) {
  const p = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'polygon',
  );
  p.setAttribute(
    'points',
    `${x},${y} ${x - 4},${y - 7} ${x + 4},${y - 7}`,
  );
  p.setAttribute('fill', fill);
  svg.appendChild(p);
}

export function relTop(el, ancestor) {
  let t = 0,
    cur = el;
  while (cur && cur !== ancestor) {
    t += cur.offsetTop;
    cur = cur.offsetParent;
  }
  return t;
}

export function drawColumn({ connEl, connSvg, contentEl, chRefs, spineSvg }) {
  const CONN = 22;
  const mx = CONN / 2;

  // measure everything relative to connEl (same top as contentEl since they are flex siblings)
  const base = connEl.getBoundingClientRect().top;

  function yOf(el, offset) {
    const r = el.getBoundingClientRect();
    return r.top - base + offset;
  }
  function midOf(el) {
    return yOf(el, el.offsetHeight / 2);
  }
  function iconOf(el) {
    return yOf(el, 15);
  }

  // collect targets
  const targets = [];
  chRefs.forEach(({ hdr, pw, c }) => {
    targets.push({ y: midOf(hdr), isHdr: true, c });
    pw.querySelectorAll('.perk').forEach((p) => {
      targets.push({ y: iconOf(p), isHdr: false, c });
    });
  });
  if (!targets.length) return;

  // total svg height = bottom of last target + small padding
  const svgH = targets[targets.length - 1].y + 20;
  connEl.style.height = svgH + 'px';
  connSvg.innerHTML = '';
  connSvg.setAttribute('viewBox', `0 0 ${CONN} ${svgH}`);

  // 1. grey gap segments between chapters (drawn first = behind)
  for (let i = 0; i < chRefs.length - 1; i++) {
    const lastPerk = Array.from(
      chRefs[i].pw.querySelectorAll('.perk'),
    ).pop();
    const nextHdr = chRefs[i + 1].hdr;
    if (!lastPerk || !nextHdr) continue;
    connSvg.appendChild(
      svgLine(mx, iconOf(lastPerk), mx, midOf(nextHdr), '#50556a'),
    );
  }

  // 2. coloured vertical spine within each chapter (drawn second = in front of grey)
  chRefs.forEach(({ hdr, pw, c }) => {
    const col = COL_HEX[c] || SPINE;
    const perks = Array.from(pw.querySelectorAll('.perk'));
    const spineT = midOf(hdr);
    const spineB = perks.length
      ? iconOf(perks[perks.length - 1])
      : spineT;
    connSvg.appendChild(svgLine(mx, spineT, mx, spineB, col));
  });

  // 3. branches + arrowheads (drawn last = on top)
  targets.forEach(({ y, isHdr, c }) => {
    const col = COL_HEX[c] || SPINE;
    connSvg.appendChild(svgLine(mx, y, isHdr ? CONN : CONN - 3, y, col));
    if (!isHdr) svgArrowRight(connSvg, CONN + 1, y, col);
  });
}

export function drawTopBus() {
  const old = document.getElementById('top-bus-svg');
  if (old) old.remove();

  const mainArea = document.getElementById('main-area');
  const titleBox = document.getElementById('title-box');
  const anBox2 = document.getElementById('altnames-box');
  const spacer = document.getElementById('bus-spacer');
  const colsRowEl = document.getElementById('cols-row');
  if (!mainArea || !titleBox || !spacer || !colsRowEl) return;
  mainArea.style.position = 'relative';

  // All coords relative to mainArea using offsetLeft/offsetTop
  function off(el) {
    let l = 0,
      t = 0,
      cur = el;
    while (cur && cur !== mainArea) {
      l += cur.offsetLeft;
      t += cur.offsetTop;
      cur = cur.offsetParent;
    }
    return {
      left: l,
      top: t,
      right: l + el.offsetWidth,
      bottom: t + el.offsetHeight,
      w: el.offsetWidth,
      h: el.offsetHeight,
    };
  }

  const tb = off(titleBox);
  // css/mobile.css hides altnames-box (display:none) below ~768px — a
  // hidden element's offsetLeft/offsetWidth are always 0, which without
  // this check fed a bogus (0,0) source point into the bus line below.
  const anVisible = getComputedStyle(anBox2).display !== 'none';
  const an = anVisible ? off(anBox2) : null;
  const sp = off(spacer);

  const busY = sp.top + sp.h / 2;
  const src1X = tb.left + tb.w / 2;
  const src1Y = tb.bottom;
  const src2X = an ? an.left + an.w / 2 : null;
  const src2Y = an ? an.bottom : null;

  // target Xs: mid of first ch-hdr in each col
  const txs = [],
    hdrTops = [];
  colsRowEl.querySelectorAll('.col').forEach((col) => {
    // css/mobile.css hides 2 of the 3 .col elements (display:none) below
    // ~768px — querySelectorAll still finds them, and a hidden element's
    // offsetLeft/offsetTop are always 0, which fed a bogus (0,0) target
    // into the bus line below for each hidden column (same class of bug
    // as the altnames-box fix above, just on the target side this time).
    if (getComputedStyle(col).display === 'none') return;
    const hdr = col.querySelector('.ch-hdr');
    if (!hdr) return;
    const r = off(hdr);
    txs.push(r.left + r.w / 2);
    hdrTops.push(r.top);
  });
  if (!txs.length) return;

  const W = mainArea.offsetWidth;
  const H = (hdrTops[0] || sp.bottom) + 10;

  const svg = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  );
  svg.id = 'top-bus-svg';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;overflow:visible;z-index:5;`;

  const S = '#50556a';
  const ln = (x1, y1, x2, y2) => {
    const l = svgLine(x1, y1, x2, y2, S);
    svg.appendChild(l);
  };

  ln(src1X, src1Y, src1X, busY);
  if (src2X !== null) ln(src2X, src2Y, src2X, busY);
  const allXs = [src1X, ...(src2X !== null ? [src2X] : []), ...txs];
  ln(Math.min(...allXs), busY, Math.max(...allXs), busY);
  txs.forEach((tx, i) => {
    const hTop = hdrTops[i] ?? busY;
    ln(tx, busY, tx, hTop - 7);
    svgArrowDown(svg, tx, hTop, S);
  });

  mainArea.appendChild(svg);
}
