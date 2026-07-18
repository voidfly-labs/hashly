import { blake2b, blake2s, blake3, createBLAKE2b, createBLAKE2s, createBLAKE3 } from 'hash-wasm';

import { initApp } from '~core/init/app.js';
import { forEachChunk } from '~core/utils/file-chunks.js';
import { Format } from '~core/utils/format.js';

const APP_CONFIG = {
  appName: 'blakekit',
  requiresWasm: true,
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replace(/-/g, ''),
  defaultHiddenAlgos: [],
};

const ALGORITHMS = [
  { id: 'BLAKE2b-256', family: 'blake2b', bits: 256, hexLen: 64 },
  { id: 'BLAKE2b-512', family: 'blake2b', bits: 512, hexLen: 128 },
  { id: 'BLAKE2s-128', family: 'blake2s', bits: 128, hexLen: 32 },
  { id: 'BLAKE2s-256', family: 'blake2s', bits: 256, hexLen: 64 },
  { id: 'BLAKE3-256', family: 'blake3', bits: 256, hexLen: 64 },
  { id: 'BLAKE3-512', family: 'blake3', bits: 512, hexLen: 128 },
];

const DEFAULT_ALGO = 'BLAKE3-256';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

const Hasher = (() => {
  // Lazily initialised pool: Map<`${family}-${bits}`, IHasher>
  const _pool = new Map();
  const _fns = { blake2b, blake2s, blake3 };
  const _createFns = { blake2b: createBLAKE2b, blake2s: createBLAKE2s, blake3: createBLAKE3 };

  function _getHasher(family, bits) {
    const key = `${family}-${bits}`;
    if (!_pool.has(key)) _pool.set(key, _createFns[family](bits));
    return _pool.get(key);
  }

  return {
    async fromTextAll(text, inputFmt = 'utf-8') {
      const data = Format.textToBytes(text, inputFmt);
      const results = await Promise.all(
        ALGORITHMS.map(async ({ id, family, bits }) => [id, await _fns[family](data, bits)]),
      );
      return new Map(results);
    },

    async fromFileAll(file, onProgress, algos = ALGORITHMS, signal) {
      const hashers = await Promise.all(
        algos.map(async ({ id, family, bits }) => ({ id, instance: await _getHasher(family, bits) })),
      );

      for (const { instance } of hashers) instance.init();

      await forEachChunk(
        file,
        (buffer) => {
          const chunk = new Uint8Array(buffer);

          for (const { instance } of hashers) instance.update(chunk);
        },
        { onProgress, signal },
      );

      return new Map(hashers.map(({ id, instance }) => [id, instance.digest('hex')]));
    },

    generateRandom(algoId) {
      const hexLen = ALGORITHMS.find((a) => a.id === algoId)?.hexLen ?? 64;
      const bytes = new Uint8Array(hexLen / 2);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    },
  };
})();

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher });
