import { initApp } from '~core/init/app.js';
import { createHasherClient } from '~core/workers/hasher-client.js';
import { spawnWorker } from '~core/workers/spawn.js';

import workerUrl from './worker.js?worker&url';

const APP_CONFIG = {
  appName: 'xxhashkit',
  requiresWasm: true,
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase(),
  defaultHiddenAlgos: [],
};

const ALGORITHMS = [
  { id: 'XXH32', bits: 32, hexLen: 8 },
  { id: 'XXH64', bits: 64, hexLen: 16 },
  { id: 'XXH3', bits: 64, hexLen: 16 },
  { id: 'XXH128', bits: 128, hexLen: 32 },
];

const DEFAULT_ALGO = 'XXH64';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

const Hasher = {
  ...createHasherClient({ spawn: () => spawnWorker(workerUrl), algorithms: ALGORITHMS }),

  generateRandom(algoId) {
    const hexLen = ALGORITHMS.find((a) => a.id === algoId)?.hexLen ?? 16;
    const bytes = new Uint8Array(hexLen / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  },
};

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher });
