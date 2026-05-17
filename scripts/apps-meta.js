import blakekit from '../src/apps/blake/meta.js';
import crckit from '../src/apps/crc/meta.js';
import hashly from '../src/apps/hashly/meta.js';
import keccakkit from '../src/apps/keccak/meta.js';
import md5kit from '../src/apps/md5/meta.js';
import ripemdkit from '../src/apps/ripemd/meta.js';
import sha2kit from '../src/apps/sha2/meta.js';
import sha3kit from '../src/apps/sha3/meta.js';
import xxhashkit from '../src/apps/xxhash/meta.js';

const metas = { blakekit, crckit, hashly, keccakkit, md5kit, ripemdkit, sha2kit, sha3kit, xxhashkit };

// The suite index app — avoid listing as a peer tool
const SUITE_APP = 'hashly';

export const APPS_META = Object.fromEntries(
  Object.entries(metas).map(([id, meta]) => [
    id,
    {
      ...meta,
      moreToolsLinks: Object.entries(metas)
        .filter(([i]) => i !== id && i !== SUITE_APP)
        .map(([, meta]) => ({ text: meta.footerLabel, href: meta.brandUrl })),
    },
  ]),
);
