'use strict';

    // -------------------------------------------------------------------------
    // App configuration — loaded before shared.js; shared modules read from here.
    // -------------------------------------------------------------------------
    const APP_CONFIG = {
      appName:              'md5kit',
      fileNoun:             'hash',
      slugify:              algo => algo.toLowerCase(),
      defaultDisabledAlgos: ["MD2"],
    };

    // Algorithm registry — single source of truth, ordered from oldest to newest.
    // `type`          selects the hashing backend for one-shot (text) hashing.
    // `wasmCreateFn`  names the hash-wasm streaming constructor on the global
    //                 `hashwasm` object — used by fromFileAll for progress support.
    // -------------------------------------------------------------------------
    const ALGORITHMS = [
      { id: 'MD2', type: 'md2',  bits: 128, hexLen: 32 },
      { id: 'MD4', type: 'wasm', wasmFn: 'md4', wasmCreateFn: 'createMD4', bits: 128, hexLen: 32 },
      { id: 'MD5', type: 'wasm', wasmFn: 'md5', wasmCreateFn: 'createMD5', bits: 128, hexLen: 32 },
    ];

    // -------------------------------------------------------------------------
    // Hashing utilities — RFC 1319 (MD2 inline), hash-wasm by Daninet (MD4/MD5, WASM-accelerated, via jsDelivr).
    //
    // Text hashing (one-shot):
    //   MD2 — window.md2(Uint8Array|string) → hex         (custom RFC 1319 inline)
    //   MD4 — window.hashwasm.md4(Uint8Array) → Promise<hex>  (hash-wasm WASM)
    //   MD5 — window.hashwasm.md5(Uint8Array) → Promise<hex>  (hash-wasm WASM)
    //
    // File hashing (streaming, with progress):
    //   MD2 — window.md2.create() → { update(Uint8Array), hex() }  (buffering shim)
    //   MD4 — window.hashwasm.createMD4() → IHasher  (hash-wasm streaming)
    //   MD5 — window.hashwasm.createMD5() → IHasher  (hash-wasm streaming)
    //
    // All streaming instances share the same .update(Uint8Array) / .hex() interface
    // so fromFileAll can drive them identically, mirroring Keccalc exactly.
    const DEFAULT_ALGO = 'MD5';
    const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

    // -------------------------------------------------------------------------
    const Hasher = {
      /** Hash a Uint8Array with a single algorithm. Returns Promise<hex>. */
      async _hashBytes(algo, data) {
        if (algo.type === 'wasm') {
          const fn = window.hashwasm?.[algo.wasmFn];
          if (!fn) throw new Error(`hash-wasm: '${algo.wasmFn}' not available.`);
          return fn(data);
        }
        if (algo.type === 'md2') {
          return window.md2(data);
        }
        throw new Error(`Unknown algo type: ${algo.type}`);
      },

      /** Hash text with all algorithms.
       *  @param {string} inputFmt  'utf-8' | 'hex' | 'base64' | 'binary'
       *  Returns Map<algoId, hex>. */
      async fromTextAll(text, inputFmt = 'utf-8') {
        const data    = Format.textToBytes(text, inputFmt);
        const results = await Promise.all(
          ALGORITHMS.map(async algo => [algo.id, await this._hashBytes(algo, data)])
        );
        return new Map(results);
      },

      /** Hash a File with all algorithms, reading in 150 kB chunks so the browser
       *  can repaint between chunks and progress is granular.
       *
       *  The initial rAF+setTimeout double-yield guarantees the computing DOM state
       *  is painted before any CPU-bound work begins — critical on hosted environments
       *  where microtask continuations don't force a repaint.
       *
       *  Streaming instance interface (uniform across all three backends):
       *    .update(Uint8Array) — feed a chunk; chainable
       *    .hex()              — finalise and return lowercase hex digest
       *
       *  @param {File}                  file
       *  @param {function(number):void} [onProgress]  called with ratio in [0, 1]
       *  @returns {Promise<Map<string,string>>}        Map<algoId, hex>
       */
      async fromFileAll(file, onProgress, algos = ALGORITHMS) {
        const totalSize  = file.size;
        // Adaptive chunk size: target ~100 progress updates regardless of file
        // size, while staying within a sensible memory footprint.
        //   floor: 150 KiB  — avoids tiny chunks on small files
        //   ceil:   32 MiB  — caps allocation on very large files (>3.2 GB)
        const CHUNK_SIZE = Math.min(
          32 * 1024 * 1024,
          Math.max(150 * 1024, Math.floor(totalSize / 100)),
        );

        // Instantiate one streaming hasher per algorithm.
        const hashers = await Promise.all(
          algos.map(async algo => {
            let instance;
            if (algo.type === 'md2') {
              // md2.create() returns a buffering shim with .update()/.hex()
              instance = window.md2.create();
            } else {
              // hash-wasm streaming: createMD4() / createMD5() → IHasher
              const createFn = window.hashwasm?.[algo.wasmCreateFn];
              if (!createFn) throw new Error(`hash-wasm: '${algo.wasmCreateFn}' not available.`);
              instance = await createFn();
              instance.init();
            }
            return { id: algo.id, instance };
          })
        );

        // Yield to the render engine before starting CPU work so the
        // "computing" DOM state is guaranteed to paint first.
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

        let offset = 0;
        let lastPaint = performance.now();
        while (offset < totalSize) {
          const slice  = file.slice(offset, offset + CHUNK_SIZE);
          const buffer = await slice.arrayBuffer();
          const chunk  = new Uint8Array(buffer);

          for (const { instance } of hashers) instance.update(chunk);

          offset += buffer.byteLength;
          onProgress?.(Math.min(offset / totalSize, 1));

          // Yield to the render engine so progress updates can paint, but
          // throttled to ~100 ms intervals (~10 fps) — yielding every chunk
          // on small chunk sizes wastes ~16 ms per rAF with no visible benefit.
          // Always skip the final chunk: no further UI update is needed.
          const now = performance.now();
          if (offset < totalSize && now - lastPaint >= 100) {
            await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
            lastPaint = performance.now();
          }
        }

        // Finalise: md2 instance uses .hex(); hash-wasm instances use .digest('hex').
        return new Map(
          hashers.map(({ id, instance }) => [
            id,
            typeof instance.hex === 'function' ? instance.hex() : instance.digest('hex'),
          ])
        );
      },

      /** Generate a random hex string sized to match the real digest for the
       *  given algorithm. All three variants produce 128-bit (16-byte) digests,
       *  displayed as 32 hex characters. */
      generateRandom(algoId) {
        const byteLengths = { 'MD2': 16, 'MD4': 16, 'MD5': 16 };
        const byteLength  = byteLengths[algoId] ?? 16;
        const bytes = new Uint8Array(byteLength);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      },
    };

    // -------------------------------------------------------------------------
