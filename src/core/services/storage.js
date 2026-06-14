/** Thin localStorage wrapper — guards every call so a private-browsing
 *  session or a full/disabled store degrades to "nothing persisted"
 *  instead of throwing. */
export const Storage = {
  read(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable — nothing to persist */
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
