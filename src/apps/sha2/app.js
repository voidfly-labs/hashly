import { initApp } from '~core/init/app.js';
import { createHasherClient } from '~core/workers/hasher-client.js';
import { spawnWorker } from '~core/workers/spawn.js';

import workerUrl from './worker.js?worker&url';

const APP_CONFIG = {
  appName: 'sha2kit',
  requiresWasm: true,
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replace(/-/g, ''),
  defaultHiddenAlgos: [],
};

const ALGORITHMS = [
  { id: 'SHA-1', bits: 160, hexLen: 40 },
  { id: 'SHA-224', bits: 224, hexLen: 56 },
  { id: 'SHA-256', bits: 256, hexLen: 64 },
  { id: 'SHA-384', bits: 384, hexLen: 96 },
  { id: 'SHA-512', bits: 512, hexLen: 128 },
];

const DEFAULT_ALGO = 'SHA-256';
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
