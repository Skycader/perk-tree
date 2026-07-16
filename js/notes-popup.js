import { notes } from '../notes.js';
import { renderMD } from './markdown.js';
import { NOTES } from './constants.js';

const STORAGE_KEY = 'showNotesOnStartup';
const TIMER_SECONDS = 16;

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

let currentIdx = 0;
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

// shown once the tree has finished its initial render — see main.js
export function maybeShowNotesOnStartup() {
  if (getShowOnStartup()) showNotesPopup();
}
