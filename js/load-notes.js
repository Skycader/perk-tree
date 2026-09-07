// ── NOTES LOADER ──
// Mirrors load-config.js's ?config=<name> resolution, but for the lore
// notes data: if configs/<name>/<name>.notes.js exists, use it. Otherwise:
//   - no config param at all (or config=default) → configs/default/default.notes.js
//   - a named config with no notes file of its own → [] (NOT the default
//     stand's notes — default.notes.js is lore for THAT stand specifically,
//     e.g. "Властитель"; silently showing it under an unrelated config like
//     vampire would be actively wrong content, not a harmless fallback).
const params = new URLSearchParams(location.search);
const raw = params.get('config');
const name = raw && /^[a-zA-Z0-9_-]+$/.test(raw) ? raw : null;

let mod;
if (name && name !== 'default') {
  try {
    mod = await import(`../configs/${name}/${name}.notes.js`);
  } catch (e) {
    mod = { notes: [] };
  }
} else {
  mod = await import('../configs/default/default.notes.js');
}
export const notes = mod.notes;
