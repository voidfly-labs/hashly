import { createRIPEMD160, ripemd160 } from 'hash-wasm';

import { ripemdEngine } from '~core/features/hashing/workers/engines/ripemd.js';
import { wasmEngine } from '~core/features/hashing/workers/engines/wasm.js';
import { initHasherServer } from '~core/features/hashing/workers/hasher-server.js';

initHasherServer({
  'RIPEMD-128': ripemdEngine(128),
  'RIPEMD-160': wasmEngine({ fn: ripemd160, createFn: createRIPEMD160 }),
  'RIPEMD-256': ripemdEngine(256),
  'RIPEMD-320': ripemdEngine(320),
});
