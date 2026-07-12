import { hasWasmSupport } from '~core/utils/wasm.js';

/** Shows a blocking notice when the app needs WebAssembly and the browser
 *  can't provide it. Returns true when the app can run. */
export function checkWasmSupport({ requiresWasm }) {
  if (!requiresWasm || hasWasmSupport()) return true;

  const banner = document.getElementById('wasmWarningTemplate').content.cloneNode(true);
  const main = document.querySelector('main');
  if (main) main.prepend(banner);
  else document.body.prepend(banner);
  return false;
}
