import { History } from '~core/features/history/history.js';

// History records what was hashed once the input has been left alone this long (or at once
// when focus leaves the field, the page is hidden or the field is cleared), not on every
// keystroke: a typed sentence would otherwise push everything else out of the history.
const IDLE_MS = 1000;

/** When and how the Text section puts what it hashed in the history. Each hashed input is a batch
 *  (see History.nextBatch) with a description of what was hashed (see ./text-preview.js).
 *
 *  `hasDigests()` says whether there are digests to record, and `getItems()` returns what is shown
 *  now, `[{ hash, algo }]`: the visible algorithms, in the shown format.
 *
 *  `begin(description)` starts the batch of a newly hashed input, and `queue()` says it is to be
 *  recorded once the input is left alone. `flush()` records it now, if it is waiting; `cancel()` drops
 *  it; `recordNow()` records the current batch now (a new output format: see below).
 *  `recordRestored(items)` records algorithms shown again, in a batch of their own. */
export function createTextHistory({ hasDigests, getItems }) {
  let batchId = null;
  // What the current results were hashed from, as the history describes it.
  let description = '';
  // Input that has been hashed and shown but not yet put in the history.
  let pending = false;
  let timer = null;

  /** Records the shown results as the current batch. */
  function record() {
    if (!hasDigests()) return;
    History.setSource('text', batchId, description);
    History.record(
      'text',
      getItems().filter((item) => item.hash),
      batchId,
    );
  }

  function cancel() {
    pending = false;
    clearTimeout(timer);
  }

  function flush() {
    clearTimeout(timer);
    if (!pending) return;
    pending = false;
    record();
  }

  return {
    /** Starts the batch of an input just hashed, taken from `sourceDescription`. Kept for the
     *  algorithms toggled on later, which hash the same input in a batch of their own. */
    begin(sourceDescription) {
      batchId = History.nextBatch();
      description = sourceDescription;
    },

    queue() {
      pending = true;
      clearTimeout(timer);
      timer = setTimeout(flush, IDLE_MS);
    },

    flush,
    cancel,

    /** Reuses the existing batchId so format changes don't create new history batches — the
     *  batch identity belongs to the computation, not the format. This also covers input
     *  still waiting for the history, which is recorded in the new format. */
    recordNow() {
      cancel();
      record();
    },

    /** Puts algorithms shown again (`[{ hash, algo }]`) in the history, in a batch of their own that
     *  carries the input's description. A fresh batchId, not the stale original: History.record()
     *  always stamps a fresh ts, and an old batchId would sort these entries among their old
     *  batch-mates by algo order instead of by their real time. One batch per user action. */
    recordRestored(items) {
      if (!items.length) return;
      const restoredBatch = History.nextBatch();
      History.setSource('text', restoredBatch, description);
      History.record('text', items, restoredBatch);
    },
  };
}
