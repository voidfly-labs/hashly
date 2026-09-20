import { initApp } from '~core/app/init/app.js';
import { createHasherClient } from '~core/features/hashing/workers/hasher-client.js';
import { spawnWorker } from '~core/features/hashing/workers/spawn.js';

import { ALGORITHMS, DEFAULT_ALGO, DEFAULT_HIDDEN_ALGOS } from './algorithms.js';
import workerUrl from './worker.js?worker&url';

const APP_CONFIG = {
  appName: 'crckit',
  requiresWasm: false,
  fileNoun: 'checksum',
  slugify: (algo) => algo.toLowerCase().replace(/[^a-z0-9]/g, ''),
  defaultHiddenAlgos: DEFAULT_HIDDEN_ALGOS,
};

const Hasher = createHasherClient({
  spawn: () => spawnWorker(workerUrl),
  algorithms: ALGORITHMS,
});

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
