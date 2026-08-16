import { initApp } from '~core/app/init/app.js';
import { createHasherClient } from '~core/features/hashing/workers/hasher-client.js';
import { spawnWorker } from '~core/features/hashing/workers/spawn.js';

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

const Hasher = createHasherClient({ spawn: () => spawnWorker(workerUrl), algorithms: ALGORITHMS });

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
