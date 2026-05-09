import { md4, md5, createMD4, createMD5 } from 'hash-wasm';
import { md2 } from '../../core/algos/md2.js';
import { Format } from '../../core/utils/format.js';
import { initApp } from '../../core/bootstrap.js';

const APP_CONFIG = {
  appName: 'md5kit',
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase(),
  defaultDisabledAlgos: ['MD2'],
};

const ALGORITHMS = [
  { id: 'MD2', type: 'md2', bits: 128, hexLen: 32 },
  { id: 'MD4', type: 'wasm', fn: md4, createFn: createMD4, bits: 128, hexLen: 32 },
  { id: 'MD5', type: 'wasm', fn: md5, createFn: createMD5, bits: 128, hexLen: 32 },
];

const DEFAULT_ALGO = 'MD5';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

const Hasher = {
  async _hashBytes(algo, data) {
    if (algo.type === 'wasm') return algo.fn(data);
    if (algo.type === 'md2') return md2(data);
    throw new Error(`Unknown algo type: ${algo.type}`);
  },

  async fromTextAll(text, inputFmt = 'utf-8') {
    const data = Format.textToBytes(text, inputFmt);
    const results = await Promise.all(ALGORITHMS.map(async (algo) => [algo.id, await this._hashBytes(algo, data)]));
    return new Map(results);
  },

  async fromFileAll(file, onProgress, algos = ALGORITHMS) {
    const totalSize = file.size;
    const CHUNK_SIZE = Math.min(32 * 1024 * 1024, Math.max(150 * 1024, Math.floor(totalSize / 100)));

    const hashers = await Promise.all(
      algos.map(async (algo) => {
        let instance;
        if (algo.type === 'md2') {
          instance = md2.create();
        } else {
          instance = await algo.createFn();
          instance.init();
        }
        return { id: algo.id, instance };
      }),
    );

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

      const now = performance.now();
      if (offset < totalSize && now - lastPaint >= 100) {
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
        lastPaint = performance.now();
      }
    }

    return new Map(
      hashers.map(({ id, instance }) => [
        id,
        typeof instance.hex === 'function' ? instance.hex() : instance.digest('hex'),
      ]),
    );
  },

  generateRandom(algoId) {
    const hexLen = ALGORITHMS.find((a) => a.id === algoId)?.hexLen ?? 32;
    const bytes = new Uint8Array(hexLen / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  },
};

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher });
