import { initApp } from '~core/init/app.js';
import { createHasherClient } from '~core/workers/hasher-client.js';
import { spawnWorker } from '~core/workers/spawn.js';

import workerUrl from './worker.js?worker&url';

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
  ...createHasherClient({ spawn: () => spawnWorker(workerUrl), algorithms: ALGORITHMS }),

  generateRandom(algoId) {
    const hexLen = ALGORITHMS.find((a) => a.id === algoId)?.hexLen ?? 40;
    const bytes = new Uint8Array(hexLen / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  },
};

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher });
