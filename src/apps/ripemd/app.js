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

const ALGORITHMS = [
  { id: 'RIPEMD-128', bits: 128, hexLen: 32 },
  { id: 'RIPEMD-160', bits: 160, hexLen: 40 },
  { id: 'RIPEMD-256', bits: 256, hexLen: 64 },
  { id: 'RIPEMD-320', bits: 320, hexLen: 80 },
];

const DEFAULT_ALGO = 'RIPEMD-160';

const Hasher = createHasherClient({ spawn: () => spawnWorker(workerUrl), algorithms: ALGORITHMS });

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
