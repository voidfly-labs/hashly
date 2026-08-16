import { initApp } from '~core/app/init/app.js';
import { createHasherClient } from '~core/features/hashing/workers/hasher-client.js';
import { spawnWorker } from '~core/features/hashing/workers/spawn.js';

import workerUrl from './worker.js?worker&url';

const APP_CONFIG = {
  appName: 'hashly',
  requiresWasm: true,
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase().replace(/-/g, ''),
  defaultHiddenAlgos: ['MD2', 'Adler-32', 'SM3', 'Whirlpool'],
};

// `cost` is the time a byte takes, relative to the others (measured in the worker, in tenths of a ms
// per MiB): it is how a file's algorithms are shared out over the threads. MD2 and RIPEMD (but 160) are
// plain JavaScript, the rest WebAssembly.
const ALGORITHMS = [
  // MDx family
  { id: 'MD2', bits: 128, hexLen: 32, cost: 1000 },
  { id: 'MD4', bits: 128, hexLen: 32, cost: 25 },
  { id: 'MD5', bits: 128, hexLen: 32, cost: 35 },
  // SHA-1 + SHA-2 family
  { id: 'SHA-1', bits: 160, hexLen: 40, cost: 40 },
  { id: 'SHA-224', bits: 224, hexLen: 56, cost: 60 },
  { id: 'SHA-256', bits: 256, hexLen: 64, cost: 60 },
  { id: 'SHA-384', bits: 384, hexLen: 96, cost: 45 },
  { id: 'SHA-512', bits: 512, hexLen: 128, cost: 50 },
  // SHA-3 family
  { id: 'SHA3-224', bits: 224, hexLen: 56, cost: 50 },
  { id: 'SHA3-256', bits: 256, hexLen: 64, cost: 50 },
  { id: 'SHA3-384', bits: 384, hexLen: 96, cost: 65 },
  { id: 'SHA3-512', bits: 512, hexLen: 128, cost: 80 },
  // BLAKE family
  { id: 'BLAKE2b-256', bits: 256, hexLen: 64, cost: 35 },
  { id: 'BLAKE2b-512', bits: 512, hexLen: 128, cost: 25 },
  { id: 'BLAKE2s-128', bits: 128, hexLen: 32, cost: 40 },
  { id: 'BLAKE2s-256', bits: 256, hexLen: 64, cost: 40 },
  { id: 'BLAKE3-256', bits: 256, hexLen: 64, cost: 45 },
  { id: 'BLAKE3-512', bits: 512, hexLen: 128, cost: 40 },
  // Keccak family
  { id: 'Keccak-224', bits: 224, hexLen: 56, cost: 50 },
  { id: 'Keccak-256', bits: 256, hexLen: 64, cost: 50 },
  { id: 'Keccak-384', bits: 384, hexLen: 96, cost: 60 },
  { id: 'Keccak-512', bits: 512, hexLen: 128, cost: 80 },
  // RIPEMD family
  { id: 'RIPEMD-128', bits: 128, hexLen: 32, cost: 500 },
  { id: 'RIPEMD-160', bits: 160, hexLen: 40, cost: 40 },
  { id: 'RIPEMD-256', bits: 256, hexLen: 64, cost: 500 },
  { id: 'RIPEMD-320', bits: 320, hexLen: 80, cost: 500 },
  // xxHash family
  { id: 'XXH32', bits: 32, hexLen: 8, cost: 15 },
  { id: 'XXH64', bits: 64, hexLen: 16, cost: 15 },
  { id: 'XXH3', bits: 64, hexLen: 16, cost: 15 },
  { id: 'XXH128', bits: 128, hexLen: 32, cost: 15 },
  // Other (rarely needed; hidden by default for files, see defaultHiddenAlgos)
  { id: 'Adler-32', bits: 32, hexLen: 8, cost: 15 },
  { id: 'SM3', bits: 256, hexLen: 64, cost: 65 },
  { id: 'Whirlpool', bits: 512, hexLen: 128, cost: 110 },
];

const DEFAULT_ALGO = 'SHA-256';

const Hasher = createHasherClient({ spawn: () => spawnWorker(workerUrl), algorithms: ALGORITHMS });

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
