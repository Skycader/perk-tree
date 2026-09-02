import { notes } from './load-notes.js';
import { renderMD, renderLevelMD } from './markdown.js';
import { NOTES } from './constants.js';

const STORAGE_KEY = 'showNotesOnStartup';
const TIMER_SECONDS = 16;

const popup = document.getElementById('notes-popup');
const titleEl = document.getElementById('notes-title');
const contentEl = document.getElementById('notes-content');
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
  // author is just the last line of the content area (see .note-author-line
  // in notes.css) — not a separate footer element.
  const authorLine = note.author
    ? `<div class="note-author-line">${renderLevelMD(note.author)}</div>`
    : '';
  contentEl.innerHTML = renderMD(note.content || '') + authorLine;
}

// Sets `top` so the box's bottom edge sits NOTES.bottomGap above the
// viewport bottom, sized to THIS note's real height — recomputed on every
// open/switch (see showNotesPopup, settleNotesPopup, and the prev/next
// handlers below), so the box always hugs the bottom edge by the same
// small gap. Trade-off, chosen deliberately: the header moves up/down when
// switching between notes of different lengths, in exchange for never
// leaving a gap between the box and the bottom of the screen.
//
// Height is still capped via max-height so a pathologically long note
// can't push the box above NOTES.topGap from the top of the screen —
// beyond that it scrolls instead (.notes-content, see notes.css).
function applyRestPosition() {
  popup.style.maxHeight = ''; // clear any previous cap so the measurement below reflects this note's real, uncapped size
  const naturalHeight = popup.offsetHeight;
  const available = window.innerHeight - NOTES.bottomGap - NOTES.topGap;
  if (naturalHeight > available) {
    popup.style.top = NOTES.topGap + 'px';
    popup.style.maxHeight = available + 'px';
  } else {
    // No cap needed — leave max-height unset. offsetHeight rounds to a
    // whole pixel, but line-height (1.6 × 11px = 17.6px/line) doesn't; a
    // max-height pinned to that rounded integer can land a fraction of a
    // pixel below the flex children's real fractional height, forcing
    // .notes-content to shrink by that sliver and show a scrollbar even on
    // a two-line note. Leaving max-height unset removes that constraint
    // entirely when we don't actually need one.
    popup.style.top = window.innerHeight - NOTES.bottomGap - naturalHeight + 'px';
  }
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
  applyRestPosition();
  restartTimer();
});
nextBtn.addEventListener('click', () => {
  currentIdx = (currentIdx + 1) % notes.length;
  renderNote(currentIdx);
  applyRestPosition();
  restartTimer();
});

startupCheckbox.checked = getShowOnStartup();
startupCheckbox.addEventListener('change', () => {
  localStorage.setItem(STORAGE_KEY, String(startupCheckbox.checked));
});

// Called once the tree has finished its initial render — see main.js.
// The inline script in index.html may already have shown this exact popup
// while #page-loader was still up (same box, already parked at its
// bottom-anchored resting spot for the note it picked — see notes.css and
// the early script). If so, just adopt it: sync currentIdx and re-run
// applyRestPosition() (covers a viewport resize while loading, and is a
// harmless no-op otherwise since the content hasn't changed).
export function settleNotesPopup() {
  if (window.__earlyNoteShown) {
    currentIdx = window.__earlyNoteIdx || 0;
    applyRestPosition(); // re-affirm in case the viewport was resized while loading
    restartTimer();
  } else if (getShowOnStartup()) {
    // fallback — e.g. the early script errored or notes.js failed to load
    showNotesPopup();
  }
}
