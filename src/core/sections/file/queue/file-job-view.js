/** Shows a queue job (see file-queue.js) on the result rows and in the verify field: the part of the
 *  File section that knows what each state of a job looks like there.
 *
 *  `rows` is the section's `createFileRows`, `verify` its `createVerify`, `getFormat()` the output
 *  format to show digests in.
 *
 *  Returns `{ show, addDigests, showEnd }`:
 *   - `show(job)`: the job from scratch, in whatever state it is in (what selecting it does).
 *   - `addDigests(job, digests)`: one share of a running job is in (`Map<id, hex>`).
 *   - `showEnd(job)`: the job just ended, on rows that already show it, so nothing is redrawn. */
export function createJobView({ rows, verify, getFormat }) {
  /** The algorithms `job` still has to work out a digest for. */
  const pendingIds = (job) => [...(job.ids ?? [])].filter((id) => !job.rawHexMap.has(id));

  /** The digests in so far, compared with the reference; with none, there is nothing to compare. */
  const verifyPartial = (job) =>
    verify.setDigests(job.rawHexMap.size ? job.rawHexMap : null, { pending: pendingIds(job) });

  function showEnd(job) {
    const { rawHexMap, status } = job;
    if (status === 'done') {
      rows.settle(rawHexMap);
      verify.setDigests(rawHexMap);
      return;
    }
    // Failed or stopped: the digests that landed stay, the rest say why there is none.
    if (status === 'failed') rows.showFailure(rawHexMap);
    else rows.settle(rawHexMap);
    verifyPartial(job);
  }

  return {
    show(job) {
      rows.reset();
      if (job.status === 'queued' || job.status === 'skipped') {
        if (job.status === 'queued') rows.showQueued();
        else rows.showNothingToHash();
        verify.setDigests(null);
        return;
      }
      if (job.status === 'hashing') rows.startComputing();
      rows.showDigests(job.rawHexMap, getFormat());
      if (job.status === 'hashing') verifyPartial(job);
      else showEnd(job);
    },

    addDigests(job, digests) {
      rows.showDigests(digests, getFormat());
      verify.setDigests(job.rawHexMap, { pending: pendingIds(job) });
    },

    showEnd,
  };
}
