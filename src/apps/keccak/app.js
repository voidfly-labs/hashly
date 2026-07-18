import { createKeccak, keccak } from 'hash-wasm';

import { initApp } from '~core/init/app.js';
import { forEachChunk } from '~core/utils/file-chunks.js';
import { Format } from '~core/utils/format.js';

const APP_CONFIG = {
  appName: 'keccakkit',
  requiresWasm: true,
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replace(/-/g, ''),
  defaultHiddenAlgos: [],
};

const ALGORITHMS = [
  { id: 'Keccak-224', bits: 224, hexLen: 56 },
  { id: 'Keccak-256', bits: 256, hexLen: 64 },
  { id: 'Keccak-384', bits: 384, hexLen: 96 },
  { id: 'Keccak-512', bits: 512, hexLen: 128 },
];

const DEFAULT_ALGO = 'Keccak-256';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

const Hasher = (() => {
  // Lazily initialised pool: Map<bits, IHasher>
  const _pool = new Map();

  function _getHasher(bits) {
    if (!_pool.has(bits)) _pool.set(bits, createKeccak(bits));
    return _pool.get(bits);
  }

  return {
    async fromTextAll(text, inputFmt = 'utf-8') {
      const data = Format.textToBytes(text, inputFmt);
      const results = await Promise.all(ALGORITHMS.map(async ({ id, bits }) => [id, await keccak(data, bits)]));
      return new Map(results);
    },

    async fromFileAll(file, onProgress, algos = ALGORITHMS, signal) {
      const hashers = await Promise.all(algos.map(async ({ id, bits }) => ({ id, instance: await _getHasher(bits) })));

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
