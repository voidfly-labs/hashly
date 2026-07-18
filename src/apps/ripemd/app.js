import { fromArrayBuffer } from 'crypto-api/src/encoder/array-buffer';
import { toHex } from 'crypto-api/src/encoder/hex';
import Ripemd from 'crypto-api/src/hasher/ripemd';

import { initApp } from '~core/init/app.js';
import { forEachChunk } from '~core/utils/file-chunks.js';
import { Format } from '~core/utils/format.js';

const APP_CONFIG = {
  appName: 'ripemdkit',
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replace(/-/g, ''),
  defaultHiddenAlgos: [],
};

const ALGORITHMS = [
  { id: 'RIPEMD-128', bits: 128, hexLen: 32 },
  { id: 'RIPEMD-160', bits: 160, hexLen: 40 },
  { id: 'RIPEMD-256', bits: 256, hexLen: 64 },
  { id: 'RIPEMD-320', bits: 320, hexLen: 80 },
];

const DEFAULT_ALGO = 'RIPEMD-160';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

const Hasher = {
  _call(bits, encodedData) {
    const hasher = new Ripemd({ length: bits });
    hasher.update(encodedData);
    return toHex(hasher.finalize());
  },

  async fromTextAll(text, inputFmt = 'utf-8') {
    const encoded = fromArrayBuffer(Format.textToBytes(text, inputFmt).buffer);
    const results = await Promise.all(ALGORITHMS.map(async ({ id, bits }) => [id, this._call(bits, encoded)]));
    return new Map(results);
  },

  async fromFileAll(file, onProgress, algos = ALGORITHMS, signal) {
    const hashers = algos.map(({ id, bits }) => ({
      id,
      instance: new Ripemd({ length: bits }),
    }));

    await forEachChunk(
      file,
      (buffer) => {
        const encoded = fromArrayBuffer(buffer);

        for (const { instance } of hashers) instance.update(encoded);
      },
      { onProgress, signal },
    );

    return new Map(hashers.map(({ id, instance }) => [id, toHex(instance.finalize())]));
  },

  generateRandom(algoId) {
    const hexLen = ALGORITHMS.find((a) => a.id === algoId)?.hexLen ?? 40;
    const bytes = new Uint8Array(hexLen / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  },
};

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher });
