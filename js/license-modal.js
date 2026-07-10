import { MODAL } from './constants.js';

export const licenseToolbar = document.getElementById('license-toolbar');
export const licenseOverlay = document.getElementById('license-overlay');
const licenseModal = document.getElementById('license-modal');
const licenseTabsEl = document.getElementById('license-tabs');
const licensePanesEl = document.getElementById('license-panes');
const licenseDownload = document.getElementById('license-download');

// build tabs + panes once, from MODAL
const _modalState = MODAL.map((entry, i) => ({
  ...entry,
  loaded: false,
  rawText: '',
}));

licenseTabsEl.innerHTML = _modalState
  .map(
    (m, i) =>
      `<button class="license-tab${i === 0 ? ' active' : ''}" data-idx="${i}">${m.title}</button>`,
  )
  .join('');

licensePanesEl.innerHTML = _modalState
  .map(
    (m, i) =>
      `<div class="license-pane${i === 0 ? ' active' : ''}" id="license-pane-${i}">Загрузка…</div>`,
  )
  .join('');

const licenseTabs = licenseTabsEl.querySelectorAll('.license-tab');

async function loadModalTab(idx) {
  const m = _modalState[idx];
  const pane = document.getElementById('license-pane-' + idx);
  if (m.loaded) return;
  try {
    const res = await fetch(m.src);
    if (!res.ok) throw new Error('not found');
    const text = await res.text();
    m.rawText = text;
    pane.innerHTML =
      typeof marked !== 'undefined'
        ? marked.parse(text)
        : text.replace(/\n/g, '<br>');
    m.loaded = true;
  } catch (e) {
    pane.textContent = `Не удалось загрузить файл ${m.src}.\nУбедитесь, что он лежит рядом с этой страницей в той же папке/репозитории.`;
  }
}

function switchModalTab(idx) {
  licenseTabs.forEach((t, i) => t.classList.toggle('active', i === idx));
  _modalState.forEach((m, i) => {
    document
      .getElementById('license-pane-' + i)
      .classList.toggle('active', i === idx);
  });
  const m = _modalState[idx];
  licenseDownload.href = m.loaded
    ? URL.createObjectURL(new Blob([m.rawText], { type: 'text/plain' }))
    : '#';
  licenseDownload.download = m.src;
  loadModalTab(idx);
}

licenseTabs.forEach((tab, i) => {
  tab.addEventListener('click', () => switchModalTab(i));
});

export function showLicense() {
  licenseModal.classList.add('visible');
  licenseOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  switchModalTab(0); // always open on the first tab
}
export function hideLicense() {
  licenseModal.classList.remove('visible');
  licenseOverlay.classList.remove('active');
  document.body.style.overflow = '';
}
