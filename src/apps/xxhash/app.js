import {
  createXXHash3,
  createXXHash32,
  createXXHash64,
  createXXHash128,
  xxhash3,
  xxhash32,
  xxhash64,
  xxhash128,
} from 'hash-wasm';

import { initApp } from '~core/init/app.js';
import { forEachChunk } from '~core/utils/file-chunks.js';
import { Format } from '~core/utils/format.js';

const APP_CONFIG = {
  appName: 'xxhashkit',
  requiresWasm: true,
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase(),
  defaultHiddenAlgos: [],
};

const ALGORITHMS = [
  { id: 'XXH32', fn: xxhash32, createFn: createXXHash32, bits: 32, hexLen: 8 },
  { id: 'XXH64', fn: xxhash64, createFn: createXXHash64, bits: 64, hexLen: 16 },
  { id: 'XXH3', fn: xxhash3, createFn: createXXHash3, bits: 64, hexLen: 16 },
  { id: 'XXH128', fn: xxhash128, createFn: createXXHash128, bits: 128, hexLen: 32 },
];

const DEFAULT_ALGO = 'XXH64';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

const Hasher = {
  async fromTextAll(text, inputFmt = 'utf-8') {
    const data = Format.textToBytes(text, inputFmt);
    const results = await Promise.all(ALGORITHMS.map(async ({ id, fn }) => [id, await fn(data)]));
    return new Map(results);
  },

  async fromFileAll(file, onProgress, algos = ALGORITHMS, signal) {
    const hashers = await Promise.all(algos.map(async ({ id, createFn }) => ({ id, instance: await createFn() })));

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
    const hexLen = ALGORITHMS.find((a) => a.id === algoId)?.hexLen ?? 16;
    const bytes = new Uint8Array(hexLen / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  },
};

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher });
