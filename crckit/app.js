'use strict';

    // -------------------------------------------------------------------------
    // App configuration — loaded before shared.js; shared modules read from here.
    // -------------------------------------------------------------------------
    const APP_CONFIG = {
      appName:              'crckit',
      fileNoun:             'checksum',
      slugify:              algo => algo.toLowerCase().replace(/[^a-z0-9]/g, ""),
      defaultDisabledAlgos: [],
    };

    // Algorithm registry — single source of truth, ordered by bit count (least to most complex),
    // then alphabetically within groups of the same bit count.
    // Exception: CRC-32C is pinned directly after CRC-32 as a special case,
    // reflecting its role as the de-facto modern successor to CRC-32.
    //
    // `jscrcFn` is the name of the corresponding global function from js-crc.
    // crc.min.js provides 'crc32' and 'crc16' directly on window.
    // models.min.js provides all other globals by converting the canonical
    // model name: replace [-/] with _ and lowercase (e.g. 'CRC-8/SMBUS' → 'crc_8_smbus').
    //
    //   CRC-8 variants     →  8 bit  ( 2 hex chars)
    //   CRC-16 variants    → 16 bit  ( 4 hex chars)
    //   CRC-24 variants    → 24 bit  ( 6 hex chars)
    //   CRC-32 variants    → 32 bit  ( 8 hex chars)
    //   CRC-64 variants    → 64 bit  (16 hex chars)
    //   CRC-82 (DARC)      → 82 bit  (21 hex chars — odd, normalised by Format)
    // -------------------------------------------------------------------------
    const ALGORITHMS = [
      // CRC-8 — ordered alphabetically within the group
      { id: 'CRC-8 (1-Wire)',   jscrcFn: 'crc_8_maxim_dow',  bits: 8,  hexLen: 2  },
      { id: 'CRC-8 (DVB-S2)',   jscrcFn: 'crc_8_dvb_s2',     bits: 8,  hexLen: 2  },
      { id: 'CRC-8 (SMBus)',    jscrcFn: 'crc_8_smbus',      bits: 8,  hexLen: 2  },
      // CRC-16 — ordered alphabetically within the group
      { id: 'CRC-16',           jscrcFn: 'crc16',             bits: 16, hexLen: 4  },
      { id: 'CRC-16 (CCITT)',   jscrcFn: 'crc_16_ibm_3740',  bits: 16, hexLen: 4  },
      { id: 'CRC-16 (DNP)',     jscrcFn: 'crc_16_dnp',        bits: 16, hexLen: 4  },
      { id: 'CRC-16 (Kermit)',  jscrcFn: 'crc_16_kermit',    bits: 16, hexLen: 4  },
      { id: 'CRC-16 (Modbus)',  jscrcFn: 'crc_16_modbus',    bits: 16, hexLen: 4  },
      { id: 'CRC-16 (USB)',     jscrcFn: 'crc_16_usb',        bits: 16, hexLen: 4  },
      { id: 'CRC-16 (XMODEM)', jscrcFn: 'crc_16_xmodem',    bits: 16, hexLen: 4  },
      // CRC-24 — ordered alphabetically within the group
      { id: 'CRC-24 (BLE)',     jscrcFn: 'crc_24_ble',        bits: 24, hexLen: 6  },
      { id: 'CRC-24 (Intlkn)', jscrcFn: 'crc_24_interlaken',  bits: 24, hexLen: 6  },
      { id: 'CRC-24 (OpenPGP)',jscrcFn: 'crc_24_openpgp',    bits: 24, hexLen: 6  },
      // CRC-32 — CRC-32C pinned directly after CRC-32; remainder alphabetical
      { id: 'CRC-32',           jscrcFn: 'crc32',             bits: 32, hexLen: 8  },
      { id: 'CRC-32C',          jscrcFn: 'crc_32c',           bits: 32, hexLen: 8  },
      { id: 'CRC-32 (BZIP2)',   jscrcFn: 'crc_32_bzip2',     bits: 32, hexLen: 8  },
      { id: 'CRC-32 (JamCRC)', jscrcFn: 'crc_32_jamcrc',    bits: 32, hexLen: 8  },
      { id: 'CRC-32 (MPEG-2)', jscrcFn: 'crc_32_mpeg_2',    bits: 32, hexLen: 8  },
      // CRC-64 — ordered alphabetically within the group
      { id: 'CRC-64 (ECMA)',   jscrcFn: 'crc_64_ecma_182', bits: 64, hexLen: 16 },
      { id: 'CRC-64 (NVMe)',   jscrcFn: 'crc_64_nvme', bits: 64, hexLen: 16 },
      { id: 'CRC-64 (Redis)',  jscrcFn: 'crc_64_redis', bits: 64, hexLen: 16 },
      { id: 'CRC-64 (XZ)',     jscrcFn: 'crc_64_xz', bits: 64, hexLen: 16 },
      // CRC-82
      { id: 'CRC-82 (DARC)',   jscrcFn: 'crc_82_darc', bits: 82, hexLen: 21 },
    ];

    // -------------------------------------------------------------------------
    // Checksum utilities — backed by js-crc by emn178 (pure JS, via jsDelivr).
    // The library exposes one global per variant via the UMD bundles loaded
    // in the <head>. All functions accept a string or Uint8Array and return a
    // hex string. The streaming API — fn.create() / .update(buf) / .hex() —
    // enables chunked file hashing with progress callbacks, matching the
    // Keccalc / js-sha3 pattern exactly.
    // All public methods return Map<algoId, hex> (raw lowercase hex strings).
    const DEFAULT_ALGO = 'CRC-32';
    const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

    // -------------------------------------------------------------------------
    const Hasher = {
      /** Compute all CRCs from text in the specified input encoding.
       *  Returns Map<algoId, hex>. */
      fromTextAll(text, inputFmt = 'utf-8', algos = ALGORITHMS) {
        const data = Format.textToBytes(text, inputFmt);
        return new Map(algos.map(({ id, jscrcFn, hexLen }) => {
          const fn = window[jscrcFn];
          if (!fn) throw new Error(`js-crc global '${jscrcFn}' not available. Ensure both bundles have loaded.`);
          return [id, fn(data).padStart(hexLen, '0')];
        }));
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
        const totalSize  = file.size;
        // Adaptive chunk size: target ~100 progress updates regardless of file
        // size, while staying within a sensible memory footprint.
        //   floor: 150 KiB  — avoids tiny chunks on small files
        //   ceil:   32 MiB  — caps allocation on very large files (>3.2 GB)
        const CHUNK_SIZE = Math.min(
          32 * 1024 * 1024,
          Math.max(150 * 1024, Math.floor(totalSize / 100)),
        );

        // Create one streaming instance per algorithm.
        const instances = algos.map(({ id, jscrcFn, hexLen }) => {
          const fn = window[jscrcFn];
          if (!fn) throw new Error(`js-crc global '${jscrcFn}' not available.`);
          return { id, hexLen, instance: fn.create() };
        });

        // Yield to the render engine before starting CPU work so the
        // "computing" DOM state is guaranteed to paint first.
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

        let offset = 0;
        let lastPaint = performance.now();
        while (offset < totalSize) {
          const slice  = file.slice(offset, offset + CHUNK_SIZE);
          const buffer = await slice.arrayBuffer();

          for (const { instance } of instances) instance.update(buffer);

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

        return new Map(instances.map(({ id, hexLen, instance }) => [
          id,
          instance.hex().padStart(hexLen, '0'),
        ]));
      },

      /** Generate a random hex string visually matching the real digest width.
       *    CRC-8 variants     →  2 hex chars
       *    CRC-16 variants    →  4 hex chars
       *    CRC-24 variants    →  6 hex chars  (BLE, Intlkn, OpenPGP)
       *    CRC-32 variants    →  8 hex chars  (CRC-32, BZIP2, JamCRC, MPEG-2, 32C)
       *    CRC-64 variants    → 16 hex chars
       *    CRC-82 (DARC)      → 21 hex chars */
      generateRandom(algoId) {
        const algo     = ALGORITHMS.find(a => a.id === algoId);
        const hexLen   = algo?.hexLen ?? 8;
        const byteLen  = Math.ceil(hexLen / 2);
        const bytes    = new Uint8Array(byteLen);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, b => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, hexLen);
      },
    };

    // -------------------------------------------------------------------------
