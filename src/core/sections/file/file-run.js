import { createRunStats } from '~core/features/hashing/run-stats.js';
import { TabTitle } from '~core/features/hashing/tab-title.js';
import { Announcer } from '~core/ui/announcer/announcer.js';

/** One pass of hashing `file` with `algos` (`{ id }` entries) on `hasher`'s workers: what a file's
 *  hashing does besides producing digests. It keeps the status line (`setStats(text, state)`) and
 *  the tab title up to date, and can be abandoned. The shares it is split into report on their own:
 *  `onShareProgress(ids, ratio)` is how far one has got and `onShare(digests)` hands over its digests
 *  (`Map<id, hex>`) when it is done. Neither is called once the run is abandoned.
 *
 *  Returns `{ ids, result, aborted, abort, dropHidden, isIdle, succeed, fail }`:
 *   - `ids`: the algorithms it still computes (a Set, shrinking as `dropHidden` takes some out).
 *   - `result`: a promise of the digests (`Map<id, hex>`); rejected when aborted or failed.
 *   - `abort()` stops it (clearing the file, dropping another over it, hiding all of `ids`).
 *   - `dropHidden(hiddenAlgos)`: stops computing the algorithms of `ids` that are hidden, as nothing
 *     it produces for them can be seen; they have no digest in `result`.
 *   - `isIdle()`: nothing is left in `ids`.
 *   - `succeed()` and `fail()` report how it ended, on the tab title and the status line. */
export function startFileRun({ file, algos, hasher, setStats, onShare, onShareProgress }) {
  const controller = new AbortController();
  const ids = new Set(algos.map((a) => a.id));
  const title = TabTitle.track();
  const stats = createRunStats(file.size, { threads: hasher.threadsFor(algos) });
  setStats(stats.start(), 'busy');

  const handle = {};
  const progress = (ratio) => {
    title.progress(ratio);
    const line = stats.update(ratio);
    if (line) setStats(line, 'busy');
  };
  // A share can settle just as the run is abandoned: what it has to say is then for nobody.
  const ifLive =
    (fn) =>
    (...args) => {
      if (!controller.signal.aborted) fn(...args);
    };

  return {
    ids,
    result: hasher.fromFileAll(file, progress, algos, controller.signal, handle, {
      onShare: ifLive(onShare),
      onShareProgress: ifLive(onShareProgress),
    }),

    get aborted() {
      return controller.signal.aborted;
    },
    abort: () => controller.abort(),
    dropHidden(hiddenAlgos) {
      const hidden = [...ids].filter((id) => hiddenAlgos.has(id));
      if (!hidden.length) return;
      hidden.forEach((id) => ids.delete(id));
      handle.drop?.(hidden);
    },
    isIdle: () => ids.size === 0,

    succeed() {
      title.done();
      setStats(stats.summary(), 'done');
      Announcer.say('File hashed');
    },
    fail() {
      title.fail();
      setStats('Hashing failed', 'error');
      Announcer.say('Hashing failed');
    },
  };
}
