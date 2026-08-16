import { initApp } from '~core/init/app.js';
import { createHasherClient } from '~core/workers/hasher-client.js';
import { spawnWorker } from '~core/workers/spawn.js';

import workerUrl from './worker.js?worker&url';

const APP_CONFIG = {
  appName: 'md5kit',
  requiresWasm: true,
  fileNoun: 'hash',
  slugify: (algo) => algo.toLowerCase(),
  defaultHiddenAlgos: ['MD2'],
};

// `cost` is the time a byte takes, relative to the others (measured in the worker, in tenths of a ms
// per MiB): it is how a file's algorithms are shared out over the threads. MD2 is plain
// JavaScript, the rest WebAssembly.
const ALGORITHMS = [
  { id: 'MD2', bits: 128, hexLen: 32, cost: 1000 },
  { id: 'MD4', bits: 128, hexLen: 32, cost: 25 },
  { id: 'MD5', bits: 128, hexLen: 32, cost: 35 },
];

const DEFAULT_ALGO = 'MD5';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

const Hasher = {
  ...createHasherClient({ spawn: () => spawnWorker(workerUrl), algorithms: ALGORITHMS }),

  generateRandom(algoId) {
    const hexLen = ALGORITHMS.find((a) => a.id === algoId)?.hexLen ?? 32;
    const bytes = new Uint8Array(hexLen / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  },
};

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher });
