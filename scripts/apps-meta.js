import blakekit from '../src/apps/blakekit/meta.js';
import crckit from '../src/apps/crckit/meta.js';
import hashly from '../src/apps/hashly/meta.js';
import keccak from '../src/apps/keccak/meta.js';
import md5kit from '../src/apps/md5kit/meta.js';
import ripemd from '../src/apps/ripemd/meta.js';
import sha2kit from '../src/apps/sha2kit/meta.js';
import sha3kit from '../src/apps/sha3kit/meta.js';
import xxhash from '../src/apps/xxhash/meta.js';

const metas = { blakekit, crckit, hashly, keccak, md5kit, ripemd, sha2kit, sha3kit, xxhash };

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
