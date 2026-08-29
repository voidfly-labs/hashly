/** The worker side of hashing: run in a Web Worker, never on the page.
 *
 *  `engines` maps an algorithm id to `{ once?(bytes), create() }`:
 *    - `create()` resolves to a fresh streaming hasher `{ update(chunk, shared), digest() }` (hex out);
 *      `shared` is one object per chunk, handed to every hasher, to cache work they would repeat.
 *    - `once(bytes)` hashes a whole input in one call; without it `create()` does it.
 *
 *  Messages in:  `{ type: 'text', id, bytes, ids }`, `{ type: 'file', id, file, ids }`, `{ type: 'cancel', id }`
 *  and `{ type: 'drop', id, ids }` (a running file job stops computing `ids`, and has no digest for them).
 *  Messages out: `{ type: 'progress', id, ratio }`, `{ type: 'result', id, digests }` (`[[algoId, hex]]`)
 *  or `{ type: 'error', id, message }`. A cancelled file job says nothing more.
 *
 *  A file is read here, by the worker, in chunks (a `File` can be sent to a worker), so no
 *  chunk is ever copied between threads. Every file job gets hashers of its own, which is what lets a
 *  cancelled job and its replacement overlap for a moment without sharing any state. */

import { createChunkSizer } from './chunk-sizer.js';

const PROGRESS_EVERY_MS = 50;

export function initHasherServer(engines) {
  /** Jobs that may still be cancelled or trimmed: `id → { cancelled, dropped }`. */
  const fileJobs = new Map();

  const engineFor = (algoId) => {
    const engine = engines[algoId];
    if (!engine) throw new Error(`No engine for ${algoId}`);
    return engine;
  };

  async function once(engine, bytes) {
    if (engine.once) return engine.once(bytes);
    const hasher = await engine.create();
    hasher.update(bytes, {});
    return hasher.digest();
  }

  function hashText({ bytes, ids }) {
    return Promise.all(ids.map(async (algoId) => [algoId, await once(engineFor(algoId), bytes)]));
  }

  const withoutDropped = (hashers, job) =>
    job.dropped.size ? hashers.filter(({ algoId }) => !job.dropped.has(algoId)) : hashers;

  async function hashFile({ id, file, ids }, job) {
    let hashers = await Promise.all(ids.map(async (algoId) => ({ algoId, hasher: await engineFor(algoId).create() })));
    let offset = 0;
    let lastPost = 0;
    const sizer = createChunkSizer();

    // The next chunk is read while this one is hashed, so the worker is not idle during reads. It is
    // sized from the measurement before last. `catch` marks a read we abandon (cancel, every
    // algorithm dropped) as handled; whoever awaits it still sees the rejection.
    const read = (from) => {
      const pending = file.slice(from, from + sizer.bytes).arrayBuffer();
      pending.catch(() => {});
      return pending;
    };
    let reading = file.size ? read(0) : null;

    while (reading) {
      if (job.cancelled) return null;
      const buffer = await reading;
      // Cancelled while reading: stop before touching anything.
      if (job.cancelled) return null;
      reading = offset + buffer.byteLength < file.size ? read(offset + buffer.byteLength) : null;

      // Dropped meanwhile: nothing more is computed for those.
      hashers = withoutDropped(hashers, job);
      if (!hashers.length) return [];

      const chunk = new Uint8Array(buffer);
      const shared = {};
      const hashStart = performance.now();
      for (const { hasher } of hashers) hasher.update(chunk, shared);

      offset += buffer.byteLength;
      const now = performance.now();
      sizer.record(buffer.byteLength, now - hashStart);
      if (offset >= file.size || now - lastPost >= PROGRESS_EVERY_MS) {
        lastPost = now;
        self.postMessage({ type: 'progress', id, ratio: Math.min(offset / file.size, 1) });
      }
    }

    return hashers.map(({ algoId, hasher }) => [algoId, hasher.digest()]);
  }

  self.onmessage = async ({ data }) => {
    const { type, id } = data;
    if (type === 'cancel') {
      const job = fileJobs.get(id);
      if (job) job.cancelled = true;
      return;
    }
    if (type === 'drop') {
      for (const algoId of data.ids) fileJobs.get(id)?.dropped.add(algoId);
      return;
    }

    try {
      if (type === 'text') {
        self.postMessage({ type: 'result', id, digests: await hashText(data) });
      } else if (type === 'file') {
        const job = { cancelled: false, dropped: new Set() };
        fileJobs.set(id, job);
        try {
          const digests = await hashFile(data, job);
          if (digests) self.postMessage({ type: 'result', id, digests });
        } finally {
          fileJobs.delete(id);
        }
      }
    } catch (error) {
      self.postMessage({ type: 'error', id, message: String(error?.message ?? error) });
    }
  };
}
