import {
  sha1,
  sha224,
  sha256,
  sha384,
  sha512,
  createSHA1,
  createSHA224,
  createSHA256,
  createSHA384,
  createSHA512,
} from 'hash-wasm';
import { Format } from '../../core/utils/format.js';
import { initApp } from '../../core/bootstrap.js';

const APP_CONFIG = {
  appName: 'shafile',
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replaceAll('-', ''),
  defaultDisabledAlgos: [],
};

const ALGORITHMS = [
  { id: 'SHA-1', fn: sha1, createFn: createSHA1, bits: 160, hexLen: 40 },
  { id: 'SHA-224', fn: sha224, createFn: createSHA224, bits: 224, hexLen: 56 },
  { id: 'SHA-256', fn: sha256, createFn: createSHA256, bits: 256, hexLen: 64 },
  { id: 'SHA-384', fn: sha384, createFn: createSHA384, bits: 384, hexLen: 96 },
  { id: 'SHA-512', fn: sha512, createFn: createSHA512, bits: 512, hexLen: 128 },
];

const DEFAULT_ALGO = 'SHA-256';
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
    const hexLen = ALGORITHMS.find((a) => a.id === algoId)?.hexLen ?? 64;
    const bytes = new Uint8Array(hexLen / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  },
};

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher });
