import { CONFIG } from './load-config.js';
import { ttArrowSvg, spTooltip, spOverlay, spHeader, spLevels } from './dom-refs.js';
import { setSpectreOpen } from './spectre.js';
import { showChainTip, hideChainTip } from './chain-tip.js';
import { createWin, destroyWins, resolveWindowCols } from './windows.js';
import { resolvePerkInline, renderLevelMD, renderMD } from './markdown.js';
import { openVideoLightbox } from './video-lightbox.js';
import { openSnippetLightbox } from './snippet-lightbox.js';
import { hideNoteLinkPopup } from './note-link-popup.js';
import { scale } from './zoom.js';
import {
  COLOURS,
  COL_HEX,
  ICON_HEX,
  hexToRgb,
  FOCUS_DIM,
  WINDOW_PRIORITY,
  MAX_TOOLTIP_HEIGHT_PERCENT,
  MAX_TOOLTIP_HEIGHT_PX,
  MIN_SECONDARY_H as MIN_SECONDARY_H_BASE,
  SLOT_COL_W as SLOT_COL_W_BASE,
  SLOT_COL_GAP as SLOT_COL_GAP_BASE,
  SLOT_ROW_GAP as SLOT_ROW_GAP_BASE,
  SOLO_MAX_H,
  COL_FILL_ORDER,
  LEVELS_SCREEN_COL,
  MEDIA_LOADING_SVG,
  LEVEL_COLOURS,
  COLOUR_KEYS,
  debugLines,
} from './constants.js';

const D = CONFIG;

const tooltipEl = document.getElementById('tooltip');
const ttHeader = document.getElementById('tt-header');
const ttLevels = document.getElementById('tt-levels');

// ── TOOLTIP LOGIC ──

const ttOverlay = document.getElementById('tt-overlay');
let _currentBtn = null;
let _isVisible = false;
let _comboPerkId = null;

export function isCurrentBtn(icon) {
  return _currentBtn === icon;
}

// sessionStorage (not localStorage — this is "what was open THIS visit",
// not a persistent setting like zoom/notes-on-startup) key used to reopen
// the tooltip after an F5 reload — see the F5-restore listener in main.js.
export const OPEN_TOOLTIP_STORAGE_KEY = 'openTooltipPerkId';

