// ── CONFIG LOADER ──
// Which STAND_DATA loads is picked via ?configName=<name> in the URL,
// mapping to ../<name>.config.js — e.g. ?configName=blank loads
// blank.config.js. No param (or an unrecognized name) falls back to the
// original config.js, untouched — this file is the ONLY thing that knows
// about configName; config.js itself stays a plain data file, imported
// nowhere else.
//
// Every consumer (tree.js, tooltip.js, markdown.js, spectre.js,
// export-png.js) imports STAND_DATA from THIS file instead of directly
// from '../config.js'. Uses top-level await (native ES modules support it,
// no bundler needed, same as the rest of this app) — a module that imports
// this one simply waits for the dynamic import below to resolve before its
// own top-level code runs.
const params = new URLSearchParams(location.search);
const raw = params.get('configName');
const name = raw && /^[a-zA-Z0-9_-]+$/.test(raw) ? raw : null;

let mod;
if (name) {
  try {
    mod = await import(`../${name}.config.js`);
  } catch (e) {
    console.warn(
      `[Древо] Конфиг "${name}.config.js" не найден — загружен config.js по умолчанию`,
      e,
    );
    mod = await import('../config.js');
  }
} else {
  mod = await import('../config.js');
}
export const STAND_DATA = mod.STAND_DATA;
