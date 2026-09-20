import { Storage } from '~core/lib/storage.js';

/** What each setting can be, and what it is until the visitor changes it. `0` for a number that is
 *  chosen from a list means "Auto": the app's own behaviour. */
export const HISTORY_LIMITS = [100, 250, 500, 1000, 2500];
export const THREAD_OPTIONS = [1, 2, 4, 8, 16, 32, 64];
export const CHUNK_OPTIONS_MIB = [2, 4, 8, 16, 32, 64];
export const MAX_FILES_OPTIONS = [25, 50, 100, 250, 500, 1000];

const SPECS = {
  historyEnabled: { fallback: true, valid: (v) => typeof v === 'boolean' },
  historyLimit: { fallback: 1000, valid: (v) => HISTORY_LIMITS.includes(v) },
  historyFilenames: { fallback: true, valid: (v) => typeof v === 'boolean' },
  historyPreviews: { fallback: true, valid: (v) => typeof v === 'boolean' },
  rememberView: { fallback: true, valid: (v) => typeof v === 'boolean' },
  maxThreads: { fallback: 0, valid: (v) => v === 0 || THREAD_OPTIONS.includes(v) },
  maxChunkMiB: { fallback: 0, valid: (v) => v === 0 || CHUNK_OPTIONS_MIB.includes(v) },
  maxFiles: { fallback: 100, valid: (v) => MAX_FILES_OPTIONS.includes(v) },
};

/** The visitor's settings: how the app behaves (as opposed to what it shows, see Preferences), kept as
 *  one small JSON object under `<appName>-settings`. A value that is missing or not one of the
 *  choices (an old build's, tampering) reads as its default. They apply to a permalink as well: they
 *  change what the app does, not the view a link shares.
 *
 *  Other tabs write the same key; `storage` events keep this tab's copy current. Storage that is
 *  blocked or corrupt just means "defaults". */
export const Settings = {
  _key: '',
  _values: {},
  _listeners: [],

  init({ appName }) {
    this._key = `${appName}-settings`;
    this._values = this._read();
    window.addEventListener('storage', (e) => {
      if (e.key !== this._key && e.key !== null) return;
      this._values = this._read();
      this._listeners.forEach((fn) => fn());
    });
  },

  _read() {
    try {
      const data = JSON.parse(Storage.read(this._key) ?? '{}');
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch {
      return {};
    }
  },

  get(name) {
    const { fallback, valid } = SPECS[name];
    const value = this._values[name];
    return valid(value) ? value : fallback;
  },

  set(name, value) {
    if (!SPECS[name].valid(value)) return;
    // Merged into what is stored, not into this tab's copy, so another tab's changes are kept.
    this._values = { ...this._read(), [name]: value };
    Storage.write(this._key, JSON.stringify(this._values));
  },

  /** Calls `fn()` when another tab changed the settings. */
  onExternalChange(fn) {
    this._listeners.push(fn);
  },
};
