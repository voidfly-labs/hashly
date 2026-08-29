import { createBatchSources } from './batch-sources.js';
import { createStoredJson } from './stored-json.js';

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
 *  write the browser refuses (quota, private mode) is skipped silently.
 *
 *  Other tabs of the app write the same keys. Every change first `load`s, which merges in what they
 *  saved (it only parses when the stored string differs from this tab's last, see ./stored-json.js),
 *  so a tab adds to the history it finds, not to the one it started with. */
export function createHistoryStore({ entriesKey, sourcesKey, sourceIsFile }) {
  const sources = createBatchSources(sourcesKey);
  const stored = createStoredJson(entriesKey);
  let entries = [];

  function save() {
    stored.write(entries);
  }

  /** Brings the entries and descriptions up to date with storage: what this tab last saw, plus
   *  whatever other tabs changed. */
  function load() {
    sources.load();
    const parsed = stored.read();
    if (parsed === undefined) return;
    entries = Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, MAX_ENTRIES) : [];
  }

  return {
    load,

    entries: () => entries,

    /** Puts `items` (`[{ hash, algo }]`, one batch) at the top with a single write, however many
     *  there are: a batch holds an entry per algorithm, and writing the whole store for each of them
     *  would stall the page. */
    push(items, batchId, filename) {
      load();
      for (const { hash, algo } of items) {
        // Append-only: an entry is never replaced, however alike (a short checksum is the same for
        // many inputs, and a re-hash is a calculation of its own). Only the cap trims the history.
        entries.unshift({
          hash,
          algo,
          batchId,
          ts: Date.now(),
          filename: filename || '',
        });
      }
      if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
      // A batch's description goes when its last entry does (trimmed by the cap).
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
