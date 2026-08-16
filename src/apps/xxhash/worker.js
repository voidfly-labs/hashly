import {
  createXXHash3,
  createXXHash32,
  createXXHash64,
  createXXHash128,
  xxhash3,
  xxhash32,
  xxhash64,
  xxhash128,
} from 'hash-wasm';

import { wasmEngine } from '~core/features/hashing/workers/engines/wasm.js';
import { initHasherServer } from '~core/features/hashing/workers/hasher-server.js';

initHasherServer({
  XXH32: wasmEngine({ fn: xxhash32, createFn: createXXHash32 }),
  XXH64: wasmEngine({ fn: xxhash64, createFn: createXXHash64 }),
  XXH3: wasmEngine({ fn: xxhash3, createFn: createXXHash3 }),
  XXH128: wasmEngine({ fn: xxhash128, createFn: createXXHash128 }),
});
