import { initApp } from '~core/app/init/app.js';
import { createHasherClient } from '~core/features/hashing/workers/hasher-client.js';
import { spawnWorker } from '~core/features/hashing/workers/spawn.js';

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

const Hasher = createHasherClient({ spawn: () => spawnWorker(workerUrl), algorithms: ALGORITHMS });

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
