import { STAND_DATA } from '../config.js';
import { ttArrowSvg } from './dom-refs.js';
import { renderLevelMD, renderMD } from './markdown.js';
import { showTooltip, isCurrentBtn } from './tooltip.js';
import { showSpectre, isSpectreOpen } from './spectre.js';
import { COLOURS, FOCUS_DIM, ICON_HEX } from './constants.js';

// ── PROCESS CONFIG ──
const D = STAND_DATA;
export const totalPerks = D.skills.reduce((s, ch) => s + ch.perks.length, 0);
const nRanks = D.ranks.length;
const maxLevelPerSkill = D.maxLevelPerSkill || 10;
const maxLevel = totalPerks * maxLevelPerSkill;
const lvlPerRank = Math.ceil(maxLevel / nRanks);

// update topbar stats
const standName = D.standName || D.tabName || 'Стэнд';
// tb-title is static 'ДРЕВО СПОСОБНОСТЕЙ'
document.getElementById('title-name').innerHTML =
  '<span style="display:inline-block;width:10px;height:10px;background:#e09040;border-radius:1px;margin-right:7px;vertical-align:middle"></span>' +
  standName;
document.getElementById('title-desc').textContent = D.desc || '';

// config-version badge, bottom-right corner — shows standName / desc / version from the config
if (D.version) {
  document.getElementById('title-version').textContent = D.version;
}

// spectre tooltip on title-box icon click
if (D.spectre) {
  const titleIcon = document.querySelector('#title-name span');
  if (titleIcon) {
    titleIcon.style.cursor = 'pointer';
    titleIcon.style.transition = 'box-shadow .25s';
    titleIcon.addEventListener('mouseenter', () => {
      titleIcon.style.boxShadow =
        '0 0 6px 3px rgba(224,144,64,.9), 0 0 18px 7px rgba(224,144,64,.35)';
    });
    titleIcon.addEventListener('mouseleave', () => {
      if (isSpectreOpen()) return;
      titleIcon.style.boxShadow = '';
    });
    titleIcon.addEventListener('click', () => showSpectre(titleIcon));
  }
}
document.getElementById('stat-perks').textContent = totalPerks;
document.getElementById('stat-lvl-per-rank').textContent = lvlPerRank;
document.getElementById('stat-max-lvl').textContent = maxLevel;

// alt names as tags
const anBox = document.getElementById('altnames-box');
const names = D.otherNames || D.altNames || [];
anBox.innerHTML = `<div class="altnames-label">👤 Альтернативные имена</div>
  <div class="altnames-tags">${names.map((n) => `<span class="an-tag">${n}</span>`).join('')}</div>`;

// ── DISTRIBUTE chapters into 3 columns (balance by perk count) ──
function distributeToColumns(skills, nCols) {
  // greedy: assign each chapter to the column with fewest perks so far
  const cols = Array.from({ length: nCols }, () => []);
  const counts = new Array(nCols).fill(0);
  skills.forEach((ch) => {
    const minIdx = counts.indexOf(Math.min(...counts));
    cols[minIdx].push(ch);
    counts[minIdx] += ch.perks.length;
  });
  return cols;
}
const columns = distributeToColumns(D.skills, 3);

// use explicit color from config if set, else auto-assigned
const COLOR_MAP = {
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
};
const LETTER_TO_NAME = {
  o: 'orange',
  r: 'red',
  b: 'blue',
  g: 'green',
  p: 'purple',
  y: 'yellow',
  k: 'black',
};

// assign colour index globally (sequential across all chapters)
let globalColIdx = 0;
const chapterColour = new Map();
// perk count per full colour name — used by the Spectre popup to show
// what share of all perks each colour group makes up.
export const perkCountByColor = {};
D.skills.forEach((ch) => {
  chapterColour.set(ch, COLOURS[globalColIdx % COLOURS.length]);
  globalColIdx++;
  const c = ch.color
    ? COLOR_MAP[ch.color.toLowerCase()] || ch.color[0]
    : chapterColour.get(ch);
  const colourName = LETTER_TO_NAME[c] || c;
  perkCountByColor[colourName] =
    (perkCountByColor[colourName] || 0) + ch.perks.length;
});

// ── BUILD COLUMNS ──
const colsRow = document.getElementById('cols-row');
export const colRefs = [];

