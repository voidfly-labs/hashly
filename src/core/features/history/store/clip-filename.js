// The history keeps a file name once per entry, so a long path would eat the storage quota
// (see history-store.js): the end of a path says the most, so that is what is kept.
const MAX_CHARS = 200;

/** `name` as it is stored: at most MAX_CHARS characters (code points, so an emoji is never cut in
 *  half), cut from the front and led by "…" when it was longer. */
export function clipFilename(name) {
  const points = Array.from(name ?? '');
  return points.length > MAX_CHARS ? `…${points.slice(1 - MAX_CHARS).join('')}` : points.join('');
}
