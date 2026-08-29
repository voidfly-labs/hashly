/** One Web Worker spoken to in requests: `request(message, { onProgress })` posts the message under a
 *  fresh id and returns `{ promise, cancel }`. The promise resolves with the worker's `digests`, or
 *  rejects if it reports an error or the worker itself fails (after which the channel is `dead` and
 *  should be replaced). `cancel()` tells the worker to stop and forgets the request; its promise
 *  is left unsettled, so whoever cancels has to settle things on their own. `drop(ids)` stops a file
 *  request computing some of its algorithms.
 *
 *  A request whose worker has said nothing for `stallMs` is taken for lost (see ./stall-watchdog.js): the
 *  channel is stopped and its requests reject like any other failure. A file job reports after every
 *  chunk (some tens of milliseconds) and a text request is done in moments, so the limit is far past
 *  anything a healthy worker takes; only a read from a very slow disk comes close. */

import { createStallWatchdog } from './stall-watchdog.js';

let nextId = 0;

// How long a request may hear nothing from its worker, and how often that is looked at.
const STALL_MS = 30_000;
const CHECK_MS = 5000;

export function createWorkerChannel(worker, { stallMs = STALL_MS, checkMs = CHECK_MS } = {}) {
  const pending = new Map(); // id → { resolve, reject, onProgress, heardAt }
  const channel = { dead: false };

  const failAll = (error) => {
    channel.dead = true;
    watchdog.stop();
    for (const { reject } of pending.values()) reject(error);
    pending.clear();
  };

  const watchdog = createStallWatchdog({
    requests: () => pending.values(),
    stallMs,
    checkMs,
    onStall() {
      failAll(new Error('Hashing worker stopped responding'));
      worker.terminate();
    },
  });

  worker.onmessage = ({ data }) => {
    const request = pending.get(data.id);
    if (!request) return; // answered a request that was cancelled
    request.heardAt = performance.now();
    if (data.type === 'progress') {
      request.onProgress?.(data.ratio);
      return;
    }
    pending.delete(data.id);
    if (data.type === 'result') request.resolve(data.digests);
    else request.reject(new Error(data.message));
  };
  worker.onerror = (event) => failAll(new Error(event.message || 'Hashing worker failed'));
  worker.onmessageerror = () => failAll(new Error('Hashing worker sent an unreadable message'));

  channel.request = (message, { onProgress } = {}) => {
    const id = ++nextId;
    const promise = new Promise((resolve, reject) => {
      if (channel.dead) {
        reject(new Error('Hashing worker is not running'));
        return;
      }
      pending.set(id, { resolve, reject, onProgress, heardAt: performance.now() });
      try {
        worker.postMessage({ ...message, id });
        watchdog.start();
      } catch (error) {
        pending.delete(id);
        reject(error);
      }
    });
    const cancel = () => {
      if (!pending.delete(id) || channel.dead) return;
      worker.postMessage({ type: 'cancel', id });
    };
    /** Tells the worker to stop computing `ids` of this (file) request. */
    const drop = (ids) => {
      if (!pending.has(id) || channel.dead) return;
      worker.postMessage({ type: 'drop', id, ids });
    };
    return { promise, cancel, drop };
  };

  channel.terminate = () => {
    failAll(new Error('Hashing worker stopped'));
    worker.terminate();
  };

  return channel;
}
