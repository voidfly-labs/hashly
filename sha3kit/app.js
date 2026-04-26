'use strict';

/* exported APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher */

// -------------------------------------------------------------------------
// App configuration — loaded before shared.js; shared modules read from here.
// -------------------------------------------------------------------------
const APP_CONFIG = {
  appName: 'sha3kit',
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replaceAll('-', ''),
  defaultDisabledAlgos: [],
};

// -------------------------------------------------------------------------
// Algorithm registry — single source of truth, ordered least to most complex.
// `bits` doubles as the bitness param for hash-wasm's sha3() / createSHA3().
// -------------------------------------------------------------------------
const ALGORITHMS = [
  { id: 'SHA3-224', bits: 224, hexLen: 56 },
  { id: 'SHA3-256', bits: 256, hexLen: 64 },
  { id: 'SHA3-384', bits: 384, hexLen: 96 },
  { id: 'SHA3-512', bits: 512, hexLen: 128 },
];

// -------------------------------------------------------------------------
// Hashing utilities — backed by hash-wasm by Daninet (WASM-accelerated, via jsDelivr).
// The library exposes a UMD global `hashwasm` with:
//   hashwasm.sha3(data, bits)            — one-shot; data is string | Uint8Array
//   hashwasm.createSHA3(bits)            — returns a reusable IHasher instance
//   hasher.init()                        — reset the hasher for a new message
//   hasher.update(chunk)                 — feed a Uint8Array chunk
//   hasher.digest('hex')                 — finalise and return a hex string
// All methods return Promises. One IHasher per algorithm is created once and
// reused across calls via init() to avoid repeated WASM instantiation overhead.
const DEFAULT_ALGO = 'SHA3-256';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

// -------------------------------------------------------------------------
const Hasher = (() => {
  // Lazily initialised pool: Map<bits, IHasher>
  // Each entry is a Promise<IHasher> that resolves once the WASM module for
  // that bitness has loaded. Subsequent calls reuse the same instance.
  const _pool = new Map();

  /** Return (and cache) a Promise<IHasher> for the given SHA-3 bitness. */
  function _getHasher(bits) {
    if (!_pool.has(bits)) {
      if (!window.hashwasm) throw new Error('hash-wasm global not available. Ensure the bundle has loaded.');
      _pool.set(bits, window.hashwasm.createSHA3(bits));
    }
    return _pool.get(bits);
  }

  return {
    /** Hash text with all registered algorithms in parallel.
     *  @param {string} inputFmt  'utf-8' | 'hex' | 'base64' | 'binary'
     *  @returns {Promise<Map<string, string>>} Map<algoId, hex> */
    async fromTextAll(text, inputFmt = 'utf-8') {
      const data = Format.textToBytes(text, inputFmt);
      const results = await Promise.all(
        ALGORITHMS.map(async ({ id, bits }) => {
          if (!window.hashwasm) throw new Error('hash-wasm global not available. Ensure the bundle has loaded.');
          return [id, await window.hashwasm.sha3(data, bits)];
        }),
      );
      return new Map(results);
    },

    /** Hash a File with all registered algorithms, reading in 150 kB chunks
     *  so the browser can repaint between chunks and progress is granular.
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

      // Resolve (and warm up) all IHasher instances before starting I/O.
      const hashers = await Promise.all(
        algos.map(async ({ id, bits }) => ({
          id,
          instance: await _getHasher(bits),
        })),
      );

      // Reset each hasher for a fresh message.
      for (const { instance } of hashers) instance.init();

      // Yield to the render engine so the computing DOM state paints first.
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

      let offset = 0;
      let lastPaint = performance.now();
      while (offset < totalSize) {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const buffer = await slice.arrayBuffer();
        const chunk = new Uint8Array(buffer);

        for (const { instance } of hashers) instance.update(chunk);

        offset += buffer.byteLength;
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

    /** Generate a random hex string sized to match the real digest for a
     *  given algorithm. The result is visually indistinguishable from a
     *  real hash output.
     *    SHA3-224 → 28 bytes  ( 56 hex chars)
     *    SHA3-256 → 32 bytes  ( 64 hex chars)
     *    SHA3-384 → 48 bytes  ( 96 hex chars)
     *    SHA3-512 → 64 bytes  (128 hex chars) */
    generateRandom(algoId) {
      const byteLengths = {
        'SHA3-224': 28,
        'SHA3-256': 32,
        'SHA3-384': 48,
        'SHA3-512': 64,
      };
      const byteLength = byteLengths[algoId] ?? 32;
      const bytes = new Uint8Array(byteLength);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    },
  };
})();
