import { createSHA3, sha3 } from 'hash-wasm';

import { wasmEngine } from '~core/features/hashing/workers/engines/wasm.js';
import { initHasherServer } from '~core/features/hashing/workers/hasher-server.js';

initHasherServer({
  'SHA3-224': wasmEngine({ fn: (bytes) => sha3(bytes, 224), createFn: () => createSHA3(224) }),
  'SHA3-256': wasmEngine({ fn: (bytes) => sha3(bytes, 256), createFn: () => createSHA3(256) }),
  'SHA3-384': wasmEngine({ fn: (bytes) => sha3(bytes, 384), createFn: () => createSHA3(384) }),
  'SHA3-512': wasmEngine({ fn: (bytes) => sha3(bytes, 512), createFn: () => createSHA3(512) }),
});
