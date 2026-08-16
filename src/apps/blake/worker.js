import { blake2b, blake2s, blake3, createBLAKE2b, createBLAKE2s, createBLAKE3 } from 'hash-wasm';

import { wasmEngine } from '~core/workers/engines/wasm.js';
import { initHasherServer } from '~core/workers/hasher-server.js';

initHasherServer({
  'BLAKE2b-160': wasmEngine({ fn: (bytes) => blake2b(bytes, 160), createFn: () => createBLAKE2b(160) }),
  'BLAKE2b-256': wasmEngine({ fn: (bytes) => blake2b(bytes, 256), createFn: () => createBLAKE2b(256) }),
  'BLAKE2b-384': wasmEngine({ fn: (bytes) => blake2b(bytes, 384), createFn: () => createBLAKE2b(384) }),
  'BLAKE2b-512': wasmEngine({ fn: (bytes) => blake2b(bytes, 512), createFn: () => createBLAKE2b(512) }),
  'BLAKE2s-128': wasmEngine({ fn: (bytes) => blake2s(bytes, 128), createFn: () => createBLAKE2s(128) }),
  'BLAKE2s-224': wasmEngine({ fn: (bytes) => blake2s(bytes, 224), createFn: () => createBLAKE2s(224) }),
  'BLAKE2s-256': wasmEngine({ fn: (bytes) => blake2s(bytes, 256), createFn: () => createBLAKE2s(256) }),
  'BLAKE3-256': wasmEngine({ fn: (bytes) => blake3(bytes, 256), createFn: () => createBLAKE3(256) }),
  'BLAKE3-512': wasmEngine({ fn: (bytes) => blake3(bytes, 512), createFn: () => createBLAKE3(512) }),
});