columns.forEach((chapters, colPos) => {
  const col = document.createElement('div');
  col.className = 'col';
  // consumed by css/mobile.css to show only one column at a time behind
  // the mobile tab bar (js/mobile-tabs.js) below the ~768px breakpoint.
  col.dataset.colIdx = colPos + 1;

  const connEl = document.createElement('div');
  connEl.className = 'col-connector';
  const connSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  connSvg.setAttribute('aria-hidden', 'true');
  connEl.appendChild(connSvg);

  // col spine drawn inside connSvg (no separate element)
  const spineSvg = null;
  const contentEl = document.createElement('div');
  contentEl.className = 'col-content';

  const chRefs = [];
  chapters.forEach((ch) => {
    // use explicit color from config if set, else auto-assigned
    const c = ch.color
      ? COLOR_MAP[ch.color.toLowerCase()] || ch.color[0]
      : chapterColour.get(ch);
    const titleClean = ch.chapterTitle.replace(/^\d+\.\s*/, '');
    const numMatch = ch.chapterTitle.match(/^(\d+)\./);
    const num = numMatch ? numMatch[1] : '';

    const chDiv = document.createElement('div');
    chDiv.className = 'chapter';

    const hdr = document.createElement('div');
    hdr.className = `ch-hdr hc-${c}`;
    hdr.innerHTML = `<span class="ch-num">${num ? num + '.' : ''}</span><span class="ch-name">${titleClean}</span>`;

    const pw = document.createElement('div');
    pw.className = 'perks-wrap';

    ch.perks.forEach((p) => {
      const pEl = document.createElement('div');
      pEl.className = 'perk';
      pEl.dataset.perkId = p.id;
      // .inline-note-ref/.inline-tip-ref (base.css) default to
      // var(--perk-accent-color) — set here so a <tip>/<note> ref rendered
      // in this perk's OWN tree text (.perk-desc below) is colored even
      // when no tooltip is open. tooltip.js's showTooltip() sets the same
      // variable on <html> while a tooltip IS open, covering refs rendered
      // there instead (tooltip content isn't a DOM descendant of pEl).
      pEl.style.setProperty('--perk-accent-color', ICON_HEX[c] || '#888');
      pEl.innerHTML = `<div class="perk-icon ic-${c}"></div>
  <div class="perk-body">
    <div class="perk-name-row">
      <div class="perk-name">${p.name}</div>
    </div>
    <div class="perk-desc">${renderLevelMD(p.description || '')}</div>
  </div>`;

      // chain dependency icon
      if (p.requiredPerks && p.requiredPerks.length) {
        const chainSvg = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg',
        );
        chainSvg.setAttribute('viewBox', '0 0 16 16');
        chainSvg.classList.add('perk-chain');
        // 🔗-like: two ovals linked with a connecting bar, rotated 45deg
        chainSvg.innerHTML = `
    <g transform="rotate(-40 8 8)">
      <rect x="2" y="5.5" width="5" height="3" rx="1.5" fill="none" stroke="#8090a0" stroke-width="1.2"/>
      <rect x="9" y="7.5" width="5" height="3" rx="1.5" fill="none" stroke="#8090a0" stroke-width="1.2"/>
      <line x1="7" y1="7" x2="9" y2="9" stroke="#8090a0" stroke-width="1.2"/>
    </g>`;

        const tip = document.createElement('div');
        tip.className = 'perk-chain-tip';
        tip.innerHTML =
          `<strong>Эта способность требует развития:</strong>` +
          p.requiredPerks
            .map((entry) => {
              const [rid, reqLvlStr] = entry.split(':');
              const reqLvl = reqLvlStr ? parseInt(reqLvlStr, 10) : null;
              let rname = rid,
                rcolor = 'o';
              for (const skill of D.skills) {
                const found = skill.perks.find((pp) => pp.id === rid);
                if (found) {
                  rname = found.name;
                  // find chapter colour
                  const COLOR_MAP2 = {
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
                  };
                  rcolor = skill.color
                    ? COLOR_MAP2[skill.color.toLowerCase()] || skill.color[0]
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
                }[rcolor] || '#888';
              return `<div class="perk-chain-dep" data-rid="${rid}" style="cursor:pointer"
          onmouseenter="this.querySelector('span').style.boxShadow='0 0 6px 3px ${hex}88, 0 0 14px 5px ${hex}44'; this.querySelectorAll('span')[1].style.color='#e0ddd6'"
          onmouseleave="this.querySelector('span').style.boxShadow=''; this.querySelectorAll('span')[1].style.color=''">
        <span style="display:inline-block;width:8px;height:8px;background:${hex};border-radius:1px;flex-shrink:0;transition:box-shadow .2s"></span>
        <span style="transition:color .15s">${rname}</span>${reqLvl ? `<span class="perk-chain-dep-lvl">от ур. ${reqLvl}</span>` : ''}
      </div>`;
            })
            .join('');

        let _chainHide = null;
        function showTip() {
          clearTimeout(_chainHide);
          const r = chainSvg.getBoundingClientRect();
          tip.style.display = 'block';
          requestAnimationFrame(() => {
            const tw = tip.offsetWidth,
              th = tip.offsetHeight;
            const vw = window.innerWidth,
              vh = window.innerHeight;
            let tx = r.left - tw - 8;
            if (tx < 4) tx = r.right + 8;
            let ty = r.top - th / 2 + 7;
            if (ty < 4) ty = 4;
            if (ty + th > vh - 4) ty = vh - th - 4;
            tip.style.left = tx + 'px';
            tip.style.top = ty + 'px';

            // draw L-line from chain icon centre → tip header
            const icX = r.left + r.width / 2;
            const icY = r.top + r.height / 2;
            const tipR = tip.getBoundingClientRect();
            const goRight = tx > icX;
            const toX = goRight ? tipR.left : tipR.right;
            const toY = tipR.top + 18;
            const cornerY = toY;
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
          });
        }
        function hideTipDelayed() {
          _chainHide = setTimeout(() => {
            tip.style.display = 'none';
            ttArrowSvg.style.display = 'none';
            ttArrowSvg.innerHTML = '';
          }, 150);
        }
        chainSvg.addEventListener('mouseenter', showTip);
        chainSvg.addEventListener('mouseleave', hideTipDelayed);
        tip.addEventListener('mouseenter', () => clearTimeout(_chainHide));
        tip.addEventListener('mouseleave', () => {
          tip.style.display = 'none';
          ttArrowSvg.style.display = 'none';
          ttArrowSvg.innerHTML = '';
        });

        // click chain icon or dep item → scroll to & highlight target perk
        function focusPerk(rid) {
          tip.style.display = 'none';
          const allPerks = document.querySelectorAll('.perk');
          let target = null;
          for (const pe of allPerks) {
            if (pe.dataset.perkId === rid) {
              target = pe;
              break;
            }
          }
          if (!target) return;
          // scroll first, then highlight after scroll settles
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            // create full-screen focus overlay with fade-in
            let fo = document.getElementById('focus-overlay');
            if (!fo) {
              fo = document.createElement('div');
              fo.id = 'focus-overlay';
              fo.style.cssText =
                'position:fixed;inset:0;background:rgba(0,0,0,0);z-index:50;pointer-events:auto;transition:background .35s ease;';
              document.body.appendChild(fo);
            }
            // fade in
            requestAnimationFrame(() => {
              fo.style.background = `rgba(0,0,0,${FOCUS_DIM})`;
            });
            // lift target above overlay
            target.style.position = 'relative';
            target.style.zIndex = '51';
            // get chapter colour from perk icon class
            const _ic1 = target.querySelector('.perk-icon');
            const _cm1 = {
              'ic-o': '#e09040',
              'ic-r': '#cc3838',
              'ic-b': '#3e80d0',
              'ic-g': '#28a860',
              'ic-p': '#7840c8',
              'ic-y': '#b89030',
            };
            const _hex1 =
              Object.entries(_cm1).find(
                ([k]) => _ic1 && _ic1.classList.contains(k),
              )?.[1] || '#e09040';
            const _hex1a = _hex1 + '80';
            target.style.transition = 'box-shadow .35s ease';
            target.style.boxShadow = `0 0 0 2px ${_hex1}, 0 0 30px ${_hex1a}`;

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
        }

        // click on dep row (square or name) → focus perk
        tip.addEventListener('click', (e) => {
          const dep = e.target.closest('.perk-chain-dep');
          if (dep) focusPerk(dep.dataset.rid);
        });

        // insert chain icon into name row
        const nameRow = pEl.querySelector('.perk-name-row');
        nameRow.appendChild(chainSvg);
        document.body.appendChild(tip); // attach to body so hover works
      }

      // hover on icon square triggers tooltip
      const lvlDesc = (D.skillLevelDescriptions || {})[p.id];
      if (lvlDesc) {
        const icon = pEl.querySelector('.perk-icon');
        icon.style.cursor = 'pointer';
        icon.addEventListener('mouseenter', () =>
          icon.classList.add('glowing'),
        );
        icon.addEventListener('mouseleave', () => {
          if (!isCurrentBtn(icon)) icon.classList.remove('glowing');
        });
        icon.addEventListener('click', () =>
          showTooltip(p.name, lvlDesc, icon),
        );
      }
      pw.appendChild(pEl);
    });

    chDiv.appendChild(hdr);
    chDiv.appendChild(pw);
    contentEl.appendChild(chDiv);
    chRefs.push({ chDiv, hdr, pw, c });
  });

  col.appendChild(connEl);
  col.appendChild(contentEl);
  colsRow.appendChild(col);
  colRefs.push({ connEl, connSvg, contentEl, chRefs, spineSvg });
});

