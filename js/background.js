// ── BACKGROUND (GRID::RUNNER sky only) ──
(function () {
  const cv = document.getElementById('bg-canvas');
  const cx = cv.getContext('2d');
  let T = 0,
    lightnings = [];
  function resize() {
    cv.width = innerWidth;
    cv.height = innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  function lcg(seed) {
    let s = seed >>> 0;
    return () => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  const rnd = lcg(0xcafe1234);
  // stars in polar coords — all rotate at same speed (celestial sphere)
  const ROT_SPEED = 0.008; // rad/s
  const STARS = Array.from({ length: 160 }, () => ({
    r: 0.05 + rnd() * 0.78,
    ang: rnd() * Math.PI * 2,
    sz: rnd() < 0.14 ? 1.5 : 1,
    ph: rnd() * Math.PI * 2,
    tw: 0.28 + rnd() * 0.48,
  }));
  function drawBg(t) {
    const W = cv.width,
      H = cv.height;
    const cx0 = W / 2,
      cy0 = H / 2;
    const diag = Math.sqrt(cx0 * cx0 + cy0 * cy0) * 1.05;
    const sky = cx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#000005');
    sky.addColorStop(0.5, '#000a10');
    sky.addColorStop(1, '#001420');
    cx.fillStyle = sky;
    cx.fillRect(0, 0, W, H);
    // all stars rotate together around screen centre
    cx.save();
    cx.translate(cx0, cy0);
    cx.rotate(t * ROT_SPEED);
    STARS.forEach((s) => {
      const x = Math.cos(s.ang) * s.r * diag;
      const y = Math.sin(s.ang) * s.r * diag;
      const fl = 0.3 + 0.7 * Math.abs(Math.sin(t * s.tw + s.ph));
      cx.fillStyle = `rgba(160,220,255,${fl * 0.55})`;
      cx.fillRect(x, y, s.sz, s.sz);
    });
    cx.restore();
    // lightning
    if (Math.random() < 0.0038) lightnings.push(mkLightning(W, H));
    cx.save();
    lightnings = lightnings.filter((l) => l.a > 0.01);
    lightnings.forEach((l) => {
      l.a -= l.dk;
      drawLP(l.pts, 1.4, l.a * 0.88);
      l.br.forEach((b) => drawLP(b, 0.65, l.a * 0.36));
      if (l.a > 0.65) {
        cx.fillStyle = `rgba(100,170,255,${(l.a - 0.65) * 0.07})`;
        cx.fillRect(0, 0, W, H);
      }
    });
    cx.restore();
  }
  function mkLightning(W, H) {
    const x = rnd() * W,
      y0 = rnd() * H * 0.3,
      y1 = y0 + 50 + rnd() * 120;
    const pts = [{ x, y: y0 }];
    let cx2 = x,
      cy = y0;
    while (cy < y1) {
      cy += 7 + rnd() * 13;
      cx2 += (rnd() - 0.5) * 33;
      pts.push({ x: cx2, y: cy });
    }
    const br = [];
    if (pts.length > 2 && rnd() > 0.52) {
      const bi = Math.floor(pts.length * 0.4);
      let bx = pts[bi].x,
        by = pts[bi].y;
      const bp = [{ x: bx, y: by }];
      for (let i = 0; i < 3 + Math.floor(rnd() * 4); i++) {
        by += 5 + rnd() * 9;
        bx += (rnd() - 0.5) * 23;
        bp.push({ x: bx, y: by });
      }
      br.push(bp);
    }
    return { pts, br, a: 1, dk: 0.046 + rnd() * 0.05 };
  }
  function drawLP(pts, w, a) {
    if (pts.length < 2) return;
    cx.beginPath();
    cx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) cx.lineTo(pts[i].x, pts[i].y);
    cx.strokeStyle = `rgba(160,212,255,${a})`;
    cx.lineWidth = w;
    cx.shadowBlur = 10;
    cx.shadowColor = '#55aaff';
    cx.stroke();
    cx.shadowBlur = 0;
  }
  function loop(ts) {
    T = ts / 1000;
    resize();
    drawBg(T);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
