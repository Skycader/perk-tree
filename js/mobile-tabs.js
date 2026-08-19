// ── MOBILE TAB LAYOUT ──
// Below ~768px (css/mobile.css), the 3 perk columns + ranks sidebar +
// dangers block collapse into one-at-a-time tabs instead of showing all
// side by side. This file only tracks which tab is active and reflects it
// as document.body.dataset.mobileTab — the CSS does all the actual
// show/hide (see css/mobile.css's body[data-mobile-tab=...] rules).
const tabsEl = document.getElementById('mobile-tabs');

function setTab(tab) {
  document.body.dataset.mobileTab = tab;
  tabsEl?.querySelectorAll('.mobile-tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  // the newly-revealed column was `display:none` (zero-size) the last time
  // its connector lines were computed (see connectors.js's drawColumn,
  // called from main.js's redrawAll) — those need real geometry now that
  // it's visible, same as after a resize or zoom change. main.js owns
  // redrawAll and listens for this event (same pattern as ui-zoom-changed).
  window.dispatchEvent(new CustomEvent('mobile-tab-changed'));
}

tabsEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('.mobile-tab-btn');
  if (!btn) return;
  setTab(btn.dataset.tab);
});

setTab('1');
