import { randomDigest } from '~core/features/hashing/random-digest.js';
import { Format } from '~core/lib/format.js';

import { share } from './share.js';
import { createWorkerChannel } from './worker-channel.js';

// Threads hashing one file at once: as many as the machine has cores but one (the page needs a
// core too), up to this many. More stops paying off: a file's time is that of its slowest share.
const MAX_THREADS = 4;

// File workers hold WebAssembly instances and read buffers, so a pool that has been idle this long is
// stopped; the next file starts new ones (a moment's start-up, once).
const POOL_IDLE_MS = 30_000;

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
  let textNext = null; // { bytes, ids, waiters }
  const allIds = algorithms.map(({ id }) => id);

  function runText(bytes, ids, waiters) {
    // A worker that can't be started fails this request, not every later one: nothing is busy.
    try {
      textChannel = fresh(textChannel);
    } catch (error) {
      waiters.forEach((w) => w.reject(error));
      if (textNext) {
        const next = textNext;
        textNext = null;
        runText(next.bytes, next.ids, next.waiters);
      }
      return;
    }
    textBusy = true;
    textChannel
      .request({ type: 'text', bytes, ids })
      .promise.then(
        (digests) => waiters.forEach((w) => w.resolve(new Map(digests))),
        (error) => waiters.forEach((w) => w.reject(error)),
      )
      .finally(() => {
        textBusy = false;
        if (!textNext) return;
        const next = textNext;
        textNext = null;
        runText(next.bytes, next.ids, next.waiters);
      });
  }

  // ── Files ───────────────────────────────────────────────────────────────
  const pool = [];
  let filesRunning = 0;
  let idleTimer = null;

  function startFile() {
    filesRunning++;
    clearTimeout(idleTimer);
  }

  function endFile() {
    if (--filesRunning > 0) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      pool.forEach((channel) => channel?.terminate());
      pool.length = 0;
    }, POOL_IDLE_MS);
  }

  return {
    /** How many threads a file would be hashed on with `algos` visible. */
    threadsFor,

    /** A random digest as wide as algorithm `algoId`'s. */
    generateRandom(algoId) {
      return randomDigest(algorithms.find(({ id }) => id === algoId));
    },

    /** The digests of `text` for the algorithms `ids` (all of them if left out): `Map<id, hex>`. A request
     *  overtaken by newer ones gets the newest one's result, so it is for typing, which is superseded
     *  anyway; use `fromTextSome` when the result has to be for this very text. */
    async fromTextAll(text, inputFmt = 'utf-8', ids = allIds) {
      const bytes = Format.textToBytes(text, inputFmt);
      return new Promise((resolve, reject) => {
        const waiter = { resolve, reject };
        if (!textBusy) {
          runText(bytes, ids, [waiter]);
        } else if (textNext) {
          textNext.bytes = bytes;
          textNext.ids = ids;
          textNext.waiters.push(waiter);
        } else {
          textNext = { bytes, ids, waiters: [waiter] };
        }
      });
    },

    /** Like `fromTextAll` for just `ids`, but never merged with another request: the digests are those
     *  of exactly `text`. For filling in what a finished `fromTextAll` left out. */
    async fromTextSome(text, inputFmt, ids) {
      const bytes = Format.textToBytes(text, inputFmt);
      textChannel = fresh(textChannel);
      return new Map(await textChannel.request({ type: 'text', bytes, ids }).promise);
    },

    /** Hashes `file` with `algos`. `handle`, if given, gets a `drop(ids)` that stops the run computing
     *  those algorithms (they then have no digest in the result); a share left with none counts as done. */
    async fromFileAll(file, onProgress, algos = algorithms, signal, handle = {}) {
      if (signal?.aborted) throw abortError();
      const groups = share(algos, threadsFor(algos), costOf);
      startFile();
      let ended = false;
      const finish = () => {
        if (ended) return;
        ended = true;
        endFile();
      };

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
        finish();
        throw error;
      }
      const cancelAll = () => runs.forEach((run) => run.cancel());
      const live = groups.map((ids) => new Set(ids));
      const dropFrom = (i, ids) => {
        const mine = ids.filter((id) => live[i].delete(id));
        if (!mine.length) return;
        runs[i].drop(mine);
        // Nothing left to compute there: that share no longer holds the file's progress back.
        if (!live[i].size) ratios[i] = 1;
      };
      handle.drop = (ids) => groups.forEach((_, i) => dropFrom(i, ids));

      return new Promise((resolve, reject) => {
        const onAbort = () => {
          cancelAll();
          finish(); // the cancelled runs never settle, so nothing else would say it is over
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
          .finally(() => {
            signal?.removeEventListener('abort', onAbort);
            finish();
          });
      });
    },
  };
}
