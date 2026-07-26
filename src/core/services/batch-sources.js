/** What was hashed, per history batch: `batchId → short description`, kept in its own
 *  storage key so the history entries themselves stay as small as they are (a batch has up
 *  to 33 entries, one per algorithm, and they would each repeat it).
 *
 *  Stays within the storage quota by construction: `keepOnly` drops the description of every
 *  batch that has left the history, so there is never more than one short string per batch
 *  still in it. A write the browser refuses (quota, private mode) is skipped silently and the
 *  descriptions then live in memory for the session only. */
export function createBatchSources(storageKey) {
  let map = {};

  function save() {
    try {
      if (Object.keys(map).length) localStorage.setItem(storageKey, JSON.stringify(map));
      else localStorage.removeItem(storageKey);
    } catch {
      /* storage full or unavailable: keep it in memory */
    }
  }

  return {
    load() {
      try {
        const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
        map = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch {
        map = {};
      }
    },

    get(batchId) {
      return map[batchId] ?? '';
    },

    set(batchId, description) {
      if (description) map[batchId] = description;
      else delete map[batchId];
      save();
    },

    /** Forgets every batch not in `batchIds` (a Set). */
    keepOnly(batchIds) {
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
