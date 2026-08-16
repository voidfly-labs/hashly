import { randomDigest } from '~core/features/hashing/random-digest.js';
import { Format } from '~core/lib/format.js';

import { share } from './share.js';
import { createWorkerChannel } from './worker-channel.js';

// Threads hashing one file at once: as many as the machine has cores but one (the page needs a
// core too), up to this many. More stops paying off: a file's time is that of its slowest share.
const MAX_THREADS = 4;

const abortError = () => new DOMException('Aborted', 'AbortError');

/** The page side of hashing: `Hasher.fromTextAll` and `Hasher.fromFileAll`, done on Web Workers so the
 *  page never waits for a hash.
 *
 *  `spawn()` makes a worker running the app's `initHasherServer` (see hasher-server.js). Text goes to one
 *  worker that stays alive; a file is shared out over several (`threadsFor`), each hashing its own
 *  share of the algorithms over the whole file. `algorithms` are the app's `{ id, cost? }` entries;
 *  `cost` is relative time per byte, used to share them out evenly (1 if left out). */
export function createHasherClient({ spawn, algorithms }) {
  const costs = new Map(algorithms.map(({ id, cost }) => [id, cost ?? 1]));
  const costOf = ({ id }) => costs.get(id) ?? 1;
  const maxThreads = Math.min(MAX_THREADS, Math.max(1, (navigator.hardwareConcurrency ?? 2) - 1));

  const threadsFor = (algos) => Math.max(1, Math.min(maxThreads, algos.length));
  // The channel itself while it works, else a new one (a dead one's worker is stopped first).
  const fresh = (channel) => {
    if (channel && !channel.dead) return channel;
    channel?.terminate();
    return createWorkerChannel(spawn());
  };

  // ── Text ────────────────────────────────────────────────────────────────
  // One request at a time. Typing faster than hashing leaves at most one more waiting, and it
  // replaces any before it (all their callers get its result: they have been superseded anyway).
  let textChannel = null;
  let textBusy = false;
  let textNext = null; // { bytes, waiters }
  const allIds = algorithms.map(({ id }) => id);

  function runText(bytes, waiters) {
    // A worker that can't be started fails this request, not every later one: nothing is busy.
    try {
      textChannel = fresh(textChannel);
    } catch (error) {
      waiters.forEach((w) => w.reject(error));
      if (textNext) {
        const { bytes: nextBytes, waiters: nextWaiters } = textNext;
        textNext = null;
        runText(nextBytes, nextWaiters);
      }
      return;
    }
    textBusy = true;
    textChannel
      .request({ type: 'text', bytes, ids: allIds })
      .promise.then(
        (digests) => waiters.forEach((w) => w.resolve(new Map(digests))),
        (error) => waiters.forEach((w) => w.reject(error)),
      )
      .finally(() => {
        textBusy = false;
        if (!textNext) return;
        const { bytes: nextBytes, waiters: nextWaiters } = textNext;
        textNext = null;
        runText(nextBytes, nextWaiters);
      });
  }

  // ── Files ───────────────────────────────────────────────────────────────
  const pool = [];

  return {
    /** How many threads a file would be hashed on with `algos` visible. */
    threadsFor,

    /** A random digest as wide as algorithm `algoId`'s. */
    generateRandom(algoId) {
      return randomDigest(algorithms.find(({ id }) => id === algoId));
    },

    async fromTextAll(text, inputFmt = 'utf-8') {
      const bytes = Format.textToBytes(text, inputFmt);
      return new Promise((resolve, reject) => {
        const waiter = { resolve, reject };
        if (!textBusy) {
          runText(bytes, [waiter]);
        } else if (textNext) {
          textNext.bytes = bytes;
          textNext.waiters.push(waiter);
        } else {
          textNext = { bytes, waiters: [waiter] };
        }
      });
    },

    async fromFileAll(file, onProgress, algos = algorithms, signal) {
      if (signal?.aborted) throw abortError();
      const groups = share(algos, threadsFor(algos), costOf);

      const ratios = groups.map(() => 0);
      let reported = 0;
      const runs = [];
      try {
        groups.forEach((ids, i) => {
          pool[i] = fresh(pool[i]);
          runs.push(
            pool[i].request(
              { type: 'file', file, ids },
              {
                onProgress(ratio) {
                  ratios[i] = ratio;
                  // The file is as far along as its slowest share.
                  const slowest = Math.min(...ratios);
                  if (slowest <= reported) return;
                  reported = slowest;
                  onProgress?.(slowest);
                },
              },
            ),
          );
        });
      } catch (error) {
        runs.forEach((run) => run.cancel()); // a worker that wouldn't start: stop the ones that did
        throw error;
      }
      const cancelAll = () => runs.forEach((run) => run.cancel());

      return new Promise((resolve, reject) => {
        const onAbort = () => {
          cancelAll();
          reject(abortError());
        };
        signal?.addEventListener('abort', onAbort, { once: true });
        Promise.all(runs.map((run) => run.promise))
          .then(
            (shares) => resolve(new Map(shares.flat())),
            (error) => {
              cancelAll();
              reject(error);
            },
          )
          .finally(() => signal?.removeEventListener('abort', onAbort));
      });
    },
  };
}
