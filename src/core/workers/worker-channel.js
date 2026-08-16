/** One Web Worker spoken to in requests: `request(message, { onProgress })` posts the message under a
 *  fresh id and returns `{ promise, cancel }`. The promise resolves with the worker's `digests`, or
 *  rejects if it reports an error or the worker itself fails (after which the channel is `dead` and
 *  should be replaced). `cancel()` tells the worker to stop and forgets the request; its promise
 *  is left unsettled, so whoever cancels has to settle things on their own. */
let nextId = 0;

export function createWorkerChannel(worker) {
  const pending = new Map(); // id → { resolve, reject, onProgress }
  const channel = { dead: false };

  const failAll = (error) => {
    channel.dead = true;
    for (const { reject } of pending.values()) reject(error);
    pending.clear();
  };

  worker.onmessage = ({ data }) => {
    const request = pending.get(data.id);
    if (!request) return; // answered a request that was cancelled
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
      pending.set(id, { resolve, reject, onProgress });
      try {
        worker.postMessage({ ...message, id });
      } catch (error) {
        pending.delete(id);
        reject(error);
      }
    });
    const cancel = () => {
      if (!pending.delete(id) || channel.dead) return;
      worker.postMessage({ type: 'cancel', id });
    };
    return { promise, cancel };
  };

  channel.terminate = () => {
    failAll(new Error('Hashing worker stopped'));
    worker.terminate();
  };

  return channel;
}
