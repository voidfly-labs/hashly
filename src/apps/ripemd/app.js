import { Format } from '@core/utils/format.js';
import { initApp } from '@core/init/app.js';
import CryptoApi from 'crypto-api/src/crypto-api.mjs';

const APP_CONFIG = {
  appName: 'ripemdkit',
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replaceAll('-', ''),
  defaultDisabledAlgos: [],
};

const ALGORITHMS = [
  { id: 'RIPEMD-128', cryptoApiId: 'ripemd128', bits: 128, hexLen: 32 },
  { id: 'RIPEMD-160', cryptoApiId: 'ripemd160', bits: 160, hexLen: 40 },
  { id: 'RIPEMD-256', cryptoApiId: 'ripemd256', bits: 256, hexLen: 64 },
  { id: 'RIPEMD-320', cryptoApiId: 'ripemd320', bits: 320, hexLen: 80 },
];

const DEFAULT_ALGO = 'RIPEMD-160';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

const Hasher = {
  _call(cryptoApiId, encodedData) {
    const hasher = CryptoApi.getHasher(cryptoApiId);
    hasher.update(encodedData);
    return CryptoApi.encoder.toHex(hasher.finalize());
  },

  async fromTextAll(text, inputFmt = 'utf-8') {
    const encoded = CryptoApi.encoder.fromArrayBuffer(Format.textToBytes(text, inputFmt).buffer);
    const results = await Promise.all(
      ALGORITHMS.map(async ({ id, cryptoApiId }) => [id, this._call(cryptoApiId, encoded)]),
    );
    return new Map(results);
  },

  async fromFileAll(file, onProgress, algos = ALGORITHMS) {
    const totalSize = file.size;
    const CHUNK_SIZE = Math.min(32 * 1024 * 1024, Math.max(150 * 1024, Math.floor(totalSize / 100)));

    const hashers = algos.map(({ id, cryptoApiId }) => ({
      id,
      instance: CryptoApi.getHasher(cryptoApiId),
    }));

    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

    let offset = 0;
    let lastPaint = performance.now();
    while (offset < totalSize) {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      const encoded = CryptoApi.encoder.fromArrayBuffer(buffer);

      for (const { instance } of hashers) instance.update(encoded);

      offset += buffer.byteLength;
      onProgress?.(Math.min(offset / totalSize, 1));

      const now = performance.now();
      if (offset < totalSize && now - lastPaint >= 100) {
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
        lastPaint = performance.now();
      }
    }

    return new Map(hashers.map(({ id, instance }) => [id, CryptoApi.encoder.toHex(instance.finalize())]));
  },

  generateRandom(algoId) {
    const hexLen = ALGORITHMS.find((a) => a.id === algoId)?.hexLen ?? 40;
    const bytes = new Uint8Array(hexLen / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  },
};

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher });
