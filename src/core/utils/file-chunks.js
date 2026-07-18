import { yieldToPaint } from '~core/utils/paint.js';

const MIN_CHUNK = 150 * 1024;
const MAX_CHUNK = 32 * 1024 * 1024;
const PAINT_EVERY_MS = 100;

/** Reads `file` front to back in chunks of about 1% of its size (between 150 KiB
 *  and 32 MiB) and hands each chunk, an ArrayBuffer, to `onChunk` in order.
 *  `onChunk` is synchronous: the hashers it feeds must not see chunks overlap.
 *
 *  While it works it reports progress as a 0–1 ratio to `onProgress`, and keeps
 *  yielding so the page can paint. If `signal` aborts it stops with an
 *  AbortError, noticed between chunks, so cancelling lands within one chunk of
 *  work. */
export async function forEachChunk(file, onChunk, { onProgress, signal } = {}) {
  const total = file.size;
  const chunkSize = Math.min(MAX_CHUNK, Math.max(MIN_CHUNK, Math.floor(total / 100)));
  const throwIfAborted = () => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  };

  await yieldToPaint();
  throwIfAborted();

  let offset = 0;
  let lastPaint = performance.now();
  while (offset < total) {
    const buffer = await file.slice(offset, offset + chunkSize).arrayBuffer();
    throwIfAborted();
    onChunk(buffer);

    offset += buffer.byteLength;
    onProgress?.(Math.min(offset / total, 1));

    if (offset < total && performance.now() - lastPaint >= PAINT_EVERY_MS) {
      await yieldToPaint();
      throwIfAborted();
      lastPaint = performance.now();
    }
  }
}
