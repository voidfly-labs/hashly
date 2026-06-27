// Smallest valid module (magic + version). Compiling it, rather than just
// checking `typeof WebAssembly`, also catches CSP blocks and Lockdown Mode,
// where the global exists but compilation throws.
const _EMPTY_MODULE = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

export function hasWasmSupport() {
  try {
    return typeof WebAssembly === 'object' && new WebAssembly.Module(_EMPTY_MODULE) instanceof WebAssembly.Module;
  } catch {
    return false;
  }
}
