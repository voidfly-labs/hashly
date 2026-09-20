// A checksum of fewer bits than this is the same for many different files, so equal ones say little.
const MIN_BITS = 64;

/** What makes a finished file a duplicate of another: the digests of all the visible `algorithms` (their
 *  `{ id, bits }` entries), joined. `isHidden(id)` says whether one is hidden. Returns `keyOf(job)`, which
 *  gives that for a job, or null where equal keys would mean nothing: the job is not done, or empty (all
 *  empty files are alike), no visible algorithm is `MIN_BITS` wide, or a visible one has no digest. */
export function createDuplicateKey({ algorithms, isHidden }) {
  return (job) => {
    if (job.status !== 'done' || job.size === 0) return null;
    const visible = algorithms.filter(({ id }) => !isHidden(id));
    if (!visible.some(({ bits }) => bits >= MIN_BITS)) return null;
    const digests = visible.map(({ id }) => job.rawHexMap.get(id));
    return digests.every(Boolean) ? digests.join(':') : null;
  };
}
