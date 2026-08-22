import { createRunStats } from '~core/features/hashing/run-stats.js';
import { TabTitle } from '~core/features/hashing/tab-title.js';

/** One pass of hashing `file` with `algos` (`{ id }` entries) on `hasher`'s workers: what a file's
 *  hashing does besides producing digests. It keeps the status line (`setStats(text, state)`) and
 *  the tab title up to date, tells `onProgress(ratio)` how far along it is, and can be abandoned.
 *
 *  Returns `{ ids, result, aborted, abort, isIdle, succeed, fail }`:
 *   - `ids`: the algorithms it computes.
 *   - `result`: a promise of the digests (`Map<id, hex>`); rejected when aborted or failed.
 *   - `abort()` stops it (clearing the file, dropping another over it, hiding all of `ids`).
 *   - `isIdle(hiddenAlgos)`: every one of `ids` is hidden, so nothing it produces can be seen.
 *   - `succeed()` and `fail()` report how it ended, on the tab title and the status line. */
export function startFileRun({ file, algos, hasher, setStats, onProgress }) {
  const controller = new AbortController();
  const ids = new Set(algos.map((a) => a.id));
  const title = TabTitle.track();
  const stats = createRunStats(file.size, { threads: hasher.threadsFor(algos) });
  setStats(stats.start(), 'busy');

  const progress = (ratio) => {
    title.progress(ratio);
    const line = stats.update(ratio);
    if (line) setStats(line, 'busy');
    onProgress(ratio);
  };

  return {
    ids,
    result: hasher.fromFileAll(file, progress, algos, controller.signal),

    get aborted() {
      return controller.signal.aborted;
    },
    abort: () => controller.abort(),
    isIdle: (hiddenAlgos) => [...ids].every((id) => hiddenAlgos.has(id)),

    succeed() {
      title.done();
      setStats(stats.summary(), 'done');
    },
    fail() {
      title.fail();
      setStats('Hashing failed', 'error');
    },
  };
}
