import { createMD4, createMD5, md4, md5 } from 'hash-wasm';

import { md2Engine } from '~core/workers/engines/md2.js';
import { wasmEngine } from '~core/workers/engines/wasm.js';
import { initHasherServer } from '~core/workers/hasher-server.js';

initHasherServer({
  MD2: md2Engine,
  MD4: wasmEngine({ fn: md4, createFn: createMD4 }),
  MD5: wasmEngine({ fn: md5, createFn: createMD5 }),
});
