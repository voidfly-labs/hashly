import { matchesTerms, searchTerms } from './history-filter.js';

/** How many rows a page of a history table has. */
export const PAGE_SIZE = 10;

/** The view of one history's entries that its popover shows: sorted, narrowed by a search, and cut
 *  into pages. It holds the search (the query as typed, and its words, see ./history-filter.js)
 *  and the current page, but not the entries, which stay in `store`.
 *
 *  Sorted by batch, newest calculation first, then by the algorithm's place in `algoOrder` (an
 *  `id → index` Map), so a batch reads in the app's own order. Entries without a batch id (older
 *  data) fall back to their time. `defaultAlgo` names the algorithm of an entry without one. */
export function createHistoryList({ store, algoOrder, defaultAlgo }) {
  let query = '';
  let terms = [];
  let page = 0;
  // The rows of the page last shown, so a row's index leads back to its entry.
  let shown = [];

  const sorted = () =>
    store
      .entries()
      .slice()
      .sort((a, b) => {
        const batchA = a.batchId ?? -a.ts;
        const batchB = b.batchId ?? -b.ts;
        if (batchB !== batchA) return batchB - batchA;
        return (algoOrder.get(a.algo) ?? 999) - (algoOrder.get(b.algo) ?? 999);
      });

  /** The entries the popover shows, in its order: all of them, or those matching the search. */
  function visible() {
    const all = sorted();
    if (!terms.length) return all;
    return all.filter((e) => matchesTerms(terms, [e.hash, e.algo ?? defaultAlgo, store.sourceOf(e)]));
  }

  const pageCount = () => Math.max(1, Math.ceil(visible().length / PAGE_SIZE));

  return {
    visible,
    pageCount,

    get query() {
      return query;
    },
    get terms() {
      return terms;
    },
    get searching() {
      return terms.length > 0;
    },
    get page() {
      return page;
    },

    /** Sets the search (an empty `query` ends it) and goes back to the first page. */
    setQuery(next) {
      query = next;
      terms = searchTerms(next);
      page = 0;
    },

    firstPage() {
      page = 0;
    },

    /** Moves `direction` pages (-1, 1), staying within the pages there are. */
    step(direction) {
      page = Math.max(0, Math.min(page + direction, pageCount() - 1));
    },

    /** The current page's `{ rows, start }`: `start` is the index of its first row in the whole list.
     *  The page is kept within the pages there are, in case the entries shrank (after a clear). */
    currentPage() {
      const all = visible();
      page = Math.min(page, Math.max(1, Math.ceil(all.length / PAGE_SIZE)) - 1);
      const start = page * PAGE_SIZE;
      shown = all.slice(start, start + PAGE_SIZE);
      return { rows: shown, start };
    },

    /** The entry of the row at `index` of the page last shown. */
    rowAt: (index) => shown[index],
  };
}
