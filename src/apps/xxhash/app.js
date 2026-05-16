import {
  xxhash32,
  xxhash64,
  xxhash3,
  xxhash128,
  createXXHash32,
  createXXHash64,
  createXXHash3,
  createXXHash128,
} from 'hash-wasm';
import { Format } from '@core/utils/format.js';
import { initApp } from '@core/init/app.js';

const APP_CONFIG = {
  appName: 'xxhash',
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase(),
  defaultDisabledAlgos: [],
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

  async fromFileAll(file, onProgress, algos = ALGORITHMS) {
    const totalSize = file.size;
    const CHUNK_SIZE = Math.min(32 * 1024 * 1024, Math.max(150 * 1024, Math.floor(totalSize / 100)));

    const hashers = await Promise.all(algos.map(async ({ id, createFn }) => ({ id, instance: await createFn() })));

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

      const now = performance.now();
      if (offset < totalSize && now - lastPaint >= 100) {
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
        lastPaint = performance.now();
      }
    }

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
