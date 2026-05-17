import {
  md4,
  md5,
  createMD4,
  createMD5,
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
  keccak,
  createKeccak,
  sha3,
  createSHA3,
  xxhash32,
  xxhash64,
  xxhash3,
  xxhash128,
  createXXHash32,
  createXXHash64,
  createXXHash3,
  createXXHash128,
} from 'hash-wasm';
import { md2 } from '@core/algos/md2.js';
import CryptoApi from 'crypto-api/src/crypto-api.mjs';
import { Format } from '@core/utils/format.js';
import { initApp } from '@core/init/app.js';

const APP_CONFIG = {
  appName: 'hashly',
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replaceAll('-', ''),
  defaultDisabledAlgos: ['MD2'],
};

const ALGORITHMS = [
  // MDx family
  { id: 'MD2', type: 'md2', bits: 128, hexLen: 32 },
  { id: 'MD4', type: 'wasm', fn: md4, createFn: createMD4, bits: 128, hexLen: 32 },
  { id: 'MD5', type: 'wasm', fn: md5, createFn: createMD5, bits: 128, hexLen: 32 },
  // SHA-1 + SHA-2 family
  { id: 'SHA-1', type: 'wasm', fn: sha1, createFn: createSHA1, bits: 160, hexLen: 40 },
  { id: 'SHA-224', type: 'wasm', fn: sha224, createFn: createSHA224, bits: 224, hexLen: 56 },
  { id: 'SHA-256', type: 'wasm', fn: sha256, createFn: createSHA256, bits: 256, hexLen: 64 },
  { id: 'SHA-384', type: 'wasm', fn: sha384, createFn: createSHA384, bits: 384, hexLen: 96 },
  { id: 'SHA-512', type: 'wasm', fn: sha512, createFn: createSHA512, bits: 512, hexLen: 128 },
  // SHA-3 family
  { id: 'SHA3-224', type: 'wasm-sha3', bits: 224, hexLen: 56 },
  { id: 'SHA3-256', type: 'wasm-sha3', bits: 256, hexLen: 64 },
  { id: 'SHA3-384', type: 'wasm-sha3', bits: 384, hexLen: 96 },
  { id: 'SHA3-512', type: 'wasm-sha3', bits: 512, hexLen: 128 },
  // Keccak family
  { id: 'Keccak-224', type: 'wasm-keccak', bits: 224, hexLen: 56 },
  { id: 'Keccak-256', type: 'wasm-keccak', bits: 256, hexLen: 64 },
  { id: 'Keccak-384', type: 'wasm-keccak', bits: 384, hexLen: 96 },
  { id: 'Keccak-512', type: 'wasm-keccak', bits: 512, hexLen: 128 },
  // RIPEMD family
  { id: 'RIPEMD-128', type: 'ripemd', cryptoApiId: 'ripemd128', bits: 128, hexLen: 32 },
  { id: 'RIPEMD-160', type: 'ripemd', cryptoApiId: 'ripemd160', bits: 160, hexLen: 40 },
  { id: 'RIPEMD-256', type: 'ripemd', cryptoApiId: 'ripemd256', bits: 256, hexLen: 64 },
  { id: 'RIPEMD-320', type: 'ripemd', cryptoApiId: 'ripemd320', bits: 320, hexLen: 80 },
  // xxHash family
  { id: 'XXH32', type: 'wasm', fn: xxhash32, createFn: createXXHash32, bits: 32, hexLen: 8 },
  { id: 'XXH64', type: 'wasm', fn: xxhash64, createFn: createXXHash64, bits: 64, hexLen: 16 },
  { id: 'XXH3', type: 'wasm', fn: xxhash3, createFn: createXXHash3, bits: 64, hexLen: 16 },
  { id: 'XXH128', type: 'wasm', fn: xxhash128, createFn: createXXHash128, bits: 128, hexLen: 32 },
];

const DEFAULT_ALGO = 'SHA-256';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

const Hasher = (() => {
  // Lazily initialised pools for parameterised wasm hashers
  const _keccakPool = new Map();
  const _sha3Pool = new Map();

  function _getKeccakHasher(bits) {
    if (!_keccakPool.has(bits)) _keccakPool.set(bits, createKeccak(bits));
    return _keccakPool.get(bits);
  }

  function _getSha3Hasher(bits) {
    if (!_sha3Pool.has(bits)) _sha3Pool.set(bits, createSHA3(bits));
    return _sha3Pool.get(bits);
  }

  return {
    async fromTextAll(text, inputFmt = 'utf-8') {
      const data = Format.textToBytes(text, inputFmt);
      const results = await Promise.all(
        ALGORITHMS.map(async (algo) => {
          let hash;
          if (algo.type === 'wasm') {
            hash = await algo.fn(data);
          } else if (algo.type === 'md2') {
            hash = md2(data);
          } else if (algo.type === 'wasm-keccak') {
            hash = await keccak(data, algo.bits);
          } else if (algo.type === 'wasm-sha3') {
            hash = await sha3(data, algo.bits);
          } else {
            // ripemd — crypto-api expects a binary string, not Uint8Array
            const hasher = CryptoApi.getHasher(algo.cryptoApiId);
            hasher.update(CryptoApi.encoder.fromArrayBuffer(data.buffer));
            hash = CryptoApi.encoder.toHex(hasher.finalize());
          }
          return [algo.id, hash];
        }),
      );
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
          } else if (algo.type === 'wasm') {
            instance = await algo.createFn();
          } else if (algo.type === 'wasm-keccak') {
            instance = await _getKeccakHasher(algo.bits);
            instance.init();
          } else if (algo.type === 'wasm-sha3') {
            instance = await _getSha3Hasher(algo.bits);
            instance.init();
          } else {
            // ripemd
            instance = CryptoApi.getHasher(algo.cryptoApiId);
          }
          return { algo, instance };
        }),
      );

      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

      let offset = 0;
      let lastPaint = performance.now();
      while (offset < totalSize) {
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const buffer = await slice.arrayBuffer();
        const chunk = new Uint8Array(buffer);
        const encodedChunk = CryptoApi.encoder.fromArrayBuffer(buffer);

        for (const { algo, instance } of hashers) {
          if (algo.type === 'ripemd') {
            instance.update(encodedChunk);
          } else {
            instance.update(chunk);
          }
        }

        offset += buffer.byteLength;
        onProgress?.(Math.min(offset / totalSize, 1));

        const now = performance.now();
        if (offset < totalSize && now - lastPaint >= 100) {
          await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
          lastPaint = performance.now();
        }
      }

      return new Map(
        hashers.map(({ algo, instance }) => {
          let hash;
          if (algo.type === 'ripemd') {
            hash = CryptoApi.encoder.toHex(instance.finalize());
          } else if (algo.type === 'md2') {
            hash = instance.hex();
          } else {
            hash = instance.digest('hex');
          }
          return [algo.id, hash];
        }),
      );
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
