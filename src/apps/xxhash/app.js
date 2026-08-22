import { initApp } from '~core/app/init/app.js';
import { createHasherClient } from '~core/features/hashing/workers/hasher-client.js';
import { spawnWorker } from '~core/features/hashing/workers/spawn.js';

import { ALGORITHMS } from './algorithms.js';
import workerUrl from './worker.js?worker&url';

const APP_CONFIG = {
  appName: 'xxhashkit',
  requiresWasm: true,
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase(),
  defaultHiddenAlgos: [],
};

const DEFAULT_ALGO = 'XXH64';

const Hasher = createHasherClient({ spawn: () => spawnWorker(workerUrl), algorithms: ALGORITHMS });

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
