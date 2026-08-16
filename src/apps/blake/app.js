import { initApp } from '~core/init/app.js';
import { createHasherClient } from '~core/workers/hasher-client.js';
import { spawnWorker } from '~core/workers/spawn.js';

import workerUrl from './worker.js?worker&url';

const APP_CONFIG = {
  appName: 'blakekit',
  requiresWasm: true,
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replace(/-/g, ''),
  defaultHiddenAlgos: [],
};

const ALGORITHMS = [
  { id: 'BLAKE2b-160', bits: 160, hexLen: 40 },
  { id: 'BLAKE2b-256', bits: 256, hexLen: 64 },
  { id: 'BLAKE2b-384', bits: 384, hexLen: 96 },
  { id: 'BLAKE2b-512', bits: 512, hexLen: 128 },
  { id: 'BLAKE2s-128', bits: 128, hexLen: 32 },
  { id: 'BLAKE2s-224', bits: 224, hexLen: 56 },
  { id: 'BLAKE2s-256', bits: 256, hexLen: 64 },
  { id: 'BLAKE3-256', bits: 256, hexLen: 64 },
  { id: 'BLAKE3-512', bits: 512, hexLen: 128 },
];

const DEFAULT_ALGO = 'BLAKE3-256';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

const Hasher = {
  ...createHasherClient({ spawn: () => spawnWorker(workerUrl), algorithms: ALGORITHMS }),

  generateRandom(algoId) {
    const hexLen = ALGORITHMS.find((a) => a.id === algoId)?.hexLen ?? 64;
    const bytes = new Uint8Array(hexLen / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  },
};

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher });
