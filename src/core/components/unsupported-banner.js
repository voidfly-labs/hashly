import { hasWasmSupport } from '../utils/wasm.js';

/** Shows a blocking notice when the app needs WebAssembly and the browser
 *  can't provide it. Returns true when the app can run. */
export function checkWasmSupport({ requiresWasm }) {
  if (!requiresWasm || hasWasmSupport()) return true;

  const banner = document.createElement('div');
  banner.className = 'unsupported-banner';
  banner.setAttribute('role', 'alert');
  banner.textContent =
    'WebAssembly is blocked or unsupported in this browser (CSP, lockdown mode, old browser). ' +
    'Hashing is disabled.';
  const main = document.querySelector('main');
  if (main) main.prepend(banner);
  else document.body.prepend(banner);
  return false;
}
