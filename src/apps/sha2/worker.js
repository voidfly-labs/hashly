import {
  createSHA1,
  createSHA224,
  createSHA256,
  createSHA384,
  createSHA512,
  sha1,
  sha224,
  sha256,
  sha384,
  sha512,
} from 'hash-wasm';

import { wasmEngine } from '~core/features/hashing/workers/engines/wasm.js';
import { initHasherServer } from '~core/features/hashing/workers/hasher-server.js';

initHasherServer({
  'SHA-1': wasmEngine({ fn: sha1, createFn: createSHA1 }),
  'SHA-224': wasmEngine({ fn: sha224, createFn: createSHA224 }),
  'SHA-256': wasmEngine({ fn: sha256, createFn: createSHA256 }),
  'SHA-384': wasmEngine({ fn: sha384, createFn: createSHA384 }),
  'SHA-512': wasmEngine({ fn: sha512, createFn: createSHA512 }),
});
