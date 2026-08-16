import { createKeccak, keccak } from 'hash-wasm';

import { wasmEngine } from '~core/features/hashing/workers/engines/wasm.js';
import { initHasherServer } from '~core/features/hashing/workers/hasher-server.js';

initHasherServer({
  'Keccak-224': wasmEngine({ fn: (bytes) => keccak(bytes, 224), createFn: () => createKeccak(224) }),
  'Keccak-256': wasmEngine({ fn: (bytes) => keccak(bytes, 256), createFn: () => createKeccak(256) }),
  'Keccak-384': wasmEngine({ fn: (bytes) => keccak(bytes, 384), createFn: () => createKeccak(384) }),
  'Keccak-512': wasmEngine({ fn: (bytes) => keccak(bytes, 512), createFn: () => createKeccak(512) }),
});
