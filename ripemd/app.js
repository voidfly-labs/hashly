'use strict';

/* exported APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher */

// -------------------------------------------------------------------------
// App configuration — loaded before shared.js; shared modules read from here.
// -------------------------------------------------------------------------
const APP_CONFIG = {
  appName: 'ripemd',
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replaceAll('-', ''),
  defaultDisabledAlgos: [],
};

// Algorithm registry — single source of truth, ordered least to most complex.
// `cryptoApiId` is the hasher name on the global `CryptoApi` object.
// -------------------------------------------------------------------------
const ALGORITHMS = [
  { id: 'RIPEMD-128', cryptoApiId: 'ripemd128', bits: 128, hexLen: 32 },
  { id: 'RIPEMD-160', cryptoApiId: 'ripemd160', bits: 160, hexLen: 40 },
  { id: 'RIPEMD-256', cryptoApiId: 'ripemd256', bits: 256, hexLen: 64 },
  { id: 'RIPEMD-320', cryptoApiId: 'ripemd320', bits: 320, hexLen: 80 },
];

// -------------------------------------------------------------------------
// Hashing utilities — backed by crypto-api by nf404 (pure JS, via GitHub Pages CDN).
// The library is string-based: text is encoded via CryptoApi.encoder.fromUtf(),
// and binary data (files) via CryptoApi.encoder.fromArrayBuffer().
// All methods return Promise<string> (raw lowercase hex) to maintain the same
// async interface as the previous hash-wasm implementation.
const DEFAULT_ALGO = 'RIPEMD-160';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

// -------------------------------------------------------------------------
const Hasher = {
  /** Hash an encoded string with a single algorithm. Returns raw hex. */
  _call(cryptoApiId, encodedData) {
    if (!window.CryptoApi)
      throw new Error(`crypto-api global 'CryptoApi' not available. Ensure the bundle has loaded.`);
    const hasher = CryptoApi.getHasher(cryptoApiId);
    hasher.update(encodedData);
    return CryptoApi.encoder.toHex(hasher.finalize());
  },

  /** Hash text with all registered algorithms in parallel.
   *  @param {string} inputFmt  'utf-8' | 'hex' | 'base64' | 'binary'
   *  Returns Map<algoId, hex>. */
  async fromTextAll(text, inputFmt = 'utf-8') {
    // For non-UTF-8 modes, decode the encoded input to raw bytes first.
    // CryptoApi expects a Uint8Array; Format.textToBytes handles all modes.
    const encoded = Format.textToBytes(text, inputFmt);
    const results = await Promise.all(
      ALGORITHMS.map(async ({ id, cryptoApiId }) => [id, this._call(cryptoApiId, encoded)]),
    );
    return new Map(results);
  },

  /** Hash a File with all registered algorithms, reading in 150 kB chunks
   *  so the browser can repaint between chunks and progress is granular.
   *
   *  crypto-api supports multiple sequential `.update()` calls before
   *  `.finalize()` — each chunk is encoded from its raw bytes and fed in.
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

    if (!window.CryptoApi) throw new Error(`crypto-api global 'CryptoApi' not available.`);

    // Initialise one hasher instance per algorithm.
    const hashers = algos.map(({ id, cryptoApiId }) => ({
      id,
      instance: CryptoApi.getHasher(cryptoApiId),
    }));

    // Yield to the render engine so the computing DOM state paints first.
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

    let offset = 0;
    let lastPaint = performance.now();
    while (offset < totalSize) {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      // crypto-api encodes from an ArrayBuffer directly.
      const encoded = CryptoApi.encoder.fromArrayBuffer(buffer);

      for (const { instance } of hashers) instance.update(encoded);

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

    return new Map(hashers.map(({ id, instance }) => [id, CryptoApi.encoder.toHex(instance.finalize())]));
  },

  /** Generate a random hex string sized to match the real digest for a
   *  given algorithm. The result is visually indistinguishable from a
   *  real hash output.
   *    RIPEMD-128 → 16 bytes  ( 32 hex chars)
   *    RIPEMD-160 → 20 bytes  ( 40 hex chars)
   *    RIPEMD-256 → 32 bytes  ( 64 hex chars)
   *    RIPEMD-320 → 40 bytes  ( 80 hex chars) */
  generateRandom(algoId) {
    const byteLengths = {
      'RIPEMD-128': 16,
      'RIPEMD-160': 20,
      'RIPEMD-256': 32,
      'RIPEMD-320': 40,
    };
    const byteLength = byteLengths[algoId] ?? 20;
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  },
};

// -------------------------------------------------------------------------
