import { initApp } from '~core/app/init/app.js';
import { createHasherClient } from '~core/features/hashing/workers/hasher-client.js';
import { spawnWorker } from '~core/features/hashing/workers/spawn.js';

import workerUrl from './worker.js?worker&url';

const APP_CONFIG = {
  appName: 'ripemdkit',
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replace(/-/g, ''),
  defaultHiddenAlgos: [],
};

// `cost` is the time a byte takes, relative to the others (see hashly/app.js): RIPEMD-160 is
// WebAssembly, the others plain JavaScript.
const ALGORITHMS = [
  { id: 'RIPEMD-128', bits: 128, hexLen: 32, cost: 500 },
  { id: 'RIPEMD-160', bits: 160, hexLen: 40, cost: 40 },
  { id: 'RIPEMD-256', bits: 256, hexLen: 64, cost: 500 },
  { id: 'RIPEMD-320', bits: 320, hexLen: 80, cost: 500 },
];

const DEFAULT_ALGO = 'RIPEMD-160';

const Hasher = createHasherClient({ spawn: () => spawnWorker(workerUrl), algorithms: ALGORITHMS });

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
