import { FOCUS_DIM } from './constants.js';
import { resolvePerkInline } from './markdown.js';
import { hideTooltip } from './tooltip.js';

// ── LEVEL SQUARE TOOLTIP ──
// Singleton tip + L-line, identical to requiredPerks chain tooltip.
const _lvlSqTip = (() => {
  const el = document.createElement('div');
  el.className = 'perk-chain-tip';
  document.body.appendChild(el);
  return el;
})();
let _lvlSqHideTimer = null;
_lvlSqTip.addEventListener('mouseenter', () =>
  clearTimeout(_lvlSqHideTimer),
);
_lvlSqTip.addEventListener('mouseleave', () => {
  _lvlSqTip.style.display = 'none';
  const _a = document.getElementById('lvl-sq-arrow-svg');
  if (_a) {
    _a.style.display = 'none';
    _a.innerHTML = '';
  }
});

export function showChainTip(sq) {
  clearTimeout(_lvlSqHideTimer);
  const pid = sq.dataset.rid;
  const { name, hex } = resolvePerkInline(pid);
  sq.style.boxShadow = `0 0 6px 3px ${hex}88,0 0 14px 5px ${hex}44`;

  _lvlSqTip.innerHTML =
    `<strong>Эта способность требует развития:</strong>` +
    `<div class="perk-chain-dep" data-rid="${pid}" style="cursor:pointer"
      onmouseenter="this.querySelector('span').style.boxShadow='0 0 6px 3px ${hex}88,0 0 14px 5px ${hex}44';this.querySelectorAll('span')[1].style.color='#e0ddd6'"
      onmouseleave="this.querySelector('span').style.boxShadow='';this.querySelectorAll('span')[1].style.color=''">
      <span style="display:inline-block;width:8px;height:8px;background:${hex};border-radius:1px;flex-shrink:0;transition:box-shadow .2s"></span>
      <span style="transition:color .15s">${name}</span>
    </div>`;

  _lvlSqTip.style.display = 'block';

  // position synchronously (tip is already display:block so offsets are real)
  const r = sq.getBoundingClientRect();
  const tw = _lvlSqTip.offsetWidth;
  const th = _lvlSqTip.offsetHeight;
  const vw = window.innerWidth,
    vh = window.innerHeight;
  let tx = r.left - tw - 8;
  if (tx < 4) tx = r.right + 8;
  let ty = r.top - th / 2 + 4;
  if (ty < 4) ty = 4;
  if (ty + th > vh - 4) ty = vh - th - 4;
  _lvlSqTip.style.left = tx + 'px';
  _lvlSqTip.style.top = ty + 'px';

  // draw Г-line after browser has painted the tip at its final position
  requestAnimationFrame(() => {
    const icX = r.left + r.width / 2;
    const icY = r.top + r.height / 2;
    const tipR = _lvlSqTip.getBoundingClientRect();
    const toX = tx > icX ? tipR.left : tipR.right;
    const toY = tipR.top + 18;
    const total = Math.abs(icY - toY) + Math.abs(toX - icX);
    const _arrowSvg = document.getElementById('lvl-sq-arrow-svg');
    _arrowSvg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    _arrowSvg.style.width = vw + 'px';
    _arrowSvg.style.height = vh + 'px';
    _arrowSvg.style.display = 'block';
    _arrowSvg.innerHTML = `
      <circle cx="${icX}" cy="${icY}" r="3" fill="#50556a"/>
      <polyline points="${icX},${icY} ${icX},${toY} ${toX},${toY}"
        fill="none" stroke="#50556a" stroke-width="1.5"
        stroke-dasharray="${total}" stroke-dashoffset="${total}"
        style="animation:dashIn .3s ease forwards"/>`;
  });

  // click on dep row → focus partner perk
  _lvlSqTip.querySelector('.perk-chain-dep')?.addEventListener(
    'click',
    () => {
      const target = [...document.querySelectorAll('.perk')].find(
        (pe) => pe.dataset.perkId === pid,
      );
      if (!target) return;
      _lvlSqTip.style.display = 'none';
      const _aSvg = document.getElementById('lvl-sq-arrow-svg');
      if (_aSvg) {
        _aSvg.style.display = 'none';
        _aSvg.innerHTML = '';
      }
      hideTooltip();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        let fo = document.getElementById('focus-overlay');
        if (!fo) {
          fo = document.createElement('div');
          fo.id = 'focus-overlay';
          fo.style.cssText =
            'position:fixed;inset:0;background:rgba(0,0,0,0);z-index:50;pointer-events:auto;transition:background .35s ease;';
          document.body.appendChild(fo);
        }
        requestAnimationFrame(() => {
          fo.style.background = `rgba(0,0,0,${FOCUS_DIM})`;
        });
        target.style.position = 'relative';
        target.style.zIndex = '51';
        target.style.transition = 'box-shadow .35s ease';
        target.style.boxShadow = `0 0 0 2px ${hex},0 0 30px ${hex}80`;
        function clearF() {
          fo.style.background = 'rgba(0,0,0,0)';
          target.style.boxShadow = '';
          setTimeout(() => {
            fo.remove();
            target.style.position =
              target.style.zIndex =
              target.style.transition =
                '';
          }, 350);
        }
        fo.addEventListener('click', clearF, { once: true });
        setTimeout(() => {
          window.addEventListener('scroll', clearF, {
            once: true,
            passive: true,
          });
          window.addEventListener('keydown', clearF, { once: true });
        }, 400);
      }, 500);
    },
    { once: true },
  );
};

export function hideChainTipDelayed() {
  _lvlSqHideTimer = setTimeout(() => {
    _lvlSqTip.style.display = 'none';
    const _a = document.getElementById('lvl-sq-arrow-svg');
    if (_a) {
      _a.style.display = 'none';
      _a.innerHTML = '';
    }
  }, 150);
};

export function hideChainTip(sq) {
  sq.style.boxShadow = '';
  hideChainTipDelayed();
};
