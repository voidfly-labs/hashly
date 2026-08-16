import { initApp } from '~core/app/init/app.js';
import { createHasherClient } from '~core/features/hashing/workers/hasher-client.js';
import { spawnWorker } from '~core/features/hashing/workers/spawn.js';

import workerUrl from './worker.js?worker&url';

const APP_CONFIG = {
  appName: 'blakekit',
  requiresWasm: true,
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replace(/-/g, ''),
  defaultHiddenAlgos: [],
};

const ALGORITHMS = [
  { id: 'BLAKE2b-160', bits: 160, hexLen: 40 },
  { id: 'BLAKE2b-256', bits: 256, hexLen: 64 },
  { id: 'BLAKE2b-384', bits: 384, hexLen: 96 },
  { id: 'BLAKE2b-512', bits: 512, hexLen: 128 },
  { id: 'BLAKE2s-128', bits: 128, hexLen: 32 },
  { id: 'BLAKE2s-224', bits: 224, hexLen: 56 },
  { id: 'BLAKE2s-256', bits: 256, hexLen: 64 },
  { id: 'BLAKE3-256', bits: 256, hexLen: 64 },
  { id: 'BLAKE3-512', bits: 512, hexLen: 128 },
];

const DEFAULT_ALGO = 'BLAKE3-256';

const Hasher = createHasherClient({ spawn: () => spawnWorker(workerUrl), algorithms: ALGORITHMS });

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
