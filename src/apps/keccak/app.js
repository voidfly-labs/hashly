import { initApp } from '~core/app/init/app.js';
import { createHasherClient } from '~core/features/hashing/workers/hasher-client.js';
import { spawnWorker } from '~core/features/hashing/workers/spawn.js';

import workerUrl from './worker.js?worker&url';

const APP_CONFIG = {
  appName: 'keccakkit',
  requiresWasm: true,
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replace(/-/g, ''),
  defaultHiddenAlgos: [],
};

const ALGORITHMS = [
  { id: 'Keccak-224', bits: 224, hexLen: 56 },
  { id: 'Keccak-256', bits: 256, hexLen: 64 },
  { id: 'Keccak-384', bits: 384, hexLen: 96 },
  { id: 'Keccak-512', bits: 512, hexLen: 128 },
];

const DEFAULT_ALGO = 'Keccak-256';

const Hasher = createHasherClient({ spawn: () => spawnWorker(workerUrl), algorithms: ALGORITHMS });

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
