/** Thin localStorage wrapper — guards every call so a private-browsing
 *  session or a full/disabled store degrades to "nothing persisted"
 *  instead of throwing. */
const PROBE_KEY = '__storage-probe';

export const Storage = {
  read(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  /** Whether the value was stored: false when storage is blocked or full. */
  write(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  /** Whether a value can be stored right now: false when storage is blocked, disabled or full. */
  supported() {
    try {
      localStorage.setItem(PROBE_KEY, '1');
      localStorage.removeItem(PROBE_KEY);
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable — nothing to clear */
    }
  },
};
