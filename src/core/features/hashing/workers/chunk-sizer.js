// A file is read and hashed in chunks sized to take about CHUNK_TARGET_MS each, so progress moves
// and a cancel is noticed about that often whatever the algorithms: fast ones read big chunks
// (fewer reads), slow ones small. Within MIN_CHUNK_BYTES..MAX_CHUNK_BYTES.
const MIN_CHUNK_BYTES = 256 * 1024;
const MAX_CHUNK_BYTES = 4 * 1024 * 1024;
const CHUNK_TARGET_MS = 60;

/** Decides how many bytes of a file to read next. `bytes` is the size of the next chunk (the
 *  minimum until there is a measurement); `record(bytes, ms)` reports how long a chunk of `bytes`
 *  took to hash, and the next one is sized to take about CHUNK_TARGET_MS. It may at most double
 *  from one chunk to the next, as one quick chunk says little. One sizer per file job. */
export function createChunkSizer() {
  let bytes = MIN_CHUNK_BYTES;

  return {
    get bytes() {
      return bytes;
    },

    record(hashedBytes, ms) {
      const wanted = (hashedBytes / Math.max(ms, 0.01)) * CHUNK_TARGET_MS;
      bytes = Math.round(Math.min(MAX_CHUNK_BYTES, hashedBytes * 2, Math.max(MIN_CHUNK_BYTES, wanted)));
    },
  };
}
