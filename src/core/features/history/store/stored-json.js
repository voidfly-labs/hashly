// Firefox names its quota error differently, and old engines only set the code.
const isQuotaError = (error) =>
  error?.name === 'QuotaExceededError' ||
  error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
  error?.code === 22 ||
  error?.code === 1014;

/** One JSON value in localStorage that several tabs of the same app may write.
 *
 *  `read()` is cheap while nobody else has written: it fetches the stored string and compares it
 *  with the one this tab last read or wrote, and only parses when they differ. A tab can
 *  therefore call it before every write to merge in what other tabs saved, without paying for a
 *  parse of a large history each time.
 *
 *  Storage that refuses or fails (quota, private mode) leaves the remembered string alone, so the
 *  caller's in-memory copy stays the truth for the session instead of being overwritten by an
 *  older stored one. */
export function createStoredJson(key) {
  // The string last read or written (null: nothing stored). Undefined until the first read.
  let seen;

  return {
    /** The stored value if it changed since this tab last looked (`null` when it is missing or
     *  unreadable), or `undefined` when it did not: keep what you have. */
    read() {
      let raw = null;
      try {
        raw = localStorage.getItem(key);
      } catch {
        /* storage unavailable: behaves as empty */
      }
      if (raw === seen) return undefined;
      seen = raw;
      if (raw === null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },

    /** Stores `value`, or removes the key for `null`. Returns `'ok'`, `'full'` when the browser refused
     *  it for lack of quota (a smaller value may fit) or `'failed'` for any other reason. */
    write(value) {
      try {
        if (value === null) {
          localStorage.removeItem(key);
          seen = null;
        } else {
          const raw = JSON.stringify(value);
          localStorage.setItem(key, raw);
          seen = raw;
        }
        return 'ok';
      } catch (error) {
        // Storage full or unavailable: skip, the caller keeps it in memory.
        return isQuotaError(error) ? 'full' : 'failed';
      }
    },
  };
}
