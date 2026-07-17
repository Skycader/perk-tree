import { notes } from '../notes.js';
import { renderMD } from './markdown.js';
import { NOTES } from './constants.js';

const STORAGE_KEY = 'showNotesOnStartup';
const TIMER_SECONDS = 16;
const REST_BOTTOM_GAP = 24; // px clearance from the viewport bottom, at rest

const popup = document.getElementById('notes-popup');
const titleEl = document.getElementById('notes-title');
const contentEl = document.getElementById('notes-content');
const authorEl = document.getElementById('notes-author');
const closeBtn = document.getElementById('notes-close');
const prevBtn = document.getElementById('notes-prev');
const nextBtn = document.getElementById('notes-next');
const timerTrack = document.getElementById('notes-timer-track');
const timerFill = document.getElementById('notes-timer-fill');
const startupRow = document.getElementById('notes-startup-row');
const startupCheckbox = document.getElementById('notes-startup-checkbox');

if (!NOTES.timer) timerTrack.style.display = 'none';
if (!NOTES.check) startupRow.style.display = 'none';

// sync immediately (not just in settleNotesPopup) so prev/next work off the
// right baseline if clicked before the loading screen has settled
let currentIdx = window.__earlyNoteShown ? window.__earlyNoteIdx || 0 : 0;
let closeTimer = null;

function getShowOnStartup() {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === 'true';
}

function renderNote(idx) {
  const note = notes[idx];
  if (!note) return;
  titleEl.textContent = note.title || '';
  contentEl.innerHTML = renderMD(note.content || '');
  authorEl.textContent = note.author || '';
}

// Sets `top` so the box's bottom edge sits REST_BOTTOM_GAP above the
// viewport bottom, given its CURRENT height (padded by NOTES.extraHeight —
// see constants.js — so the box always has a bit of breathing room beyond
// what the note's content strictly needs). Only called when first resting
// (never on every note switch) — anchoring via `top` means content height
// changes afterwards grow/shrink the box downward, keeping the header
// fixed in place instead of dragging it up and down.
//
// min-height enforces that padded base height (.notes-content, flex: 1,
// stretches to fill it); max-height caps the box to exactly the space
// between the fixed top and the viewport bottom, so a later note switch
// can't push it past the fixed top and off the bottom of the screen —
// .notes-content (min-height: 0; overflow-y: auto — see notes.css) scrolls
// internally once content exceeds that budget instead.
function applyRestPosition() {
  const baseHeight = popup.offsetHeight + NOTES.extraHeight;
  const top = window.innerHeight - REST_BOTTOM_GAP - baseHeight;
  popup.style.top = top + 'px';
  popup.style.minHeight = baseHeight + 'px';
  popup.style.maxHeight = window.innerHeight - top - REST_BOTTOM_GAP + 'px';
}

function restartTimer() {
  clearTimeout(closeTimer);
  if (!NOTES.timer) return; // timer disabled — stays open until closed manually
  // restart the CSS shrink animation from full width — set the whole
  // shorthand in one assignment; setting animationDuration separately and
  // then clearing `animation` afterwards wipes the duration back out too,
  // since the shorthand reset touches every longhand it controls.
  timerFill.style.animation = 'none';
  void timerFill.offsetWidth; // force reflow
  timerFill.style.animation = `notes-timer-shrink ${TIMER_SECONDS}s linear forwards`;
  closeTimer = setTimeout(hideNotesPopup, TIMER_SECONDS * 1000);
}

export function showNotesPopup() {
  if (!notes.length) return;
  currentIdx = Math.floor(Math.random() * notes.length);
  renderNote(currentIdx);
  popup.classList.add('visible');
  applyRestPosition();
  restartTimer();
}

export function hideNotesPopup() {
  popup.classList.remove('visible');
  clearTimeout(closeTimer);
}

closeBtn.addEventListener('click', hideNotesPopup);
prevBtn.addEventListener('click', () => {
  currentIdx = (currentIdx - 1 + notes.length) % notes.length;
  renderNote(currentIdx);
  restartTimer();
});
nextBtn.addEventListener('click', () => {
  currentIdx = (currentIdx + 1) % notes.length;
  renderNote(currentIdx);
  restartTimer();
});

startupCheckbox.checked = getShowOnStartup();
startupCheckbox.addEventListener('change', () => {
  localStorage.setItem(STORAGE_KEY, String(startupCheckbox.checked));
});

// Called once the tree has finished its initial render — see main.js.
// The inline script in index.html may already have shown this exact popup
// while #page-loader was still up (same box, measured and parked just below
// the spinner via an inline `style.top` — see notes.css). If so, adopt it:
// sync currentIdx to whatever it picked, then animate it down into its
// resting position — the `transition` is added inline just for this one
// move, not left on permanently, so the box's very first appearance (in the
// early script) doesn't itself animate up from some default position.
export function settleNotesPopup() {
  if (window.__earlyNoteShown) {
    currentIdx = window.__earlyNoteIdx || 0;
    popup.classList.remove('notes-loading-pos');
    popup.style.transition = 'top 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
    void popup.offsetHeight; // force reflow so the transition is active before the change below
    applyRestPosition();
    restartTimer();
  } else if (getShowOnStartup()) {
    // fallback — e.g. the early script errored or notes.js failed to load
    showNotesPopup();
  }
}