// ── SIDEBAR: ranks with dynamic level ranges ──
function makeBadge(badgeStr) {
  // badgeStr uses emoji squares — map to css sq classes
  const out = [];
  const lines = badgeStr.split('\n');
  for (const line of lines) {
    const chars = [...line]; // handle emoji properly
    const row = chars
      .map((ch) => {
        if (ch === '◽' || ch === '⬜' || ch === '◻')
          return `<span class="sq sq-w"></span>`;
        if (ch === '🟨') return `<span class="sq sq-y"></span>`;
        if (ch === '🟥') return `<span class="sq sq-r"></span>`;
        if (ch === '🟦') return `<span class="sq sq-b"></span>`;
        if (ch === '⬛' || ch === '◼') return `<span class="sq sq-k"></span>`;
        return '';
      })
      .join('');
    if (row) out.push(`<div class="badge-row">${row}</div>`);
  }
  return `<div class="badge">${out.join('')}</div>`;
}

const sb = document.getElementById('sidebar');
// ── RANKS TABLE COLUMNS ──
// Order and visibility of columns. Remove any entry to hide that column.
// Available: '#' | 'RANGE' | 'NAME' | 'LOGO'
// range_columns from config takes priority over RANKS_TABLE
const RANKS_TABLE =
  Array.isArray(D.range_columns) && D.range_columns.length
    ? D.range_columns.map((s) => s.toUpperCase())
    : ['#', 'RANGE', 'NAME', 'LOGO'];