export function showTooltip(name, lvlDesc, iconEl) {
  _currentBtn = iconEl;
  _isVisible = true;
  _comboPerkId = iconEl.closest('.perk')?.dataset?.perkId || null;
  try {
    if (_comboPerkId)
      sessionStorage.setItem(OPEN_TOOLTIP_STORAGE_KEY, _comboPerkId);
  } catch (e) {
    // sessionStorage can throw in a locked-down context (private mode,
    // sandboxed iframe) — F5-restore is a nicety, never worth breaking the
    // tooltip itself over.
  }
  document.body.style.overflow = 'hidden';

  // keep glow on clicked icon, remove from others
  document.querySelectorAll('.perk-icon.glowing').forEach((el) => {
    if (el !== iconEl) el.classList.remove('glowing');
  });

  // coloured square in header — same ICON_HEX palette tree.js uses to set
  // --perk-accent-color on each .perk element, so a perk's identity color
  // is identical whether read from the tree or from an open tooltip.
  const _perkEl2 = _currentBtn?.closest('.perk');
  const _perkIc2 = _perkEl2?.querySelector('.perk-icon');
  const _icLetter2 = Object.keys(ICON_HEX).find((c) =>
    _perkIc2?.classList.contains(`ic-${c}`),
  );
  const _icHex2 = ICON_HEX[_icLetter2] || '#888';
  // consumed by .inline-note-ref/.inline-tip-ref (base.css) as the default
  // (no color="..." attribute) color for any <note>/<tip> ref rendered
  // anywhere while this perk's tooltip is open — main tooltip, secondary
  // win-* windows, and any note/tip popup cascaded from either. Set on
  // <html> (not the tooltip element) so it cascades to everything, since
  // those windows/popups aren't DOM descendants of tooltipEl. Cleared in
  // hideTooltip(). -r/-g/-b: see the comment on the matching lines in
  // tree.js — separate numeric channels so CSS can alpha-blend via
  // rgba(var(...)) instead of color-mix(), which breaks html2canvas's PNG
  // export.
  const _icRgb2 = hexToRgb(_icHex2);
  document.documentElement.style.setProperty('--perk-accent-color', _icHex2);
  document.documentElement.style.setProperty('--perk-accent-r', _icRgb2.r);
  document.documentElement.style.setProperty('--perk-accent-g', _icRgb2.g);
  document.documentElement.style.setProperty('--perk-accent-b', _icRgb2.b);
  const _sqSpan = document.createElement('span');
  _sqSpan.style.cssText = `display:inline-block;width:10px;height:10px;background:${_icHex2};border-radius:1px;margin-right:8px;vertical-align:middle;cursor:pointer;flex-shrink:0;transition:box-shadow .2s`;
  _sqSpan.addEventListener('mouseenter', () => {
    _sqSpan.style.boxShadow = `0 0 6px 3px ${_icHex2}aa,0 0 14px 5px ${_icHex2}44`;
  });
  _sqSpan.addEventListener('mouseleave', () => {
    _sqSpan.style.boxShadow = '';
  });
  _sqSpan.addEventListener('click', () => {
    if (!D.spectre) return;
    // show spectre anchored to this square
    setSpectreOpen(true);
    spHeader.textContent = 'Палитра цветов';
    spLevels.innerHTML = Object.entries(D.spectre)
      .map(([colour, txt]) => {
        const hex = COLOUR_KEYS[colour] || '#888';
        return `<div class="tt-row"><span style="display:inline-block;width:10px;height:10px;background:${hex};border-radius:1px;flex-shrink:0;margin-top:2px"></span><span class="tt-text">${txt}</span></div>`;
      })
      .join('');
    spTooltip.style.display = 'flex';
    spTooltip.style.opacity = '1';
    const sr = _sqSpan.getBoundingClientRect();
    // same rem-scaled width as #sp-tooltip in tooltip.css — see the comment
    // on the main tooltip's `tw` above for why this must go through scale().
    const tw = scale(340),
      vh2 = window.innerHeight,
      vw2 = window.innerWidth;
    spTooltip.style.maxHeight = Math.floor(vh2 * 0.82) + 'px';
    const sh = Math.min(spTooltip.scrollHeight, Math.floor(vh2 * 0.82));
    const sGap = scale(12);
    let sx = sr.right + sGap;
    if (sx + tw > vw2 - 4) sx = sr.left - tw - sGap;
    if (sx < 4) sx = 4;
    let sy = sr.top - sh / 2;
    if (sy + sh > vh2 - 8) sy = vh2 - sh - 8;
    if (sy < 8) sy = 8;
    spTooltip.style.left = sx + 'px';
    spTooltip.style.top = sy + 'px';
    // no extra overlay for cascade — reuse existing tt-overlay
    // draw L-line with circle from square to sp-tooltip header
    requestAnimationFrame(() => {
      const sqR = _sqSpan.getBoundingClientRect();
      const spR = spTooltip.getBoundingClientRect();
      const vwA = window.innerWidth,
        vhA = window.innerHeight;
      const icX = sqR.left + sqR.width / 2,
        icY = sqR.top + sqR.height / 2;
      const goRight = spR.left > icX;
      const toX = goRight ? spR.left : spR.right;
      const toY = spR.top + 18;
      const vLen = Math.abs(icY - toY),
        hLen = Math.abs(toX - icX),
        total = vLen + hLen;
      // draw on separate SVG so main arrow stays intact
      let cascSvg = document.getElementById('casc-arrow-svg');
      if (!cascSvg) {
        cascSvg = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg',
        );
        cascSvg.id = 'casc-arrow-svg';
        cascSvg.style.cssText =
          'position:fixed;left:0;top:0;pointer-events:none;z-index:519;overflow:visible;';
        document.body.appendChild(cascSvg);
      }
      cascSvg.style.width = vwA + 'px';
      cascSvg.style.height = vhA + 'px';
      cascSvg.style.display = 'block';
      cascSvg.setAttribute('viewBox', `0 0 ${vwA} ${vhA}`);
      cascSvg.innerHTML = `
  <circle cx="${icX}" cy="${icY}" r="3" fill="#50556a"/>
  <polyline points="${icX},${icY} ${icX},${toY} ${toX},${toY}"
    fill="none" stroke="#50556a" stroke-width="1.5"
    stroke-dasharray="${total}" stroke-dashoffset="${total}"
    style="animation:dashIn .3s ease forwards"/>`;
    });
  });
  ttHeader.innerHTML = '';
  ttHeader.appendChild(_sqSpan);
  ttHeader.appendChild(document.createTextNode(name));
  // Build rows — supports two key formats:
  //   '5'            → normal level row (number + text)
  //   '5:standVisor' → sub-row: coloured perk square under level 5, no text
  // Sub-rows are grouped with their parent level row via CSS.
  {
    // collect and sort all valid entries
    const rows = Object.entries(lvlDesc)
      .filter(([k]) => k !== 'combo' && k !== 'extended')
      .filter(([k]) => /^\d+$/.test(k) || /^\d+:[A-Za-z]/.test(k))
      .sort(([a], [b]) => {
        const nA = parseInt(a),
          nB = parseInt(b);
        if (nA !== nB) return nA - nB;
        // numeric-only keys before sub-keys of same number
        return /^\d+$/.test(a) ? -1 : 1;
      });

    // group: each level row can have sub-rows (N:perkId keys) that render
    // as a perk square in the LEFT column + their own text in the RIGHT column.
    // Each sub-row becomes its OWN tt-row (not merged), so text lines up neatly.
    const finalRows = []; // {lvl, txt, pid|null, isMain}

    for (const [key, txt] of rows) {
      const subMatch = key.match(/^(\d+):([A-Za-z]\w*)$/);
      if (subMatch) {
        finalRows.push({
          lvl: subMatch[1],
          pid: subMatch[2],
          txt: String(txt),
          isMain: false,
        });
      } else {
        finalRows.push({
          lvl: key,
          txt: String(txt),
          pid: null,
          isMain: true,
        });
      }
    }

    ttLevels.innerHTML = finalRows
      .map(({ lvl, txt, pid, isMain }) => {
        const col = LEVEL_COLOURS[parseInt(lvl)] || '#585e72';

        let leftHtml;
        if (isMain) {
          // normal row: show level number
          leftHtml = `<span class="tt-lvl" style="color:${col}">${lvl}</span>`;
        } else {
          // sub-row: show perk square instead of number
          const { name, hex } = resolvePerkInline(pid);
          leftHtml = `<span class="lvl-perk-sq" data-rid="${pid}"
          style="display:inline-block;width:8px;height:8px;background:${hex};
          border-radius:1px;cursor:pointer;transition:box-shadow .2s;">
        </span>`;
        }

        return `<div class="tt-row${isMain ? '' : ' tt-row-sub'}">
        <span class="tt-lvl-col">${leftHtml}</span>
        <div class="tt-text">${txt ? renderLevelMD(txt) : ''}</div>
      </div>`;
      })
      .join('');
  }

  // ── LEVEL NAV: populate 0-10 jump buttons ──
  const ttLvlNavPopup = document.getElementById('tt-lvl-nav-popup');
  ttLvlNavPopup.innerHTML = '';
  // collect which level numbers actually exist in this tooltip
  const _navLevels = Array.from(
    ttLevels.querySelectorAll('.tt-row:not(.tt-row-sub)'),
  )
    .map((row) => {
      const lvlEl = row.querySelector('.tt-lvl');
      return lvlEl ? parseInt(lvlEl.textContent) : NaN;
    })
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);
  _navLevels.forEach((lvl) => {
    const sq = document.createElement('div');
    sq.className = 'tt-lvl-nav-sq';
    sq.textContent = lvl;
    const col = LEVEL_COLOURS[lvl] || '#585e72';
    sq.style.borderColor = col + '80';
    sq.style.color = col;
    sq.addEventListener('click', () => {
      const rows = ttLevels.querySelectorAll('.tt-row:not(.tt-row-sub)');
      for (const row of rows) {
        const lvlEl = row.querySelector('.tt-lvl');
        if (lvlEl && parseInt(lvlEl.textContent) === lvl) {
          row.scrollIntoView({ block: 'start', behavior: 'smooth' });
          break;
        }
      }
    });
    ttLvlNavPopup.appendChild(sq);
  });
  // show nav only when tooltip has enough rows to need scrolling
  const ttLvlNav = document.getElementById('tt-lvl-nav');
  ttLvlNav.style.display = _navLevels.length > 4 ? 'block' : 'none';

  // hover for left-column perk squares — use mouseenter/mouseleave on each
  // square directly (added after innerHTML is set) to avoid bubbling issues.
  ttLevels.querySelectorAll('.lvl-perk-sq').forEach((sq) => {
    sq.addEventListener('mouseenter', () => showChainTip(sq));
    sq.addEventListener('mouseleave', () => hideChainTip(sq));
  });

  // click delegation for inline <perk> tags AND left-column perk squares
  ttLevels.addEventListener(
    'click',
    (e) => {
      const ref = e.target.closest('.inline-perk-ref, .lvl-perk-sq');
      if (!ref) return;
      const rid = ref.dataset.rid;
      if (!rid) return;
      const target = [...document.querySelectorAll('.perk')].find(
        (pe) => pe.dataset.perkId === rid,
      );
      if (!target) return;
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
        const { hex } = resolvePerkInline(rid);
        requestAnimationFrame(() => {
          fo.style.background = `rgba(0,0,0,${FOCUS_DIM})`;
        });
        target.style.position = 'relative';
        target.style.zIndex = '51';
        const tCol = target.closest('.col');
        if (tCol) {
          tCol.style.position = 'relative';
          tCol.style.zIndex = '52';
        }
        target.style.transition = 'box-shadow .35s ease';
        target.style.boxShadow = `0 0 0 2px ${hex},0 0 30px ${hex}80`;
        function clearFocusRef() {
          fo.style.background = 'rgba(0,0,0,0)';
          target.style.boxShadow = '';
          if (tCol) {
            tCol.style.position = '';
            tCol.style.zIndex = '';
          }
          setTimeout(() => {
            fo.remove();
            target.style.position =
              target.style.zIndex =
              target.style.transition =
                '';
          }, 350);
        }
        fo.addEventListener('click', clearFocusRef, { once: true });
        setTimeout(() => {
          window.addEventListener('scroll', clearFocusRef, {
            once: true,
            passive: true,
          });
          window.addEventListener('keydown', clearFocusRef, {
            once: true,
          });
        }, 400);
      }, 500);
    },
    { capture: false },
  );

  // position & show synchronously — no timers, no rAF
  const ir = iconEl.getBoundingClientRect();
  const icX = ir.left + ir.width / 2;
  const icY = ir.top + ir.height / 2;
  // must track .tooltip's actual CSS width (21.25rem in tooltip.css, i.e.
  // 340px scaled by root font-size) — this drives goRight/x/toX below, and
  // an unscaled literal here desyncs from the real (rem-scaled) box the
  // moment zoom != 100%, letting the tooltip render wider than this code
  // thinks and overrun the icon/tree it's supposed to sit clear of.
  const tw = scale(340),
    vh = window.innerHeight,
    vw = window.innerWidth;
  const GAP = scale(16);

  // detect if this perk lives in the LAST (rightmost) column —
  // if so, force everything (tooltip + secondary windows) to open LEFTWARD,
  // mirrored, regardless of available space on the right.
  const allCols = document.querySelectorAll('.col');
  const perkCol = iconEl.closest('.col');
  const isLastCol =
    allCols.length > 0 && perkCol === allCols[allCols.length - 1];

  const goRight = isLastCol ? false : icX + GAP + tw <= vw - 4;
  let x = goRight ? icX + GAP : icX - tw - GAP;
  if (x < 4) x = 4;
  tooltipEl.style.display = 'flex';
  tooltipEl.style.opacity = '0'; // measure without flash
  const maxH = Math.min(
    Math.floor(vh * MAX_TOOLTIP_HEIGHT_PERCENT),
    scale(MAX_TOOLTIP_HEIGHT_PX),
  );
  tooltipEl.style.maxHeight = maxH + 'px';
  const actualH = Math.min(tooltipEl.scrollHeight, maxH);

  // prefer top-anchored: start near the top of the viewport with a small
  // margin, rather than centering on the icon which pushes it down.
  const TOP_ANCHOR = 16;
  let y = Math.min(icY - actualH / 2, TOP_ANCHOR);
  if (y + actualH > vh - 8) y = vh - actualH - 8;
  if (y < TOP_ANCHOR) y = TOP_ANCHOR;

  tooltipEl.style.left = x + 'px';
  tooltipEl.style.top = y + 'px';
  tooltipEl.style.opacity = '1';

  ttOverlay.style.display = 'block';
  ttOverlay.style.background = 'rgba(0,0,0,.6)';

  // ── SECONDARY WINDOWS: destroy previous, create fresh ──
  // Stop any playing audio before destroying
  document.querySelectorAll('.win-audio').forEach((ab) => {
    ab._audioRefs?.forEach((a) => {
      try {
        a.pause();
      } catch (e) {}
      a.src = '';
    });
  });
  destroyWins();

  // Create fresh windows for this perk
  const _extra = createWin('extra');
  const extraBox = _extra.box;
  const extraContent = _extra.content;
  const extraSvg = _extra.svg;
  _extra.hdr.innerHTML =
    '<span style="opacity:.6;margin-right:5px">📄</span>Расширенное описание';

  const _tip = createWin('tip');
  const tipBox = _tip.box;
  const tipContent = _tip.content;
  const tipSvg = _tip.svg;
  _tip.hdr.innerHTML =
    '<span style="opacity:.6;margin-right:5px">💡</span>Подсказка';

  const _audio = createWin('audio');
  const audioBox = _audio.box;
  const audioContent = _audio.content;
  const audioHeader = _audio.hdr;
  const audioArwSvg = _audio.svg;
  // audio header text set later (from track title)

  const _combo = createWin('combo');
  const comboBox = _combo.box;
  const comboSvg = _combo.svg;
  _combo.hdr.innerHTML =
    '<span style="opacity:.6;margin-right:5px">⬡</span>Комбо-способности';
  // combo uses its own content structure (levels list)
  const comboLvls = document.createElement('div');
  comboLvls.className = 'win-combo-levels';
  _combo.content.replaceWith(comboLvls);
  comboBox.appendChild(comboLvls);

  // IMG windows are created per-image below (imgSources loop)
  // imgBox/img2Box set after imgSources is known
  // imgBoxes[i] = { box, content, hdr, svg } — one per imgSources entry
  const imgBoxes = [];
  // convenience aliases set after imgSources known (first entry = imgBox)
  let imgBox = null,
    imgContent = null,
    imgHeader = null,
    imgArwSvg = null;
  let imgDots = null;

  const perkData = D.skills
    .flatMap((s) => s.perks)
    .find((p) => p.id === _comboPerkId);
  const lvlData = (D.skillLevelDescriptions || {})[_comboPerkId];
  const combo = lvlData?.combo || null;
  const vwC = window.innerWidth,
    vhC = window.innerHeight;

  // Explicitly pin .win-img-content / .win-extra-content to a real
  // px height derived from their box's actual maxHeight, MINUS the header
  // and padding. max-height:% inside them is unreliable when the box's own
  // height comes from a JS-set maxHeight on a flex:1 ancestor — browsers
  // don't always resolve that percentage chain correctly, which let the
  // <img>/<video> render at its natural (larger) size and get clipped by
  // the box's overflow:hidden instead of being shrunk to fit.
  function pinContentHeight(box, contentSelector) {
    const content = box.querySelector(contentSelector);
    if (!content) return;
    const header = box.querySelector('.tt-header');
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const boxMaxH =
      parseFloat(box.style.maxHeight) ||
      box.getBoundingClientRect().height;
    const contentH = Math.max(40, boxMaxH - headerH);

    const hasMedia = !!content.querySelector('img,video');
    if (hasMedia) {
      // media containers need an explicit height so that max-height:100%
      // on the <img>/<video> resolves correctly against a flex:1 ancestor.
      content.style.height = contentH + 'px';
      content.style.maxHeight = contentH + 'px';
    } else {
      // text containers: height = actual content size capped at contentH.
      // This makes the box shrink when text is short, grow when text is long,
      // without ever exceeding the allocated slot.
      content.style.maxHeight = contentH + 'px';
      const naturalH = Math.min(
        content.scrollHeight || contentH,
        contentH,
      );
      content.style.height = naturalH + 'px';
    }

    // If the media's natural (width-constrained) height would exceed the
    // available contentH, drop its max-height cap so it renders at full
    // natural size and the container actually scrolls the overflow,
    // instead of object-fit:contain squeezing it into a tiny sliver.
    const media = content.querySelector('img,video');
    if (media) {
      const cw = content.clientWidth - 20; // minus the container's own padding
      const naturalW =
        media.tagName === 'IMG' ? media.naturalWidth : media.videoWidth;
      const naturalH =
        media.tagName === 'IMG' ? media.naturalHeight : media.videoHeight;
      if (naturalW && naturalH) {
        const renderedH = cw * (naturalH / naturalW); // height if scaled to fit width
        const overflows = renderedH > contentH;
        media.classList.toggle('media-overflow', overflows);
        // enable scroll on the container only when media genuinely overflows —
        // otherwise keep it hidden so no spurious scrollbar appears
        content.classList.toggle('needs-scroll', overflows);
      } else {
        // dimensions not yet known (still loading) — no scroll
        content.classList.remove('needs-scroll');
      }
    }
  }

  // Re-checks a .win-img-content's real overflow (used both right after
  // runLayout places the box and again once its media finishes loading,
  // since a media element's rendered size before/after load can differ
  // enough to change whether an img entry's `desc` — see withLoadingSpinner
  // — genuinely overflows the box). Unlike pinContentHeight above (never
  // called for IMG kind — see the `kind !== 'IMG'` guard around its call
  // site in runLayout), .win-img sizes its box directly from the filename
  // size hint, so this is IMG's equivalent overflow check.
  function refreshImgScroll(content) {
    if (!content) return;
    content.classList.toggle(
      'needs-scroll',
      content.scrollHeight > content.clientHeight + 1,
    );
  }

  function drawLine(svg, fromRect, toRect, vertical) {
    // strict 90deg L-shape: one horizontal + one vertical segment
    // ALL coordinates rounded to whole pixels — sub-pixel positions get
    // anti-aliased across two rows/cols, which visually halves stroke opacity.
    svg.setAttribute('viewBox', `0 0 ${vwC} ${vhC}`);
    svg.setAttribute('width', vwC);
    svg.setAttribute('height', vhC);
    svg.style.display = 'block';
    svg.style.position = 'fixed';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '501';
    svg.style.overflow = 'visible';

    const R = Math.round;
    let pts, len;
    if (vertical) {
      const fx = R(fromRect.left + 20),
        fy = R(fromRect.bottom);
      const tx = fx,
        ty = R(toRect.top);
      pts = `${fx},${fy} ${tx},${ty}`;
      len = Math.abs(ty - fy);
    } else {
      const toIsRight = toRect.left >= fromRect.right - 1;
      const fx = R(toIsRight ? fromRect.right : fromRect.left);
      const fy = R(fromRect.top + 18);
      const tx = R(toIsRight ? toRect.left : toRect.right);
      const ty = R(toRect.top + 18);
      const midX = R((fx + tx) / 2);
      pts = `${fx},${fy} ${midX},${fy} ${midX},${ty} ${tx},${ty}`;
      len = Math.abs(midX - fx) + Math.abs(ty - fy) + Math.abs(tx - midX);
    }

    svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="#50556a" stroke-width="1.5"
      stroke-dasharray="${len}" stroke-dashoffset="${len}"
      style="animation:dashIn .4s ease forwards"/>`;
  }

  const hasExtra = !!perkData?.extra;
  const hasTip = !!perkData?.tip;
  // extended lives in skillLevelDescriptions[perkId].extended (like combo)
  const audiosList = Array.isArray(perkData?.audios)
    ? perkData.audios.filter(Boolean)
    : [];
  const hasAudio = audiosList.length > 0;
  // imgs[] takes priority over the single img key when both happen to be present
  const imgsList = Array.isArray(perkData?.imgs)
    ? perkData.imgs.filter(Boolean)
    : [];
  const useSlider = imgsList.length >= 2 && perkData?.slider === true;
  const useMultiImg = imgsList.length >= 2 && !useSlider; // multiple separate img windows
  const hasImg = imgsList.length >= 1 || !!perkData?.img;
  const hasImg2 = useMultiImg; // keep alias for compat during transition
  const hasCombo = !!(combo && Object.keys(combo).length);

  // resolve the actual list of image sources to render for the (single) .win-img.
  // - imgs[] + slider:true  → all images go into ONE box, navigated via dots
  // - imgs[] + slider:false → each image gets its own .win-img window
  // - plain img             → single image, as before
  const imgSourcesRaw = imgsList.length
    ? imgsList
    : perkData?.img
      ? [perkData.img]
      : [];
  // normalize each entry to {src, title, desc, audio, controls}: plain
  // strings keep title/desc/audio=null, meaning they fall back to the
  // perk-level perkData.audio flag (desc has no perk-level equivalent — a
  // plain string entry just has no description).
  function normalizeImgEntry(entry) {
    if (typeof entry === 'string')
      return {
        src: entry,
        title: null,
        desc: null,
        audio: null,
        height: null,
        controls: false,
      };
    if (entry && typeof entry === 'object')
      return {
        src: entry.src || '',
        title: entry.title || null,
        // markdown, rendered via renderMD below the media — see appendImgDesc.
        desc: entry.desc || null,
        audio: typeof entry.audio === 'boolean' ? entry.audio : null,
        height: entry.height || null, // 'maximum' = fill all available height
        // adds an "expand" button that opens the video in a large lightbox
        // with native controls (seek bar, volume, fullscreen) — the small
        // in-tooltip video itself stays controls-free. See makeMediaEl.
        controls: entry.controls === true,
      };
    return {
      src: '',
      title: null,
      desc: null,
      audio: null,
      height: null,
      controls: false,
    };
  }
  const imgSources = imgSourcesRaw.map(normalizeImgEntry);
  const wantsMaximum = imgSources.some((e) => e.height === 'maximum');

  // ── SNIPPETS: standalone .html pages (with their own JS), each in its own
  // window — perkData.snippets: [{ title?, src, size?: 'WIDTHxHEIGHT', desc?,
  // fullScreen? }]. No slider mode (unlike imgs[]) — every entry always gets
  // its own window. Sized/rendered exactly like a .win-img window (same DOM
  // classes, same measure-and-size code in runLayout below) since there's no
  // filename-hint convention that makes sense for an arbitrary page — `size`
  // plays the same role for a snippet that the `name_WIDTH_HEIGHT.ext`
  // filename hint plays for an image, see parseSnippetSize. `fullScreen`
  // mirrors an img entry's `controls` — adds an "expand" button that opens
  // the SAME page large in snippet-lightbox.js, mirroring video-lightbox.js.
  const snippetsList = Array.isArray(perkData?.snippets)
    ? perkData.snippets.filter(Boolean)
    : [];
  const hasSnippet = snippetsList.length > 0;
  function normalizeSnippetEntry(entry) {
    if (typeof entry === 'string')
      return {
        src: entry,
        title: null,
        desc: null,
        size: null,
        fullScreen: false,
      };
    if (entry && typeof entry === 'object')
      return {
        src: entry.src || '',
        title: entry.title || null,
        desc: entry.desc || null,
        size: entry.size || null,
        fullScreen: entry.fullScreen === true,
      };
    return {
      src: '',
      title: null,
      desc: null,
      size: null,
      fullScreen: false,
    };
  }
  const snippetSources = snippetsList.map(normalizeSnippetEntry);
  const snippetBoxes = [];

  // Create one .win-img window per imgSources entry (no slider mode)
  // or one window for slider mode. imgBoxes[i] mirrors imgSources[i].
  if (hasImg) {
    const count = useSlider ? 1 : imgSources.length;
    for (let i = 0; i < count; i++) {
      const w = createWin('img');
      // first window gets dots container for slider
      if (i === 0) {
        imgDots = document.createElement('div');
        imgDots.className = 'img-dots';
        imgDots.id = 'img-dots';
        w.box.appendChild(imgDots);
      }
      imgBoxes.push(w);
    }
    // convenience aliases
    imgBox = imgBoxes[0]?.box;
    imgContent = imgBoxes[0]?.content;
    imgHeader = imgBoxes[0]?.hdr;
    imgArwSvg = imgBoxes[0]?.svg;
  }

  // One .win-img-classed window per snippet entry — literally `createWin('img')`
  // (not 'snippet') so it inherits ALL of .win-img/.win-img-content's CSS and
  // runLayout sizing for free, with zero duplicated rules; 'is-snippet' is a
  // purely cosmetic marker class for anyone inspecting the DOM, not styled.
  snippetSources.forEach(() => {
    snippetBoxes.push(createWin('img', 'is-snippet'));
  });

  // ordered list of which secondary window "slots" are present, per WINDOW_PRIORITY
  const hasFlags = {
    IMG: hasImg,
    SNIPPET: hasSnippet,
    AUDIO: hasAudio,
    EXTRA: hasExtra,
    TIP: hasTip,
    COMBO: hasCombo,
  };
  // perkData.priority: optional local override of window order for this perk only.
  // e.g. priority: ['COMBO', 'IMG', 'EXTRA'] — only listed kinds are reordered,
  // unlisted kinds keep their WINDOW_PRIORITY position at the end.
  const localPriority = (() => {
    const p = perkData?.priority;
    if (!Array.isArray(p) || !p.length) return WINDOW_PRIORITY;
    const upper = p.map((k) => k.toUpperCase());
    // merge: listed kinds first (in given order), then remaining from WINDOW_PRIORITY
    const rest = WINDOW_PRIORITY.filter((k) => !upper.includes(k));
    return [...upper, ...rest];
  })();
  // Build activeKinds — one entry per window instance.
  // Multiple imgBoxes = multiple 'IMG' entries stacked in same column.
  const activeKinds = [];
  for (const k of localPriority) {
    if (!hasFlags[k]) continue;
    if (k === 'IMG') {
      // one entry per imgBoxes entry
      imgBoxes.forEach(() => activeKinds.push('IMG'));
    } else if (k === 'SNIPPET') {
      // one entry per snippetBoxes entry — see hasSnippet/snippetSources above
      snippetBoxes.forEach(() => activeKinds.push('SNIPPET'));
    } else {
      activeKinds.push(k);
    }
  }

  if (hasExtra || hasImg || hasSnippet || hasCombo) {
    const TOP_MARGIN = 8,
      BOTTOM_MARGIN = 8,
      ROW_GAP = 12;
    const usableH = vhC - TOP_MARGIN - BOTTOM_MARGIN;

    // anchor strictly to the ACTUAL rendered tooltip rect (already clamped to viewport)
    const mainR = tooltipEl.getBoundingClientRect();
    // Shadows the imported *_BASE constants with their zoom-scaled value for
    // the rest of this block (through the end of runLayout below) — every
    // bare SLOT_COL_W/SLOT_COL_GAP/SLOT_ROW_GAP/MIN_SECONDARY_H reference
    // downstream picks this up automatically, no need to wrap each of the
    // many individual use sites in scale() by hand. This is hand-rolled JS
    // pixel arithmetic, not CSS, so `rem` (used everywhere else for the
    // zoom) has no effect on it — see zoom.js for why.
    const SLOT_COL_W = scale(SLOT_COL_W_BASE);
    const SLOT_COL_GAP = scale(SLOT_COL_GAP_BASE);
    const SLOT_ROW_GAP = scale(SLOT_ROW_GAP_BASE);
    const MIN_SECONDARY_H = scale(MIN_SECONDARY_H_BASE);
    // pre-compute SOLO_MAX_H here so it's visible to both runLayout and
    // the img load listener (which runs outside runLayout's rAF closure).
    let SOLO_MAX_H = Math.max(scale(80), mainR.bottom - mainR.top - scale(40));
    const colW = SLOT_COL_W;
    const COL_GAP = SLOT_COL_GAP;
    let colX, placedLeft;
    // prefer the same side the tooltip itself is on
    if (goRight) {
      colX = mainR.right + COL_GAP;
      placedLeft = false;
      if (colX + colW > vwC - 4) {
        colX = mainR.left - colW - COL_GAP;
        placedLeft = true;
      }
    } else {
      colX = mainR.left - colW - COL_GAP;
      placedLeft = true;
      if (colX < 4) {
        colX = mainR.right + COL_GAP;
        placedLeft = false;
      }
    }
    if (colX < 4) colX = 4;
    if (colX + colW > vwC - 4) colX = vwC - colW - 4;
    // align column top with the main tooltip's top, clamped to viewport
    let colTop = mainR.top;
    if (colTop < TOP_MARGIN) colTop = TOP_MARGIN;

    // populate content — supports static images AND mp4 (auto-looped, muted, no controls)
    // helper: create the right kind of media element (img or video) for a given src
    // Parse WxH from filename: name_1920_1080.mp4 → {w:1920, h:1080}
    // Returns null if no size hint found.
    function parseSizeHint(src) {
      const m = src.match(/_(\d{2,5})_(\d{2,5})(?:\.[^.]+)?(?:\?.*)?$/);
      if (!m) return null;
      const w = parseInt(m[1], 10),
        h = parseInt(m[2], 10);
      if (!w || !h) return null;
      return { w, h };
    }

    // Parse a snippet's explicit `size: "WIDTHxHEIGHT"` field into the same
    // {w,h} shape parseSizeHint returns from a filename — an arbitrary
    // .html page has no filename convention to embed dimensions in the way
    // an image/video does, so this is spelled out in the config instead.
    function parseSnippetSize(size) {
      if (typeof size !== 'string') return null;
      const m = size.match(/^\s*(\d+)\s*[x×]\s*(\d+)\s*$/i);
      if (!m) return null;
      const w = parseInt(m[1], 10),
        h = parseInt(m[2], 10);
      if (!w || !h) return null;
      return { w, h };
    }

    // Given a size hint and available container width/height, return the
    // pixel height the media will render at once loaded — used to pre-size
    // the container so the layout is stable before the file arrives.
    function hintedHeight(hint, containerW, maxH) {
      if (!hint) return null;
      const ratio = hint.h / hint.w;
      return Math.min(Math.round(containerW * ratio), maxH);
    }

    function makeMediaEl(src, promises, altText, audioOverride, controlsOverride) {
      const isVideo = /\.mp4($|\?)/i.test(src);
      if (isVideo) {
        const vidEl = document.createElement('video');
        vidEl.src = src;
        vidEl.autoplay = true;
        vidEl.loop = true;
        vidEl.muted = true; // always starts muted; unmuted only via the speaker toggle below
        vidEl.playsInline = true;
        // native controls (seek bar, volume, fullscreen) only ever show in
        // the expanded lightbox view — the small in-tooltip video stays
        // controls-free either way; `controlsOverride` just adds the
        // "expand" button that opens that lightbox.
        vidEl.controls = false;
        vidEl.disablePictureInPicture = true;
        vidEl.setAttribute(
          'controlsList',
          'nodownload nofullscreen noremoteplayback',
        );
        if (perkData?.fit !== false) vidEl.classList.add('fit-cover');
        promises.push(
          new Promise((resolve) => {
            vidEl.addEventListener('loadeddata', resolve, { once: true });
            vidEl.addEventListener('error', resolve, { once: true });
          }),
        );
        // once real dimensions are known, re-check overflow/scroll sizing
        // for whichever box this video ends up living in
        vidEl.addEventListener(
          'loadeddata',
          () => {
            const box = vidEl.closest('.win-img, .win-extra');
            if (!box) return;
            const sel = '.win-img-content';
            // all .win-img windows: reset any explicit sizing, then
            // re-check overflow now that the video's real dimensions are
            // known — an img entry's `desc` (see withLoadingSpinner) can
            // combine with the video's real (not hinted) size to overflow
            // even when the initial placement-time check didn't.
            if (box.classList.contains('win-img')) {
              const cont = box.querySelector(sel);
              if (cont) {
                cont.style.height = '';
                cont.style.maxHeight = '';
                refreshImgScroll(cont);
              }
            } else {
              pinContentHeight(box, sel);
            }
          },
          { once: true },
        );

        // per-image audio (in imgs[] entries) overrides the perk-level perkData.audio flag.
        // audioOverride === null means "not specified at this level" → fall back to perk-level.
        const wantsAudio =
          audioOverride !== null && audioOverride !== undefined
            ? audioOverride
            : perkData?.audio === true;

        if (wantsAudio || controlsOverride) {
          const wrap = document.createElement('div');
          wrap.className = 'media-audio-wrap';
          wrap.appendChild(vidEl);

          if (wantsAudio) {
            const btn = document.createElement('button');
            btn.className = 'media-audio-btn';
            btn.title = 'Включить звук';
            btn.innerHTML = svgSpeakerIcon(true); // muted icon initially
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              vidEl.muted = !vidEl.muted;
              btn.innerHTML = svgSpeakerIcon(vidEl.muted);
              btn.title = vidEl.muted ? 'Включить звук' : 'Выключить звук';
            });
            wrap.appendChild(btn);
          }

          if (controlsOverride) {
            const expandBtn = document.createElement('button');
            expandBtn.className = 'media-expand-btn';
            expandBtn.title = 'Развернуть';
            expandBtn.innerHTML = svgExpandIcon();
            expandBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const wasPlaying = !vidEl.paused;
              vidEl.pause();
              openVideoLightbox(src, {
                startTime: vidEl.currentTime,
                muted: vidEl.muted,
                onClose: () => {
                  if (wasPlaying) vidEl.play().catch(() => {});
                },
              });
            });
            wrap.appendChild(expandBtn);
          }

          return wrap;
        }

        return vidEl;
      } else {
        const imgEl = document.createElement('img');
        imgEl.alt = altText || perkData.name || '';
        promises.push(
          new Promise((resolve) => {
            imgEl.addEventListener('load', resolve, { once: true });
            imgEl.addEventListener('error', resolve, { once: true });
          }),
        );
        // size from hint only — no post-load resize
        imgEl.src = src;
        return imgEl;
      }
    }

    // small speaker SVG, toggles between muted/unmuted glyph
    function svgSpeakerIcon(muted) {
      return muted
        ? `<svg viewBox="0 0 16 16" width="13" height="13">
             <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="#c0bdb4"/>
             <line x1="10.5" y1="6" x2="14" y2="9.5" stroke="#c0bdb4" stroke-width="1.3"/>
             <line x1="14" y1="6" x2="10.5" y2="9.5" stroke="#c0bdb4" stroke-width="1.3"/>
           </svg>`
        : `<svg viewBox="0 0 16 16" width="13" height="13">
             <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="#e09040"/>
             <path d="M10.5 5.5a3.2 3.2 0 0 1 0 5" fill="none" stroke="#e09040" stroke-width="1.2"/>
             <path d="M12 4a5.4 5.4 0 0 1 0 8" fill="none" stroke="#e09040" stroke-width="1.1" opacity="0.7"/>
           </svg>`;
    }

    // four-corner "expand to large view" glyph
    function svgExpandIcon() {
      return `<svg viewBox="0 0 16 16" width="13" height="13">
             <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="#c0bdb4" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>`;
    }

    const imgLoadPromises = [];
    let _sliderIndex = 0;

    function renderSliderImage(idx) {
      // explicitly stop any currently playing video before swapping content
      imgContent.querySelectorAll('video').forEach((v) => {
        v.pause();
        v.removeAttribute('src');
        v.load();
      });
      imgContent.innerHTML = '';
      const entry = imgSources[idx];
      const el = makeMediaEl(
        entry.src,
        imgLoadPromises,
        entry.title,
        entry.audio,
        entry.controls,
      );
      withLoadingSpinner(el, imgContent, entry.desc);
      imgHeader.textContent =
        entry.title || perkData.name || 'Иллюстрация';
      imgDots
        .querySelectorAll('.img-dot')
        .forEach((d, i) => d.classList.toggle('active', i === idx));
    }

    // helper: wraps a media element with a spinner that's visible until
    // the media actually finishes loading (load/loadeddata/error), then
    // removes itself. The spinner and the media element coexist in the
    // DOM the whole time — nothing overwrites innerHTML after this point,
    // so the spinner isn't wiped out before the browser gets to paint it.
    // `desc` (optional): markdown text rendered below the media — see
    // .win-img-desc in windows.css and the overflow handling in
    // pinContentHeight() below, which accounts for the extra height.
    function withLoadingSpinner(mediaEl, container, desc) {
      // sizeHint: {w, h} natural pixel dimensions of the media (from filename or known).
      // We insert an invisible placeholder div sized to the media's proportions so
      // the container immediately occupies the correct height — no layout jump after load.
      const spinnerWrap = document.createElement('div');
      spinnerWrap.className = 'media-loading-wrap';
      spinnerWrap.innerHTML = MEDIA_LOADING_SVG;

      container.appendChild(spinnerWrap);
      container.appendChild(mediaEl);
      if (desc) {
        // reuses .win-extra-content's markdown typography (p/h1-h3/strong/
        // em/code/pre/ul/ol/li/blockquote/hr/table) instead of duplicating
        // those rules — .win-img-desc in windows.css only overrides the
        // handful of properties that assumed being the window's SOLE
        // content (flex sizing, zero padding/overflow).
        const descEl = document.createElement('div');
        descEl.className = 'win-img-desc win-extra-content';
        descEl.innerHTML = renderMD(desc);
        container.appendChild(descEl);
      }

      // Once the media's real size is known, re-check overflow — the
      // filename-hint hidden the box's height BEFORE the media actually
      // loaded (see runLayout's IMG sizing above), so a `desc` block's
      // combined height with the media's real (not hinted) size can still
      // turn out to need scrolling here even when the earlier check didn't.
      const removeSpinner = () => {
        spinnerWrap.remove();
        refreshImgScroll(container);
      };
      const tag = mediaEl.tagName;
      if (tag === 'IMG') {
        mediaEl.addEventListener('load', removeSpinner, { once: true });
        mediaEl.addEventListener('error', removeSpinner, { once: true });
        if (mediaEl.complete) removeSpinner(); // already cached/loaded
      } else if (tag === 'VIDEO') {
        mediaEl.addEventListener('loadeddata', removeSpinner, {
          once: true,
        });
        mediaEl.addEventListener('error', removeSpinner, { once: true });
      } else if (tag === 'IFRAME') {
        // a snippet's page — no natural-size concept to wait on, just its
        // own load/error like any other embedded document.
        mediaEl.addEventListener('load', removeSpinner, { once: true });
        mediaEl.addEventListener('error', removeSpinner, { once: true });
      } else {
        // audio:true wraps the <video> in a .media-audio-wrap div
        const inner = mediaEl.querySelector('video');
        if (inner) {
          inner.addEventListener('loadeddata', removeSpinner, {
            once: true,
          });
          inner.addEventListener('error', removeSpinner, { once: true });
        } else {
          removeSpinner();
        }
      }
    }

    if (hasImg) {
      if (useSlider) {
        // ONE window, multiple images, dot navigation
        _sliderIndex = 0;
        renderSliderImage(0);
        imgDots.innerHTML = imgSources
          .map(
            (_, i) =>
              `<span class="img-dot${i === 0 ? ' active' : ''}" data-idx="${i}"></span>`,
          )
          .join('');
        imgDots.classList.add('visible');
        imgDots.querySelectorAll('.img-dot').forEach((dot) => {
          dot.addEventListener('click', () => {
            _sliderIndex = parseInt(dot.dataset.idx, 10);
            renderSliderImage(_sliderIndex);
          });
        });
      } else {
        // single image (or first of imgs[] when useDualImg)
        const entry0 = imgSources[0];
        imgHeader.textContent =
          entry0.title || perkData.name || 'Иллюстрация';
        const el = makeMediaEl(
          entry0.src,
          imgLoadPromises,
          entry0.title,
          entry0.audio,
          entry0.controls,
        );
        imgContent.innerHTML = '';
        // height:'maximum' → cover so image fills the tall box without letterbox
        if (wantsMaximum) {
          const mediaEl2 =
            el.tagName === 'IMG' ? el : el.querySelector('img,video');
          if (mediaEl2) mediaEl2.classList.add('fit-cover');
        }
        withLoadingSpinner(el, imgContent, entry0.desc);
      }
    }

    // populate all img windows from imgSources (index 0 handled above, rest here)
    if (!useSlider) {
      for (
        let _i = 1;
        _i < imgSources.length && _i < imgBoxes.length;
        _i++
      ) {
        const _entry = imgSources[_i];
        const _w = imgBoxes[_i];
        _w.hdr.textContent =
          _entry.title || perkData.name || 'Иллюстрация';
        const _el = makeMediaEl(
          _entry.src,
          imgLoadPromises,
          _entry.title,
          _entry.audio,
          _entry.controls,
        );
        _w.content.innerHTML = '';
        withLoadingSpinner(_el, _w.content, _entry.desc);
      }
    }
    // set header for first img box too
    imgBoxes.forEach((_w, _i) => {
      if (!_w.hdr.textContent && imgSources[_i]) {
        _w.hdr.textContent =
          imgSources[_i].title || perkData.name || 'Иллюстрация';
      }
    });

    // populate every snippet window — no slider mode, each entry always
    // gets its own window (see snippetBoxes above).
    snippetSources.forEach((entry, i) => {
      const w = snippetBoxes[i];
      if (!w || !entry.src) return;
      w.hdr.textContent = entry.title || perkData.name || 'Сниппет';
      const iframe = document.createElement('iframe');
      iframe.src = entry.src;
      iframe.className = 'win-snippet-iframe';
      w.content.innerHTML = '';
      withLoadingSpinner(iframe, w.content, entry.desc);
      if (entry.fullScreen) {
        // .win-img-content (w.content) is already `position: relative` in
        // its own CSS rule, so .media-expand-btn (position:absolute) can be
        // appended straight into it — no extra wrapper div needed, unlike
        // makeMediaEl's video path (which only wraps when audio OR controls
        // is requested, since a bare <video> isn't a positioning context).
        const expandBtn = document.createElement('button');
        expandBtn.className = 'media-expand-btn';
        expandBtn.title = 'Развернуть';
        expandBtn.innerHTML = svgExpandIcon();
        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openSnippetLightbox(entry.src);
        });
        w.content.appendChild(expandBtn);
      }
    });

    if (hasExtra) {
      extraContent.innerHTML = renderMD(perkData.extra);
    }
    if (hasTip) {
      tipContent.innerHTML = renderMD(perkData.tip);
    }
    if (hasAudio) {
      // parse SRT entry: '00:30 - TEXT' → {sec, text}
      function parseSrt(entries) {
        return (entries || [])
          .map((s) => {
            const m = String(s).match(/^(\d{1,2}):(\d{2})\s*-\s*(.*)/);
            if (!m) return null;
            return {
              sec: parseInt(m[1]) * 60 + parseInt(m[2]),
              text: m[3].trim(),
            };
          })
          .filter(Boolean);
      }

      function fmtTime(s) {
        const m = Math.floor(s / 60),
          ss = Math.floor(s % 60);
        return (
          String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0')
        );
      }

      // build track SVG play icon
      function playIcon() {
        return `<svg width="8" height="9" viewBox="0 0 10 12">
          <polygon points="0,0 10,6 0,12" fill="#e09040"/>
        </svg>`;
      }
      function pauseIcon() {
        return `<svg width="8" height="9" viewBox="0 0 10 12">
          <rect x="0" y="0" width="3.5" height="12" fill="#e09040"/>
          <rect x="6.5" y="0" width="3.5" height="12" fill="#e09040"/>
        </svg>`;
      }

      audioContent.innerHTML = '';
      const trackEls = [];
      const audioRefs = [];
      audioBox._audioRefs = audioRefs; // accessible from hideTooltip
      // header shows title of first (or only) track
      audioHeader.innerHTML =
        audiosList.length === 1
          ? `<span class="audio-title-text"><svg width="7" height="8" viewBox="0 0 10 12" style="display:inline-block;vertical-align:middle;margin-right:6px;opacity:0.6"><polygon points="0,0 10,6 0,12" fill="#8090a0"/></svg>${audiosList[0].title || 'Аудио'}</span>
           <span class="audio-header-srt" id="audio-srt-0"></span>`
          : `<span><svg width="7" height="8" viewBox="0 0 10 12" style="display:inline-block;vertical-align:middle;margin-right:6px;opacity:0.6"><polygon points="0,0 10,6 0,12" fill="#8090a0"/></svg>Аудио</span>`;

      audiosList.forEach((trackCfg, idx) => {
        const src = trackCfg.src || '';
        const title = trackCfg.title || '';
        const canSeek = trackCfg.rewind !== false;
        const loop = !!trackCfg.loop;
        const showTime = trackCfg.show_time !== false;
        const srtData = parseSrt(trackCfg.srt);
        const alignCls =
          trackCfg.align_srt === 'center'
            ? 'align-center'
            : trackCfg.align_srt === 'right'
              ? 'align-right'
              : '';

        const trackEl = document.createElement('div');
        trackEl.className = 'audio-track';
        // for multi-track: show title inside each track row
        const showTitleInRow = audiosList.length > 1 && title;
        trackEl.innerHTML = `
          ${showTitleInRow ? `<div class="audio-track-title">${title}</div>` : ''}
          <div class="audio-controls">
            <button class="audio-play-btn" data-idx="${idx}">${playIcon()}</button>
            ${
              canSeek
                ? `<div class="audio-progress-wrap" data-idx="${idx}">
                  <div class="audio-progress-fill"></div>
                  <div class="audio-progress-thumb"></div>
                </div>`
                : `<div class="audio-progress-wrap no-seek" data-idx="${idx}">
                  <div class="audio-progress-fill"></div>
                </div>`
            }
            ${showTime ? `<span class="audio-time">00:00</span>` : ''}
          ${
            trackCfg.volume
              ? `<span class="audio-vol-btn" data-vol-idx="${idx}">
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                <polygon points="0,2.5 0,6.5 3,6.5 6,9 6,0 3,2.5" fill="#8090a0"/>
                <path d="M7.5,2 Q10,4.5 7.5,7" stroke="#8090a0" stroke-width="1.2" stroke-linecap="round" fill="none"/>
              </svg>
            </span>`
              : ''
          }
          </div>
        `;

        // create Audio element
        const audio = new Audio();
        audio.src = src;
        audio.loop = loop;
        audio.preload = 'metadata';

        const playBtn = trackEl.querySelector('.audio-play-btn');
        const progWrap = trackEl.querySelector('.audio-progress-wrap');
        const progFill = trackEl.querySelector('.audio-progress-fill');
        const progThumb = trackEl.querySelector('.audio-progress-thumb');
        const timeEl = trackEl.querySelector('.audio-time');
        // srt shown in header span (single track) or ignored (multi)
        const srtEl = document.getElementById('audio-srt-' + idx);
        // volume popover — singleton #audio-vol-popup shown via JS
        const volBtn = trackEl.querySelector('.audio-vol-btn');
        if (volBtn) {
          const popup = document.getElementById('audio-vol-popup');

          let volHideTimer = null;

          const volTrack = popup?.querySelector('.audio-vol-track');
          const volFill = popup?.querySelector('.audio-vol-fill');
          const volThumb = popup?.querySelector('.audio-vol-thumb');

          function setVolume(v) {
            audio.volume = Math.min(1, Math.max(0, v));
            const pct = audio.volume * 100;
            if (volFill) volFill.style.height = pct + '%';
            if (volThumb) volThumb.style.bottom = pct + '%';
          }

          function volFromEvent(e) {
            if (!volTrack) return;
            const r = volTrack.getBoundingClientRect();
            setVolume(1 - (e.clientY - r.top) / r.height);
          }

          // drag state — scoped outside showVolPopup so listeners are added once
          let drag = false;
          if (volTrack) {
            volTrack.addEventListener('mousedown', (e) => {
              drag = true;
              volFromEvent(e);
              e.preventDefault();
            });
            volTrack.addEventListener('click', volFromEvent);
          }
          window.addEventListener('mousemove', (e) => {
            if (drag) volFromEvent(e);
          });
          window.addEventListener('mouseup', () => {
            drag = false;
          });

          function showVolPopup() {
            clearTimeout(volHideTimer);
            if (!popup) return;
            popup.style.display = 'flex';
            const r = volBtn.getBoundingClientRect();
            popup.style.left =
              r.left + r.width / 2 - popup.offsetWidth / 2 + 'px';
            popup.style.top = r.top - popup.offsetHeight - 6 + 'px';
            setVolume(audio.volume);
          }
          function hideVolPopup() {
            volHideTimer = setTimeout(() => {
              if (popup) popup.style.display = 'none';
            }, 200);
          }

          volBtn.addEventListener('mouseenter', showVolPopup);
          volBtn.addEventListener('mouseleave', hideVolPopup);
          if (popup) {
            popup.addEventListener('mouseenter', () =>
              clearTimeout(volHideTimer),
            );
            popup.addEventListener('mouseleave', hideVolPopup);
          }
        }

        function updateProgress() {
          if (!audio.duration) return;
          const pct = (audio.currentTime / audio.duration) * 100;
          if (progFill) progFill.style.width = pct + '%';
          if (progThumb) progThumb.style.left = pct + '%';
          if (timeEl) timeEl.textContent = fmtTime(audio.currentTime);
          // subtitle
          if (srtEl && srtData.length) {
            const t = audio.currentTime;
            let active = '';
            for (let i = srtData.length - 1; i >= 0; i--) {
              if (t >= srtData[i].sec) {
                active = srtData[i].text;
                break;
              }
            }
            srtEl.textContent = active;
          }
        }

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', () => {
          playBtn.innerHTML = playIcon();
          if (progFill) progFill.style.width = '0%';
          if (progThumb) progThumb.style.left = '0%';
          if (timeEl) timeEl.textContent = '00:00';
          if (srtEl) srtEl.textContent = '';
        });

        playBtn.addEventListener('click', () => {
          if (audio.paused) {
            audio.play();
            playBtn.innerHTML = pauseIcon();
          } else {
            audio.pause();
            playBtn.innerHTML = playIcon();
          }
        });

        if (canSeek && progWrap) {
          function seekFromEvent(e) {
            const rect = progWrap.getBoundingClientRect();
            const ratio = Math.min(
              1,
              Math.max(0, (e.clientX - rect.left) / rect.width),
            );
            if (audio.duration)
              audio.currentTime = ratio * audio.duration;
          }
          let seekDrag = false;
          progWrap.addEventListener('mousedown', (e) => {
            seekDrag = true;
            seekFromEvent(e);
            e.preventDefault();
          });
          window.addEventListener('mousemove', (e) => {
            if (seekDrag) seekFromEvent(e);
          });
          window.addEventListener('mouseup', () => {
            seekDrag = false;
          });
          progWrap.addEventListener('click', seekFromEvent);
        }

        // store audio el on track for cleanup
        trackEl._audio = audio;
        trackEl._audio = audio;
        audioContent.appendChild(trackEl);
        trackEls.push(trackEl);
        audioRefs.push(audio);
      });
    }

    if (hasCombo) {
      // resolve {name, colourHex} for any perk id, searching all chapters
      function resolvePerk(pid) {
        let pname = pid,
          pcol = 'o';
        for (const skill of D.skills) {
          const found = skill.perks.find((pp) => pp.id === pid);
          if (found) {
            pname = found.name;
            const CM = {
              orange: 'o',
              red: 'r',
              blue: 'b',
              green: 'g',
              purple: 'p',
              yellow: 'y',
              black: 'k',
              o: 'o',
              r: 'r',
              b: 'b',
              g: 'g',
              p: 'p',
              y: 'y',
              k: 'k',
            };
            pcol = skill.color
              ? CM[skill.color.toLowerCase()] || skill.color[0]
              : chapterColour.get(skill);
            break;
          }
        }
        const hex =
          {
            o: '#e09040',
            r: '#cc3838',
            b: '#3e80d0',
            g: '#28a860',
            p: '#7840c8',
            y: '#b89030',
            k: '#1a0000',
          }[pcol] || '#888';
        return { name: pname, hex };
      }

      // one combo-item row: a square+name+own-level for EACH dependent perk
      // (the combo key itself, plus any extras listed in info.perks as {lvl, perk}),
      // all sharing one description. Every row looks identical — no connectors.
      function renderComboRow(rows) {
        const rowsHtml = rows
          .map(({ pid, lvl }) => {
            const { name, hex } = resolvePerk(pid);
            return `<div class="combo-item-hdr" style="--combo-glow:0 0 6px 3px ${hex}88,0 0 14px 5px ${hex}44">
            <span class="combo-sq" data-rid="${pid}"
              style="display:inline-block;width:8px;height:8px;background:${hex};border-radius:1px;flex-shrink:0;cursor:pointer;transition:box-shadow .2s"
              onmouseenter="this.style.boxShadow='0 0 6px 3px ${hex}88,0 0 14px 5px ${hex}44'"
              onmouseleave="this.style.boxShadow=''"></span>
            <span class="combo-item-name" data-rid="${pid}" style="cursor:pointer">${name}</span>
            ${lvl ? `<span class="combo-item-lvl">от ур. ${lvl}</span>` : ''}
          </div>`;
          })
          .join('');
        const desc = renderMD(rows[0]?.desc || '');
        return `<div class="combo-item">${rowsHtml}<div class="combo-item-desc">${desc}</div></div>`;
      }

      comboLvls.innerHTML = Object.entries(combo)
        .map(([partnerId, info]) => {
          // info.perks (optional): [{ lvl, perk }, ...] — additional co-dependent perks,
          // each with its OWN required level. The combo key itself uses info.reqLvl.
          const extraRows = Array.isArray(info.perks)
            ? info.perks
                .filter((p) => p && p.perk)
                .map((p) => ({ pid: p.perk, lvl: p.lvl }))
            : [];
          const rows = [
            { pid: partnerId, lvl: info.reqLvl, desc: info.desc },
            ...extraRows,
          ];
          return renderComboRow(rows);
        })
        .join('');
    }

    // Layout runs IMMEDIATELY (no waiting on media at all) so every window,
    // including combo, appears with zero delay. If img/extra's box used the
    // spinner's tiny scrollHeight to size itself, runLayout() re-runs once
    // any media finishes loading AFTER the first pass, fixing the size
    // (and repositioning combo accordingly) without ever blocking first paint.
    function runLayout(imgOnly = false) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            // ── SLOT-BASED LAYOUT ──
            // ── NEW COLUMN-BASED PLACEMENT SYSTEM ──
            // Windows stack top→bottom within a column.
            // Columns are numbered 1/2/3 (screen left→right).
            // perk row determines which columns are available.

            const allColsLayout = document.querySelectorAll('.col');
            const colsArr = Array.from(allColsLayout);
            let colIdx = perkCol ? colsArr.indexOf(perkCol) : 1;
            if (colIdx < 0) colIdx = 1;
            colIdx = colIdx % 3;

            // resolve which column each window goes to
            const winColMap = resolveWindowCols(
              activeKinds,
              perkData?.positions || null,
              colIdx,
              perkData?.order || null,
            );

            // box/svg/content-selector per kind
            // BOX/SVG resolved per-iteration for IMG (multiple instances)
            const BOX_STATIC = {
              AUDIO: audioBox,
              EXTRA: extraBox,
              TIP: tipBox,
              COMBO: comboBox,
            };
            const SVG_STATIC = {
              AUDIO: audioArwSvg,
              EXTRA: extraSvg,
              TIP: tipSvg,
              COMBO: comboSvg,
            };
            const CONTENT_SEL = {
              IMG: '.win-img-content',
              // snippet windows are literally createWin('img') (see
              // snippetBoxes above) — same content class, same selector.
              SNIPPET: '.win-img-content',
              AUDIO: '.win-audio-content',
              EXTRA: '.win-extra-content',
              TIP: '.win-tip-content',
              COMBO: null,
            };

            // Build X positions for each screen column (1/2/3)
            // col1=left of tooltip, col2=right, col3=further in fill direction
            const levelsScreenCol = LEVELS_SCREEN_COL[colIdx] || 2;
            const fillOrder = COL_FILL_ORDER[colIdx] || [2, 3];

            // Physical X for each screen column
            function colScreenX(screenCol) {
              if (screenCol === levelsScreenCol) return null; // occupied by levels
              // relative to mainR
              const rightX = mainR.right + SLOT_COL_GAP;
              const leftX = mainR.left - SLOT_COL_GAP - SLOT_COL_W;
              const right2X = mainR.right + SLOT_COL_GAP * 2 + SLOT_COL_W;
              const left2X =
                mainR.left - SLOT_COL_GAP * 2 - SLOT_COL_W * 2;

              // map screen col to physical X based on which side levels is on
              if (levelsScreenCol === 1) {
                // levels on left → col2=right, col3=further right
                if (screenCol === 2) return { x: rightX, side: 'right' };
                if (screenCol === 3) return { x: right2X, side: 'right' };
              } else if (levelsScreenCol === 2) {
                // levels in middle → col1=left, col3=right
                if (screenCol === 1) return { x: leftX, side: 'left' };
                if (screenCol === 3) return { x: rightX, side: 'right' };
              } else {
                // levels on right → col1=left, col2=further left
                if (screenCol === 1) return { x: leftX, side: 'left' };
                if (screenCol === 2) return { x: left2X, side: 'left' };
              }
              return { x: rightX, side: 'right' }; // fallback
            }

            // track bottom of last placed window per screen column
            const colBottom = {}; // screenCol → bottomY
            for (const sc of [1, 2, 3]) colBottom[sc] = mainR.top;

            const placedRects = {}; // kind → DOMRect

            // first window in col2 (primary fill) gets Stylish offset
            // when vertical tree connector crosses that column's entry point
            const firstInCol = {}; // screenCol → bool (has a window been placed yet)
            // screenCol → placedKey of the most recently PLACED window there —
            // tracks actual runtime placement, not the static pre-overflow
            // assignment in winColMap (see the connector-line block below,
            // which used to re-derive this from winColMap and silently broke
            // for any window whose runtime screenCol differs from its
            // originally-assigned one — overflow AND the mirror fallback both
            // do this).
            const lastKeyInCol = {};

            let _imgBoxIdx = 0; // tracks which imgBoxes[i] to use for IMG kind
            let _snippetBoxIdx = 0; // tracks which snippetBoxes[i] to use for SNIPPET kind

            for (const { kind, col: assignedCol } of winColMap) {
              if (imgOnly && kind !== 'IMG') continue;
              const _imgInstIdx = kind === 'IMG' ? _imgBoxIdx : -1;
              // captured BEFORE the increment below — unlike IMG's hint
              // sizing (which always reads imgSources[0], regardless of
              // instance), each SNIPPET window has its OWN `size`, so the
              // hint block later needs to know exactly which entry this is.
              const _snippetInstIdx = kind === 'SNIPPET' ? _snippetBoxIdx : -1;
              const box =
                kind === 'IMG'
                  ? imgBoxes[_imgBoxIdx]?.box
                  : kind === 'SNIPPET'
                    ? snippetBoxes[_snippetBoxIdx]?.box
                    : BOX_STATIC[kind];
              const svg =
                kind === 'IMG'
                  ? imgBoxes[_imgBoxIdx]?.svg
                  : kind === 'SNIPPET'
                    ? snippetBoxes[_snippetBoxIdx]?.svg
                    : SVG_STATIC[kind];
              const placedKey =
                kind === 'IMG'
                  ? `IMG_${_imgBoxIdx}`
                  : kind === 'SNIPPET'
                    ? `SNIPPET_${_snippetBoxIdx}`
                    : kind;
              if (kind === 'IMG' && box) _imgBoxIdx++;
              if (kind === 'SNIPPET' && box) _snippetBoxIdx++;
              const contentSel = CONTENT_SEL[kind];
              if (!box) continue;

              // find actual column to place in (may overflow to next)
              let screenCol = assignedCol;
              let posInfo = colScreenX(screenCol);

              // helper: compute availH for a given column
              function availInCol(sc) {
                const bot = colBottom[sc] || mainR.top;
                const sy = bot + (bot > mainR.top ? SLOT_ROW_GAP : 0);
                return vhC - sy - 8;
              }

              // measure real content height for non-media windows
              // (content is filled before runLayout, so scrollHeight is accurate)
              let minNeeded = MIN_SECONDARY_H;
              if (
                box &&
                kind !== 'IMG' &&
                kind !== 'SNIPPET' &&
                kind !== 'AUDIO'
              ) {
                box.style.display = 'flex';
                box.style.maxHeight = 'none';
                box.style.width = SLOT_COL_W + 'px';
                box.style.position = 'fixed';
                box.style.top = '-9999px';
                const natural = Math.min(box.scrollHeight, SOLO_MAX_H);
                box.style.display = 'none';
                box.style.maxHeight = '';
                box.style.top = '';
                if (natural > MIN_SECONDARY_H) minNeeded = natural;
              } else if (kind === 'IMG' || kind === 'SNIPPET') {
                minNeeded = scale(120);
              } else if (kind === 'AUDIO') {
                minNeeded = scale(60);
              }

              // if not enough room in assigned column → overflow to next
              if (!posInfo || availInCol(screenCol) < minNeeded) {
                for (const sc of fillOrder) {
                  if (sc === screenCol) continue;
                  const pi = colScreenX(sc);
                  if (pi && availInCol(sc) >= minNeeded) {
                    screenCol = sc;
                    posInfo = pi;
                    break;
                  }
                }
              }
              if (!posInfo) continue;

              // ── OVERLAP GUARD ──
              // Every slot fillOrder offers can still clamp to the same
              // viewport edge (e.g. a narrow window + a tooltip that already
              // eats most of the width) — clamping silently stacks this box
              // on top of whatever else already clamped to that edge instead
              // of finding it real room. Before clamping, try the OTHER side
              // of the tooltip instead: there's usually space there, since
              // normally only one side is under pressure at a time.
              if (posInfo.x < 4 || posInfo.x + SLOT_COL_W > vwC - 4) {
                const mirrorSide =
                  posInfo.side === 'left' ? 'right' : 'left';
                const mirrorX =
                  mirrorSide === 'right'
                    ? mainR.right + SLOT_COL_GAP
                    : mainR.left - SLOT_COL_GAP - SLOT_COL_W;
                const mirrorBottom = colBottom.mirror || mainR.top;
                const mirrorStartY =
                  mirrorBottom +
                  (mirrorBottom > mainR.top ? SLOT_ROW_GAP : 0);
                const mirrorAvailH = vhC - mirrorStartY - 8;
                const mirrorFits =
                  mirrorX >= 4 &&
                  mirrorX + SLOT_COL_W <= vwC - 4 &&
                  mirrorAvailH >= minNeeded;
                if (mirrorFits) {
                  console.warn(
                    `[Древо] Окну ${kind} не хватило места (${posInfo.side}) — рендерим с противоположной стороны (${mirrorSide}), чтобы не наслаивалось на другие окна`,
                  );
                  screenCol = 'mirror';
                  posInfo = { x: mirrorX, side: mirrorSide };
                }
              }

              // clamp X to viewport
              let { x, side } = posInfo;
              if (x < 4) x = 4;
              if (x + SLOT_COL_W > vwC - 4) x = vwC - SLOT_COL_W - 4;

              const startY =
                (colBottom[screenCol] || mainR.top) +
                ((colBottom[screenCol] || mainR.top) > mainR.top
                  ? SLOT_ROW_GAP
                  : 0);

              const availH = vhC - startY - 8;
              if (availH < MIN_SECONDARY_H) {
                console.warn(
                  `[Древо] Нет места для окна ${kind} — пропускаем`,
                );
                continue;
              }

              box.style.left = x + 'px';
              box.style.top = startY + 'px';
              box.style.width = SLOT_COL_W + 'px';

              const isMediaKind = kind === 'IMG' || kind === 'SNIPPET';
              const isSolo =
                winColMap.filter((e) => e.col === screenCol).length === 1;
              const cap = Math.min(SOLO_MAX_H, availH);
              let effectiveH = cap;

              // IMG/SNIPPET: size from a hint — a filename convention for
              // IMG (parseSizeHint), the explicit `size:"WIDTHxHEIGHT"`
              // field for SNIPPET (parseSnippetSize) since an arbitrary
              // .html page has no filename convention that would make
              // sense. Both feed the same measure-the-real-box technique
              // below — width is always the fixed SLOT_COL_W column width
              // either way, only the resulting HEIGHT differs.
              let sizeHint = null,
                hintSrc = null;
              if (kind === 'IMG' && imgSources.length) {
                hintSrc = imgSources[0]?.src || '';
                sizeHint = parseSizeHint(hintSrc);
              } else if (kind === 'SNIPPET') {
                hintSrc = snippetSources[_snippetInstIdx]?.size || null;
                sizeHint = parseSnippetSize(hintSrc);
              }
              const containerW = SLOT_COL_W - scale(20);
              const hinted = sizeHint
                ? hintedHeight(sizeHint, containerW, cap)
                : null;
              if (hinted && !(kind === 'IMG' && wantsMaximum)) {
                // Measure the box's REAL total natural height (header +
                // padding + the flex `gap` + an entry's `desc`, if any)
                // instead of hand-summing those — same off-screen
                // "temporarily show it, read scrollHeight, hide again"
                // technique already used for non-media kinds above, just
                // seeded with the hint height first since the media itself
                // (image not yet loaded, or a snippet's iframe has no
                // natural size at all) would otherwise measure as ~0. A
                // hand-summed estimate here previously missed the
                // container's flex `gap`, letting `desc` trigger a spurious
                // scrollbar even when the box had genuinely enough room for
                // both.
                const mediaEl = box.querySelector('img, video, iframe');
                const prevMediaH = mediaEl ? mediaEl.style.height : null;
                if (mediaEl) mediaEl.style.height = hinted + 'px';
                box.style.display = 'flex';
                box.style.maxHeight = 'none';
                const natural = box.scrollHeight;
                box.style.display = 'none';
                box.style.maxHeight = '';
                if (mediaEl) mediaEl.style.height = prevMediaH || '';
                effectiveH = Math.min(natural, cap);
                console.log('[MEDIA SIZE]', {
                  kind,
                  hintSrc,
                  sizeHint,
                  containerW,
                  hinted,
                  natural,
                  cap,
                  effectiveH,
                });
              }

              box.style.maxHeight = effectiveH + 'px';
              box.style.height = isMediaKind ? effectiveH + 'px' : '';
              box.style.minHeight = '';
              box.style.display = 'flex';

              if (contentSel && !isMediaKind)
                pinContentHeight(box, contentSel);
              if (isMediaKind && contentSel) {
                // Safety net beyond the hint-based effectiveH above: if the
                // real rendered content (media once loaded + desc) still
                // ends up taller than what effectiveH allocated — no hint
                // matched (e.g. an undimensioned video, height:'maximum',
                // or a snippet with no `size`), or the hint underestimated
                // — scroll instead of silently clipping the description.
                // Re-checked again once the media finishes loading (see
                // makeMediaEl's/withLoadingSpinner's load handlers) since
                // its rendered size can still change after this point.
                refreshImgScroll(box.querySelector(contentSel));
              }

              void box.offsetHeight; // force layout flush
              const rect = box.getBoundingClientRect();
              placedRects[placedKey] = rect;
              // capture BEFORE overwriting — this is what the stub-connector
              // code below anchors to (the window placed just before this
              // one in the same actual screenCol).
              const _prevKeyInCol = lastKeyInCol[screenCol];
              lastKeyInCol[screenCol] = placedKey;
              // prefer computed bottom for media (hint-sized), rect for text windows
              colBottom[screenCol] =
                isMediaKind ? startY + effectiveH : rect.bottom;

              // ── STYLISH OFFSET ──
              // First window in a column that sits beside the vertical tree connector
              // drops 40px so the horizontal connector line doesn't overlap the vertical one.
              // colIdx=0 (left perk): connector is left of col1 → no offset needed
              // colIdx=1 (mid perk):  connector between col1 and col2 → offset for col1 first win
              // colIdx=2 (right perk):connector between col1 and col2 → offset for col1 first win
              const isFirstInCol = !firstInCol[screenCol];
              firstInCol[screenCol] = true;
              // Stylish offset needed only when horizontal line would cross
              // the vertical tree connector:
              // colIdx=0 (left perk): tree connector LEFT of col1 → no stylish needed
              // colIdx=1 (mid perk):  tree connector between col1-col2 → stylish LEFT (side=left)
              // colIdx=2 (right perk):tree connector between col2-col3 (RIGHT side) → no stylish for left
              // Stylish offset: first window drops 40px to avoid crossing vertical tree connector
              // colIdx=1 (mid perk, windows go LEFT):  connector is between col1-col2 → offset left side
              // colIdx=2 (right perk, windows go RIGHT): connector is between col2-col3 → offset right side
              const needsStylish =
                isFirstInCol &&
                ((colIdx === 1 && side === 'left') ||
                  (colIdx === 2 && side === 'right'));
              const STYLISH_OFFSET = needsStylish ? 40 : 0;

              if (STYLISH_OFFSET) {
                box.style.top = startY + STYLISH_OFFSET + 'px';
                if (!isMediaKind) {
                  box.style.maxHeight =
                    Math.max(80, effectiveH - STYLISH_OFFSET) + 'px';
                }
                if (contentSel && !isMediaKind)
                  pinContentHeight(box, contentSel);
                const r2 = box.getBoundingClientRect();
                placedRects[placedKey] = r2;
                colBottom[screenCol] = r2.bottom;
              }

              const finalRect = placedRects[placedKey];

              // ── CONNECTOR LINE ──
              if (!svg) continue;

              if (isFirstInCol || STYLISH_OFFSET) {
                const R2 = Math.round;
                const isOverflow = screenCol !== fillOrder[0];

                // for overflow column: L-shape going below all primary-col windows
                // for primary column: simple horizontal from mainR / icX
                let svgContent, totalLen;

                if (isOverflow && !needsStylish) {
                  // short horizontal from last col2 window edge to this window
                  const primaryColX2 = colScreenX(fillOrder[0])?.x || 0;
                  const primaryMaxBottom2 = Object.values(placedRects)
                    .filter(
                      (r) =>
                        r &&
                        Math.abs(
                          Math.round(r.left) - Math.round(primaryColX2),
                        ) < 5,
                    )
                    .reduce(
                      (max, r) => Math.max(max, r.bottom),
                      mainR.top,
                    );
                  // find the last primary col window by bottom
                  const lastPrimaryRect = Object.values(placedRects)
                    .filter(
                      (r) =>
                        r &&
                        Math.abs(
                          Math.round(r.left) - Math.round(primaryColX2),
                        ) < 5,
                    )
                    .reduce(
                      (last, r) =>
                        r.bottom > (last?.bottom || 0) ? r : last,
                      null,
                    );
                  // start from the right edge of the rightmost window in primary col
                  // (= right edge of col2 windows, not mainR.right which is further left)
                  const _primaryRight = Object.values(placedRects)
                    .filter((r) => r)
                    .filter((r) =>
                      side === 'right'
                        ? Math.round(r.left) >=
                            Math.round(mainR.right) - 5 &&
                          Math.round(r.left) < Math.round(finalRect.left)
                        : Math.round(r.right) <=
                            Math.round(mainR.left) + 5 &&
                          Math.round(r.right) >
                            Math.round(finalRect.right),
                    )
                    .reduce(
                      (best, r) =>
                        side === 'right'
                          ? r.right > (best?.right || 0)
                            ? r
                            : best
                          : r.left < (best?.left || Infinity)
                            ? r
                            : best,
                      null,
                    );
                  const fromX2 = _primaryRight
                    ? side === 'right'
                      ? R2(_primaryRight.right)
                      : R2(_primaryRight.left)
                    : side === 'right'
                      ? R2(mainR.right)
                      : R2(mainR.left);
                  const toX2 =
                    side === 'right'
                      ? R2(finalRect.left)
                      : R2(finalRect.right);
                  const lineY2 = R2(finalRect.top + 18);
                  totalLen = Math.abs(toX2 - fromX2);
                  svgContent = `<line x1="${fromX2}" y1="${lineY2}" x2="${toX2}" y2="${lineY2}"
                    stroke="#50556a" stroke-width="1.5"
                    stroke-dasharray="${totalLen}" stroke-dashoffset="${totalLen}"
                    style="animation:dashIn .4s ease forwards"/>`;
                } else {
                  // simple horizontal — draw at header level of the window
                  const lineY = R2(finalRect.top + 18);
                  let fromX;
                  if (needsStylish) {
                    fromX = R2(icX);
                  } else {
                    fromX =
                      side === 'right' ? R2(mainR.right) : R2(mainR.left);
                  }
                  const toX =
                    side === 'right'
                      ? R2(finalRect.left)
                      : R2(finalRect.right);
                  totalLen = Math.abs(toX - fromX);
                  svgContent = `<line x1="${fromX}" y1="${lineY}" x2="${toX}" y2="${lineY}"
                    stroke="#50556a" stroke-width="1.5"
                    stroke-dasharray="${totalLen}" stroke-dashoffset="${totalLen}"
                    style="animation:dashIn .4s ease forwards"/>`;
                }

                svg.setAttribute('viewBox', `0 0 ${vwC} ${vhC}`);
                svg.setAttribute('width', vwC);
                svg.setAttribute('height', vhC);
                svg.style.display = 'block';
                svg.style.position = 'fixed';
                svg.style.left = '0';
                svg.style.top = '0';
                svg.style.pointerEvents = 'none';
                svg.style.zIndex = '501';
                svg.style.overflow = 'visible';
                svg.innerHTML = svgContent;
                if (debugLines) {
                  const _el = svg.querySelector('line,polyline');
                  if (_el) {
                    let _pts = [];
                    if (_el.tagName === 'line') {
                      _pts = [
                        {
                          x: +_el.getAttribute('x1'),
                          y: +_el.getAttribute('y1'),
                        },
                        {
                          x: +_el.getAttribute('x2'),
                          y: +_el.getAttribute('y2'),
                        },
                      ];
                    } else {
                      _pts = _el
                        .getAttribute('points')
                        .trim()
                        .split(/\s+/)
                        .map((p) => {
                          const [x, y] = p.split(',');
                          return { x: +x, y: +y };
                        });
                    }
                    _pts.forEach((p) => {
                      svg.innerHTML +=
                        `<circle cx="${p.x}" cy="${p.y}" r="4" fill="red" style="animation:none"/>` +
                        `<text x="${p.x + 6}" y="${p.y - 4}" fill="red" font-size="10" font-family="monospace" style="animation:none">${Math.round(p.x)},${Math.round(p.y)}</text>`;
                    });
                  }
                }
              } else {
                // short vertical stub from bottom of previous window to top
                // of this one, in the same actual screenCol — _prevKeyInCol
                // was captured at placement time (see above), tracking real
                // runtime placement rather than winColMap's static
                // pre-overflow column assignment.
                const _prevAnchorKey = _prevKeyInCol;
                const anchorRect =
                  _prevAnchorKey && placedRects[_prevAnchorKey]
                    ? placedRects[_prevAnchorKey]
                    : mainR;
                if (anchorRect && svg) {
                  const R2 = Math.round;
                  const lx = R2(finalRect.left + 20);
                  const ly1 = R2(anchorRect.bottom);
                  const ly2 = R2(finalRect.top);
                  const llen = Math.max(1, Math.abs(ly2 - ly1));
                  svg.setAttribute('viewBox', `0 0 ${vwC} ${vhC}`);
                  svg.setAttribute('width', vwC);
                  svg.setAttribute('height', vhC);
                  svg.style.display = 'block';
                  svg.style.position = 'fixed';
                  svg.style.left = '0';
                  svg.style.top = '0';
                  svg.style.pointerEvents = 'none';
                  svg.style.zIndex = '501';
                  svg.style.overflow = 'visible';
                  svg.innerHTML = `<line x1="${lx}" y1="${ly1}" x2="${lx}" y2="${ly2}"
                    stroke="#50556a" stroke-width="1.5"
                    stroke-dasharray="${llen}" stroke-dashoffset="${llen}"
                    style="animation:dashIn .3s ease forwards"/>`;
                  if (debugLines) {
                    svg.innerHTML +=
                      `<circle cx="${lx}" cy="${ly1}" r="4" fill="red" style="animation:none"/>` +
                      `<text x="${lx + 6}" y="${ly1 - 4}" fill="red" font-size="10" font-family="monospace" style="animation:none">${lx},${ly1}</text>` +
                      `<circle cx="${lx}" cy="${ly2}" r="4" fill="red" style="animation:none"/>` +
                      `<text x="${lx + 6}" y="${ly2 - 4}" fill="red" font-size="10" font-family="monospace" style="animation:none">${lx},${ly2}</text>`;
                  }
                }
              }
            } // end for winColMap
            // IMG2 is now placed by the main winColMap loop as kind='IMG2'

            // ── COMBO: attach click handlers for focus-jump ──
            if (placedRects['COMBO']) {
              comboLvls
                .querySelectorAll('.combo-sq, .combo-item-name')
                .forEach((sq) => {
                  sq.addEventListener('click', () => {
                    const rid = sq.dataset.rid;
                    const allPerks = document.querySelectorAll('.perk');
                    let target = null;
                    for (const pe of allPerks) {
                      if (pe.dataset.perkId === rid) {
                        target = pe;
                        break;
                      }
                    }
                    if (!target) return;
                    hideTooltip();
                    target.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
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
                      const _ic = target.querySelector('.perk-icon');
                      const _cm = {
                        'ic-o': '#e09040',
                        'ic-r': '#cc3838',
                        'ic-b': '#3e80d0',
                        'ic-g': '#28a860',
                        'ic-p': '#7840c8',
                        'ic-y': '#b89030',
                        'ic-k': '#1a0000',
                      };
                      const _hex =
                        Object.entries(_cm).find(
                          ([k]) => _ic && _ic.classList.contains(k),
                        )?.[1] || '#e09040';
                      target.style.boxShadow = `0 0 0 2px ${_hex},0 0 30px ${_hex}80`;
                      function clearFocus() {
                        fo.style.background = 'rgba(0,0,0,0)';
                        target.style.boxShadow = '';
                        window.removeEventListener('scroll', clearFocus, {
                          passive: true,
                        });
                        window.removeEventListener('click', clearFocus);
                        window.removeEventListener('keydown', clearFocus);
                        setTimeout(() => {
                          fo.remove();
                          target.style.position = '';
                          target.style.zIndex = '';
                          target.style.transition = '';
                        }, 350);
                      }
                      fo.addEventListener('click', clearFocus);
                      setTimeout(() => {
                        window.addEventListener('scroll', clearFocus, {
                          once: true,
                          passive: true,
                        });
                        window.addEventListener('keydown', clearFocus, {
                          once: true,
                        });
                      }, 400);
                    }, 500);
                  });
                });
            }
          }),
        ),
      );
    } // end runLayout

    runLayout(); // run immediately — no waiting on media load
    // size is known from filename hint — no second runLayout needed
  }

  // draw L-line — terminates at the NEAR edge of the tooltip, never runs underneath it
  const ttHeaderMidY = y + 18;
  const toX = goRight ? x : x + tw; // near edge: left edge if goRight, right edge if not
  const cornerY = ttHeaderMidY;
  const vLen = Math.abs(icY - cornerY);
  const hLen = Math.abs(toX - icX);
  const total = vLen + hLen;

  ttArrowSvg.style.cssText = `display:block;position:fixed;left:0;top:0;width:${vw}px;height:${vh}px;pointer-events:none;z-index:499;overflow:visible;`;
  ttArrowSvg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  ttArrowSvg.innerHTML = `
    <circle cx="${icX}" cy="${icY}" r="3" fill="#50556a"/>
    <polyline points="${icX},${icY} ${icX},${cornerY} ${toX},${cornerY}"
fill="none" stroke="#50556a" stroke-width="1.5"
stroke-dasharray="${total}" stroke-dashoffset="${total}"
style="animation:dashIn .3s ease forwards"/>`;
}

export function hideTooltip() {
  if (!_isVisible) return;
  _isVisible = false;
  try {
    sessionStorage.removeItem(OPEN_TOOLTIP_STORAGE_KEY);
  } catch (e) {}
  // see showTooltip()
  document.documentElement.style.removeProperty('--perk-accent-color');
  document.documentElement.style.removeProperty('--perk-accent-r');
  document.documentElement.style.removeProperty('--perk-accent-g');
  document.documentElement.style.removeProperty('--perk-accent-b');
  hideNoteLinkPopup(); // the trigger word this popup is linked to is about to disappear
  tooltipEl.style.display = 'none';
  tooltipEl.style.maxHeight = '';
  tooltipEl.style.opacity = '0';
  ttOverlay.style.display = 'none';
  ttOverlay.style.background = 'rgba(0,0,0,0)';
  ttArrowSvg.style.display = 'none';
  ttArrowSvg.innerHTML = '';
  // stop audio/video before destroying
  document.querySelectorAll('.win-audio').forEach((ab) => {
    ab._audioRefs?.forEach((a) => {
      try {
        a.pause();
      } catch (e) {}
      a.src = '';
    });
  });
  document
    .querySelectorAll('.win-img video, .win-img-content video')
    .forEach((v) => {
      v.pause();
      v.removeAttribute('src');
      v.load();
    });
  destroyWins();
  document.body.style.overflow = '';
  if (_currentBtn) {
    _currentBtn.classList.remove('glowing');
    _currentBtn = null;
  }
}

// close on Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideTooltip();
});
// close on click outside tooltip
ttOverlay.addEventListener('click', hideTooltip);
