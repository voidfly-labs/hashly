import { initApp } from '~core/app/init/app.js';
import { createHasherClient } from '~core/features/hashing/workers/hasher-client.js';
import { spawnWorker } from '~core/features/hashing/workers/spawn.js';

import { ALGORITHMS } from './algorithms.js';
import workerUrl from './worker.js?worker&url';

const APP_CONFIG = {
  appName: 'md5kit',
  requiresWasm: true,
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase(),
  defaultHiddenAlgos: ['MD2'],
};

const DEFAULT_ALGO = 'MD5';

const Hasher = createHasherClient({ spawn: () => spawnWorker(workerUrl), algorithms: ALGORITHMS });

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
