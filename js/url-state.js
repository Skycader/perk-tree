// ── URL STATE ──
// Per-view state that lives in the address bar instead of web storage, so a
// link (or an F5) reproduces the view: `?perk=<id>` — the open perk tooltip,
// `?zoom=<percent>` — UI zoom (js/zoom.js). Written with history.replaceState,
// not pushState: opening a perk or nudging the zoom shouldn't add Back steps.
// Other query params (`config`, `notes` — see load-config.js/load-notes.js)
// and the hash are left untouched.

export function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

// value null/undefined/'' removes the param.
export function setParam(name, value) {
  try {
    const url = new URL(location.href);
    if (value === null || value === undefined || value === '')
      url.searchParams.delete(name);
    else url.searchParams.set(name, String(value));
    if (url.href !== location.href) history.replaceState(history.state, '', url);
  } catch (e) {
    // replaceState can throw in a locked-down context (sandboxed iframe,
    // file://) — the URL is a nicety, never worth breaking the UI over.
  }
}
