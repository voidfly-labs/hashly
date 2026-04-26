'use strict';

/* exported APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher */

// -------------------------------------------------------------------------
// App configuration — loaded before shared.js; shared modules read from here.
// -------------------------------------------------------------------------
const APP_CONFIG = {
  appName: 'shafile',
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replaceAll('-', ''),
  defaultDisabledAlgos: [],
};

// Algorithm registry — single source of truth, ordered least to most complex.
// `wasmFn` is the hash-wasm function name on the `hashwasm` global.
// -------------------------------------------------------------------------
const ALGORITHMS = [
  { id: 'SHA-1', wasmFn: 'sha1', bits: 160, hexLen: 40 },
  { id: 'SHA-224', wasmFn: 'sha224', bits: 224, hexLen: 56 },
  { id: 'SHA-256', wasmFn: 'sha256', bits: 256, hexLen: 64 },
  { id: 'SHA-384', wasmFn: 'sha384', bits: 384, hexLen: 96 },
  { id: 'SHA-512', wasmFn: 'sha512', bits: 512, hexLen: 128 },
];

// -------------------------------------------------------------------------
// Hashing utilities — backed by hash-wasm (WebAssembly, via CDN UMD bundles).
// hash-wasm functions accept a Uint8Array and return a hex string directly.
// All methods return Promise<string> (raw lowercase hex).
const DEFAULT_ALGO = 'SHA-256';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

// -------------------------------------------------------------------------
const Hasher = {
  /** Call the hash-wasm function for a given algorithm. Returns raw hex. */
  _call(wasmFn, data) {
    // Each UMD bundle registers itself on the `hashwasm` global object.
    const fn = window.hashwasm?.[wasmFn];
    if (!fn) throw new Error(`hash-wasm: function '${wasmFn}' not available. Ensure the bundle has loaded.`);
    return fn(data); // returns Promise<string> (hex)
  },

  /** Hash text with all registered algorithms in parallel.
   *  @param {string} text      Raw user input string
   *  @param {string} inputFmt  'utf-8' | 'hex' | 'base64' | 'binary'
   *  Returns Map<algoId, hex>. */
  async fromTextAll(text, inputFmt = 'utf-8') {
    const data = Format.textToBytes(text, inputFmt);
    const results = await Promise.all(ALGORITHMS.map(async ({ id, wasmFn }) => [id, await this._call(wasmFn, data)]));
    return new Map(results);
  },

  /** Hash a File with all registered algorithms, reading in 150 kB chunks
   *  so the browser can repaint between chunks and progress is granular.
   *
   *  hash-wasm v4 exposes `createXxx()` factory functions that return a
   *  streaming hasher with `.update(Uint8Array)` and `.digest('hex')`.
   *  The function name is derived by capitalising the wasmFn string
   *  (e.g. 'sha256' → hashwasm.createSHA256).
   *
   *  The initial rAF+setTimeout double-yield guarantees the computing DOM
   *  state is painted before any CPU-bound work begins — critical on hosted
   *  environments where microtask continuations don't force a repaint.
   *
   *  @param {File}                  file
   *  @param {function(number):void} [onProgress]  called with ratio in [0,1]
   *  @returns {Promise<Map<string,string>>}        Map<algoId, hex>
   */
  async fromFileAll(file, onProgress, algos = ALGORITHMS) {
    const totalSize = file.size;
    // Adaptive chunk size: target ~100 progress updates regardless of file
    // size, while staying within a sensible memory footprint.
    //   floor: 150 KiB  — avoids tiny chunks on small files
    //   ceil:   32 MiB  — caps allocation on very large files (>3.2 GB)
    const CHUNK_SIZE = Math.min(32 * 1024 * 1024, Math.max(150 * 1024, Math.floor(totalSize / 100)));

    // Derive the createXxx function name from the wasmFn string.
    // hash-wasm v4 naming: 'sha256' → 'createSHA256', 'sha1' → 'createSHA1'.
    const createFnName = (wasmFn) =>
      'create' + wasmFn.replace(/^sha(\d+)$/, (_, n) => 'SHA' + n).replace(/^md(\d+)$/, (_, n) => 'MD' + n);

    // Initialise one streaming hasher instance per algorithm.
    const hashers = await Promise.all(
      algos.map(async ({ id, wasmFn }) => {
        const fn = window.hashwasm?.[createFnName(wasmFn)];
        if (!fn) throw new Error(`hash-wasm: '${createFnName(wasmFn)}' not available.`);
        return { id, instance: await fn() };
      }),
    );

    // Yield to the render engine so the computing DOM state paints first.
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

    let offset = 0;
    let lastPaint = performance.now();
    while (offset < totalSize) {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      const chunk = new Uint8Array(buffer);

      for (const { instance } of hashers) instance.update(chunk);

      offset += chunk.byteLength;
      onProgress?.(Math.min(offset / totalSize, 1));

      // Yield to the render engine so progress updates can paint, but
      // throttled to ~100 ms intervals (~10 fps) — yielding every chunk
      // on small chunk sizes wastes ~16 ms per rAF with no visible benefit.
      // Always skip the final chunk: no further UI update is needed.
      const now = performance.now();
      if (offset < totalSize && now - lastPaint >= 100) {
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
        lastPaint = performance.now();
      }
    }

    return new Map(hashers.map(({ id, instance }) => [id, instance.digest('hex')]));
  },

  generateRandom(algoId) {
    const hexLen = ALGORITHMS.find((a) => a.id === algoId)?.hexLen ?? 64;
    const bytes = new Uint8Array(hexLen / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  },
};

// -------------------------------------------------------------------------
