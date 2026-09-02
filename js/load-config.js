// ── CONFIG LOADER ──
// Which CONFIG loads is picked via ?configName=<name> in the URL, mapping to
// configs/<name>/<name>.config.js — e.g. ?configName=blank loads
// configs/blank/blank.config.js. No param (or an unrecognized name) falls
// back to configs/default/default.config.js — this file is the ONLY thing
// that knows about configName; each config file itself stays a plain data
// file, imported nowhere else.
//
// Every consumer (tree.js, tooltip.js, markdown.js, spectre.js,
// export-png.js) imports CONFIG from THIS file instead of directly from a
// configs/*/*.config.js path. Uses top-level await (native ES modules
// support it, no bundler needed, same as the rest of this app) — a module
// that imports this one simply waits for the dynamic import below to
// resolve before its own top-level code runs.
const params = new URLSearchParams(location.search);
const raw = params.get('configName');
const name = raw && /^[a-zA-Z0-9_-]+$/.test(raw) ? raw : null;

let mod;
if (name && name !== 'default') {
  try {
    mod = await import(`../configs/${name}/${name}.config.js`);
  } catch (e) {
    console.warn(
      `[Древо] Конфиг "${name}" не найден в configs/${name}/ — загружен default`,
      e,
    );
    mod = await import('../configs/default/default.config.js');
  }
} else {
  mod = await import('../configs/default/default.config.js');
}
export const CONFIG = mod.CONFIG;
