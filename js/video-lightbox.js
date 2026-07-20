// Large centered "expanded" video view — NOT the OS fullscreen API, just a
// bigger in-page window with a backdrop. True fullscreen is handled by the
// video element's own native controls (see makeMediaEl's `controls:true` path).
let backdrop, video, closeBtn, _onClose;

function ensureBuilt() {
  if (backdrop) return;
  backdrop = document.createElement('div');
  backdrop.id = 'video-lightbox-backdrop';

  video = document.createElement('video');
  video.id = 'video-lightbox-video';
  video.controls = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('controlsList', 'nodownload noremoteplayback');

  closeBtn = document.createElement('button');
  closeBtn.id = 'video-lightbox-close';
  closeBtn.title = 'Закрыть';
  closeBtn.innerHTML = '✕';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeVideoLightbox();
  });

  backdrop.appendChild(video);
  backdrop.appendChild(closeBtn);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeVideoLightbox();
  });
  document.body.appendChild(backdrop);
}

// Opens the lightbox playing `src`, continuing from `startTime` (seconds)
// and matching the small video's current mute state. `onClose` (if given)
// fires once, right before the lightbox actually hides — used to resume
// the small in-tooltip video that was paused while expanded.
export function openVideoLightbox(
  src,
  { startTime = 0, muted = true, onClose = null } = {},
) {
  ensureBuilt();
  _onClose = onClose;
  video.src = src;
  video.muted = muted;
  video.currentTime = startTime;
  // body scroll is already locked by the tooltip this was opened from —
  // the lightbox doesn't own that lock, so it doesn't touch it either.
  backdrop.classList.add('visible');
  video.play().catch(() => {});
  // capture phase: runs before the tooltip's own bubble-phase Escape
  // handler, and stopPropagation here keeps it from also firing —
  // one Escape press closes just the lightbox, not the tooltip behind it.
  window.addEventListener('keydown', onKeydown, true);
}

export function closeVideoLightbox() {
  if (!backdrop || !backdrop.classList.contains('visible')) return;
  backdrop.classList.remove('visible');
  video.pause();
  video.removeAttribute('src');
  video.load();
  window.removeEventListener('keydown', onKeydown, true);
  if (_onClose) {
    _onClose();
    _onClose = null;
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    closeVideoLightbox();
  }
}
