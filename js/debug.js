// ── DEBUG: window.print() layout snapshot ──
export function dbl(debugDots = false) {
  const allCols = document.querySelectorAll('.col');
  const perkCol =
    document
      .querySelector('.perk.glowing, .perk[data-active]')
      ?.closest('.col') ||
    document.querySelector('.perk-icon.glowing')?.closest('.col');
  const colIdx = perkCol ? [...allCols].indexOf(perkCol) : -1;
  const rowName =
    ['1-й (левый)', '2-й (средний)', '3-й (правый)'][colIdx] ||
    'неизвестно';

  const tooltip = document.getElementById('tooltip');
  const ttR = tooltip?.getBoundingClientRect();

  const winTypes = [
    'win-img',
    'win-extra',
    'win-tip',
    'win-combo',
    'win-audio',
  ];
  const windows = [];
  document
    .querySelectorAll(winTypes.map((c) => '.' + c).join(','))
    .forEach((box) => {
      if (box.style.display === 'none') return;
      const r = box.getBoundingClientRect();
      windows.push({
        type: box.className.replace(/\s+/g, ' '),
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
        bottom: Math.round(r.bottom),
      });
    });

  const svgs = [];
  document.querySelectorAll('.win-connector-svg').forEach((svg) => {
    if (svg.style.display === 'none') return;
    const line = svg.querySelector('line,polyline');
    if (!line) return;
    svgs.push({
      kind: line.tagName,
      points:
        line.getAttribute('points') ||
        `${line.getAttribute('x1')},${line.getAttribute('y1')} → ${line.getAttribute('x2')},${line.getAttribute('y2')}`,
    });
  });

  const result = {
    row: rowName,
    colIdx,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    tooltip: ttR
      ? {
          top: Math.round(ttR.top),
          left: Math.round(ttR.left),
          w: Math.round(ttR.width),
          h: Math.round(ttR.height),
        }
      : null,
    windows,
    connectors: svgs,
  };
  console.log(result);

  // debugDots: draw colored anchors + lines for each connector
  document
    .querySelectorAll('.win-debug-svg')
    .forEach((el) => el.remove());
  if (debugDots) {
    const dbgSvg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    dbgSvg.setAttribute('class', 'win-debug-svg');
    dbgSvg.setAttribute(
      'viewBox',
      `0 0 ${window.innerWidth} ${window.innerHeight}`,
    );
    dbgSvg.setAttribute('width', window.innerWidth);
    dbgSvg.setAttribute('height', window.innerHeight);
    dbgSvg.style.cssText =
      'position:fixed;left:0;top:0;pointer-events:none;z-index:9999;overflow:visible;';
    document.body.appendChild(dbgSvg);

    const palette = [
      '#ff4444',
      '#44ff44',
      '#4488ff',
      '#ffaa00',
      '#ff44ff',
      '#00ffee',
      '#ffff00',
      '#ff8844',
    ];

    document
      .querySelectorAll('.win-connector-svg')
      .forEach((svg, idx) => {
        if (svg.style.display === 'none') return;
        const el = svg.querySelector('line,polyline');
        if (!el) return;
        const color = palette[idx % palette.length];

        // parse points
        let pts = [];
        if (el.tagName === 'line') {
          pts = [
            {
              x: parseFloat(el.getAttribute('x1')),
              y: parseFloat(el.getAttribute('y1')),
            },
            {
              x: parseFloat(el.getAttribute('x2')),
              y: parseFloat(el.getAttribute('y2')),
            },
          ];
        } else {
          pts = el
            .getAttribute('points')
            .trim()
            .split(/\s+/)
            .map((p) => {
              const [x, y] = p.split(',');
              return { x: parseFloat(x), y: parseFloat(y) };
            });
        }
        if (pts.length < 2) return;

        // draw line/polyline
        const line = document.createElementNS(
          'http://www.w3.org/2000/svg',
          el.tagName,
        );
        if (el.tagName === 'line') {
          line.setAttribute('x1', pts[0].x);
          line.setAttribute('y1', pts[0].y);
          line.setAttribute('x2', pts[pts.length - 1].x);
          line.setAttribute('y2', pts[pts.length - 1].y);
        } else {
          line.setAttribute('points', el.getAttribute('points'));
        }
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '2');
        dbgSvg.appendChild(line);

        // draw anchor dots at each point
        pts.forEach((p, pi) => {
          const dot = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'circle',
          );
          dot.setAttribute('cx', p.x);
          dot.setAttribute('cy', p.y);
          dot.setAttribute(
            'r',
            pi === 0 || pi === pts.length - 1 ? 5 : 3,
          );
          dot.setAttribute('fill', color);
          dbgSvg.appendChild(dot);
          // label
          const txt = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'text',
          );
          txt.setAttribute('x', p.x + 7);
          txt.setAttribute('y', p.y - 4);
          txt.setAttribute('fill', color);
          txt.setAttribute('font-size', '10');
          txt.setAttribute('font-family', 'monospace');
          txt.textContent = `${Math.round(p.x)},${Math.round(p.y)}`;
          dbgSvg.appendChild(txt);
        });
      });
  }

  return result;
};
