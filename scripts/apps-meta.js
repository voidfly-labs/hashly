import crckit from '../src/apps/crckit/meta.js';
import keccalc from '../src/apps/keccalc/meta.js';
import md5kit from '../src/apps/md5kit/meta.js';
import ripemd from '../src/apps/ripemd/meta.js';
import sha3kit from '../src/apps/sha3kit/meta.js';
import shafile from '../src/apps/shafile/meta.js';

export const LEGAL_UPDATED_ON = '2026-05-01';

const metas = { crckit, keccalc, md5kit, ripemd, sha3kit, shafile };

export const APPS_META = Object.fromEntries(
  Object.entries(metas).map(([id, meta]) => [
    id,
    {
      ...meta,
      moreToolsLinks: Object.entries(metas)
        .filter(([i]) => i !== id)
        .map(([, meta]) => ({ text: meta.siteName, href: meta.brandUrl })),
    },
  ]),
);

export function getLegalUpdatedLabel() {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(LEGAL_UPDATED_ON));
}
