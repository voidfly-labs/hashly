import { ripemdEngine } from '~core/features/hashing/workers/engines/ripemd.js';
import { initHasherServer } from '~core/features/hashing/workers/hasher-server.js';

initHasherServer({
  'RIPEMD-128': ripemdEngine(128),
  'RIPEMD-160': ripemdEngine(160),
  'RIPEMD-256': ripemdEngine(256),
  'RIPEMD-320': ripemdEngine(320),
});
