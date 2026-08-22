import { createBatchSources } from './batch-sources.js';

/** The most entries a history keeps. */
export const MAX_ENTRIES = 1000;

/** Whether something read back from storage can be used as a history entry. `algo` and `batchId`
 *  may be missing (older entries), but not of the wrong type; `ts` is what the time column and
 *  the sort of such older entries rest on. */
function isEntry(e) {
  return (
    Boolean(e) &&
    typeof e.hash === 'string' &&
    e.hash !== '' &&
    Number.isFinite(e.ts) &&
    (e.algo === undefined || typeof e.algo === 'string') &&
    (e.batchId === undefined || Number.isFinite(e.batchId)) &&
    (e.filename === undefined || typeof e.filename === 'string')
  );
}

/** One section's persisted history: its entries, newest first, in `entriesKey` of localStorage, and
 *  what each batch was made from (see ./batch-sources.js) in `sourcesKey`. `sourceIsFile` says an
 *  entry carries its own file name, where text entries only point at a batch's description.
 *
 *  Anything unreadable is dropped on load, not repaired: the next save writes back what is left. A
 *  write the browser refuses (quota, private mode) is skipped silently. */
export function createHistoryStore({ entriesKey, sourcesKey, sourceIsFile }) {
  const sources = createBatchSources(sourcesKey);
  let entries = [];

  function save() {
    try {
      localStorage.setItem(entriesKey, JSON.stringify(entries));
    } catch {
      /* storage full — silently skip */
    }
  }

  return {
    load() {
      sources.load();
      try {
        const raw = localStorage.getItem(entriesKey);
        const parsed = raw ? JSON.parse(raw) : [];
        entries = Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, MAX_ENTRIES) : [];
      } catch {
        entries = [];
      }
    },

    entries: () => entries,

    /** The highest batch id on record (0 if none), for resuming the batch counter. */
    highestBatchId() {
      return entries.reduce((highest, { batchId }) => (batchId > highest ? batchId : highest), 0);
    },

    /** Puts `items` (`[{ hash, algo }]`, one batch) at the top with a single write, however many
     *  there are: a batch holds an entry per algorithm, and writing the whole store for each of them
     *  would stall the page. */
    push(items, batchId, filename) {
      for (const { hash, algo } of items) {
        // Deduplicate on (hash + algo) pair so the same hash value for different
        // algorithms is treated as a distinct entry.
        const idx = entries.findIndex((e) => e.hash === hash && e.algo === algo);
        if (idx !== -1) entries.splice(idx, 1);
        entries.unshift({
          hash,
          algo,
          batchId,
          ts: Date.now(),
          filename: filename || '',
        });
      }
      if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
      // A batch's description goes when its last entry does (trimmed, or replaced by a re-hash).
      sources.keepOnly(new Set(entries.map((e) => e.batchId)));
      save();
    },

    clear() {
      entries = [];
      sources.clear();
      save();
    },

    /** Records what was hashed in a batch (call once per batch, before its entries). */
    setSource: (batchId, description) => sources.set(batchId, description),

    /** What an entry was made from: its file name, or the text description of its batch ('' if unknown). */
    sourceOf: (entry) => (sourceIsFile ? (entry.filename ?? '') : sources.get(entry.batchId)),
  };
}
