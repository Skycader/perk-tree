// Large centered "expanded" view for a snippet's <iframe> — mirrors
// video-lightbox.js exactly (same structure/behavior), just for an iframe
// instead of a <video>. NOT the OS fullscreen API — a bigger in-page window
// with a backdrop, opened via the expand button on a `fullScreen: true`
// snippet entry (see tooltip.js).
let backdrop, iframe, closeBtn;

function ensureBuilt() {
  if (backdrop) return;
  backdrop = document.createElement('div');
  backdrop.id = 'snippet-lightbox-backdrop';

  iframe = document.createElement('iframe');
  iframe.id = 'snippet-lightbox-iframe';

  closeBtn = document.createElement('button');
  closeBtn.id = 'snippet-lightbox-close';
  closeBtn.title = 'Закрыть';
  closeBtn.innerHTML = '✕';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSnippetLightbox();
  });

  backdrop.appendChild(iframe);
  backdrop.appendChild(closeBtn);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeSnippetLightbox();
  });
  document.body.appendChild(backdrop);
}

export function openSnippetLightbox(src) {
  ensureBuilt();
  iframe.src = src;
  // body scroll is already locked by the tooltip this was opened from —
  // the lightbox doesn't own that lock, so it doesn't touch it either.
  backdrop.classList.add('visible');
  // capture phase: runs before the tooltip's own bubble-phase Escape
  // handler, and stopPropagation here keeps it from also firing —
  // one Escape press closes just the lightbox, not the tooltip behind it.
  window.addEventListener('keydown', onKeydown, true);
}

export function closeSnippetLightbox() {
  if (!backdrop || !backdrop.classList.contains('visible')) return;
  backdrop.classList.remove('visible');
  iframe.src = '';
  window.removeEventListener('keydown', onKeydown, true);
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    closeSnippetLightbox();
  }
}