const _rankColLabel = {
  '#': '#',
  RANGE: 'Уровень',
  NAME: 'Ранг',
  LOGO: 'Знак',
};
const ranksHtml = D.ranks
  .map((r, i) => {
    const minLvl = i * lvlPerRank;
    const maxLvl =
      i === D.ranks.length - 1 ? maxLevel : (i + 1) * lvlPerRank - 1;
    const cells = RANKS_TABLE.map((col) => {
      if (col === '#')
        return `<td class="r-lvl" style="color:#454a60">${i + 1}</td>`;
      if (col === 'RANGE') return `<td class="r-lvl">${minLvl}–${maxLvl}</td>`;
      if (col === 'NAME') return `<td class="r-name">${r.name}</td>`;
      if (col === 'LOGO') return `<td>${makeBadge(r.badge)}</td>`;
      return '';
    }).join('');
    return `<tr>${cells}</tr>`;
  })
  .join('');
const _rankHeaders = RANKS_TABLE.map(
  (col) => `<th>${_rankColLabel[col] || col}</th>`,
).join('');
sb.innerHTML = `
  <div class="sb-hdr"><span style="display:inline-block;width:9px;height:9px;background:#e09040;border-radius:1px;margin-right:7px;vertical-align:middle"></span>Ранги</div>
  <div class="rtable-wrap"><table class="rtable">
    <thead><tr>${_rankHeaders}</tr></thead>
    <tbody>${ranksHtml}</tbody>
  </table></div>`;

// ── BOTTOM BAR vulnerabilities — from D.vulns if present ──
const vulns = D.vulns || [];
document.getElementById('bottom-bar').innerHTML = vulns.length
  ? `<div class="bb-hdr">⚜ Ограниченность Тени</div>
 <div class="bb-items">${vulns
   .map(
     (v) => `<div class="bb-item">
   <div class="bb-item-name">${v.name}</div>
   <div class="bb-item-desc">${renderMD(v.desc || '')}</div>
 </div>`,
   )
   .join('')}</div>`
  : '';
