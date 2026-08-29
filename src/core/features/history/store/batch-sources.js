import { createStoredJson } from './stored-json.js';

/** What was hashed, per history batch: `batchId → short description`, kept in its own
 *  storage key so the history entries themselves stay as small as they are (a batch has up
 *  to 33 entries, one per algorithm, and they would each repeat it).
 *
 *  Stays within the storage quota by construction: `keepOnly` drops the description of every
 *  batch that has left the history, so there is never more than one short string per batch
 *  still in it. A write the browser refuses (quota, private mode) is skipped silently and the
 *  descriptions then live in memory for the session only.
 *
 *  Other tabs write the same key: every change first `load`s, which merges in what they saved. */
export function createBatchSources(storageKey) {
  const stored = createStoredJson(storageKey);
  let map = {};

  const save = () => stored.write(Object.keys(map).length ? map : null);

  return {
    /** Brings the descriptions up to date with what is stored (cheap when nothing changed). */
    load() {
      const parsed = stored.read();
      if (parsed === undefined) return;
      map = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    },

    get(batchId) {
      return map[batchId] ?? '';
    },

    set(batchId, description) {
      this.load();
      if (description) map[batchId] = description;
      else delete map[batchId];
      save();
    },

    /** Forgets every batch not in `batchIds` (a Set). */
    keepOnly(batchIds) {
      this.load();
      let changed = false;
      for (const id of Object.keys(map)) {
        if (!batchIds.has(Number(id))) {
          delete map[id];
          changed = true;
        }
      }
      if (changed) save();
    },

    clear() {
      map = {};
      save();
    },
  };
}
