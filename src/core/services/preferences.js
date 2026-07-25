import { Storage } from '~core/services/storage.js';

/** The visitor's saved view settings (output formats, hidden algorithms, generator
 *  options), kept as one small JSON object under `<appName>-preferences`. Values
 *  are only ever read back through their consumers, which ignore anything that
 *  no longer applies (an algorithm id that was renamed, say), so nothing here
 *  needs migrating. Storage that is blocked or corrupt just means "no preferences". */
export const Preferences = {
  _key: '',
  _restore: true,
  _silent: 0,

  /** `restore: false` ignores what's saved (a permalink fully determines the view)
   *  while still letting the visitor's own later changes be saved. */
  init({ appName, restore = true }) {
    this._key = `${appName}-preferences`;
    this._restore = restore;
  },

  _read() {
    try {
      const data = JSON.parse(Storage.read(this._key) ?? '{}');
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch {
      return {};
    }
  },

  /** The saved value for `name`, or undefined when nothing is saved or restoring is off. */
  get(name) {
    return this._restore ? this._read()[name] : undefined;
  },

  set(name, value) {
    if (this._silent) return;
    Storage.write(this._key, JSON.stringify({ ...this._read(), [name]: value }));
  },

  /** Runs `fn` without saving anything it changes: for views the visitor didn't choose,
   *  such as a permalink's, which must not replace their own settings. */
  silently(fn) {
    this._silent++;
    try {
      fn();
    } finally {
      this._silent--;
    }
  },
};
