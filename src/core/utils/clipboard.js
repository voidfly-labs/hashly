export const Clipboard = {
  get canRead() {
    return typeof navigator.clipboard?.readText === 'function';
  },

  /** Clipboard text, or null if reading is unsupported or denied. */
  async read() {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  },

  async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  },
};
