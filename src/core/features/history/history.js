import { createHistoryList } from '~core/features/history/list/history-list.js';
import { createHistoryPopover } from '~core/features/history/popover/history-popover.js';
import { createHistoryStore } from '~core/features/history/store/history-store.js';

/** Fired on `document` whenever a history's entries change; `detail` is `{ ns, count }`. */
export const HISTORY_CHANGE = 'history:change';

let _APP_CONFIG, _DEFAULT_ALGO, _ALGO_ORDER;

/** The hash history of each section (`ns`: 'text', 'file'), persisted per app and per section, newest
 *  first. This is the facade the page talks to; the pieces behind it are the store (./store), the
 *  sorted, searched and paged list (./list), the popover that shows it (./popover) and the CSV export
 *  (./export). */
export const History = {
  _stores: {},
  _lists: {},
  _popovers: {},
  // Monotonically-increasing batch counter: all algorithms hashed from the
  // same user action share one batchId, allowing per-batch algo sorting.
  _batchCounter: 0,

  init({ APP_CONFIG, DEFAULT_ALGO, ALGO_ORDER }) {
    _APP_CONFIG = APP_CONFIG;
    _DEFAULT_ALGO = DEFAULT_ALGO;
    _ALGO_ORDER = ALGO_ORDER;
  },

  /** Call once before pushing a group of per-algorithm entries so they
   *  all share the same batchId and can be sorted together. */
  nextBatch() {
    return ++this._batchCounter;
  },

  _load(ns) {
    const prefix = `${_APP_CONFIG.appName}-history`;
    const store = createHistoryStore({
      entriesKey: `${prefix}-${ns}`,
      sourcesKey: `${prefix}-source-${ns}`,
      sourceIsFile: ns === 'file',
    });
    store.load();
    this._stores[ns] = store;
    this._lists[ns] = createHistoryList({ store, algoOrder: _ALGO_ORDER, defaultAlgo: _DEFAULT_ALGO });
    // _batchCounter isn't persisted — only the entries are — so on a fresh
    // page load it would otherwise restart at 0 and immediately collide with
    // batchIds already stored from a previous session, scrambling the sort
    // (colliding batchIds fall through to the algo-order tiebreak instead of
    // recency). Resume it above whatever's already on record instead.
    this._batchCounter = Math.max(this._batchCounter, store.highestBatchId());
    this._notify(ns);
  },

  clear(ns) {
    this._stores[ns].clear();
    this._lists[ns].firstPage();
    this._notify(ns);
  },

  entries(ns) {
    return this._stores[ns]?.entries() ?? [];
  },

  /** Opens a section's history popover from outside it, closing the other one. */
  show(ns) {
    for (const [other, popover] of Object.entries(this._popovers)) if (other !== ns) popover.close();
    this._popovers[ns]?.open();
  },

  /** Tells listeners (the nav menu's counts) that a history's entries changed. */
  _notify(ns) {
    document.dispatchEvent(new CustomEvent(HISTORY_CHANGE, { detail: { ns, count: this.entries(ns).length } }));
  },

  /** Records what was hashed in a batch (call once per batch, before its entries). */
  setSource(ns, batchId, description) {
    this._stores[ns].setSource(batchId, description);
  },

  /** Loads a section's history and wires its popover (opened by `btnId`) to the elements `popoverId`
   *  and `bodyId`. */
  initPopover(ns, btnId, popoverId, bodyId) {
    this._load(ns);
    this._popovers[ns] = createHistoryPopover({
      ns,
      trigger: document.getElementById(btnId),
      popover: document.getElementById(popoverId),
      body: document.getElementById(bodyId),
      store: this._stores[ns],
      list: this._lists[ns],
      appConfig: _APP_CONFIG,
      defaultAlgo: _DEFAULT_ALGO,
      onClear: () => this.clear(ns),
    });
  },

  /** Call after hashes are produced: `items` is `[{ hash, algo }]`, all of one batch. */
  record(ns, items, batchId, filename) {
    if (!items.length) return;
    this._stores[ns].push(items, batchId, filename);
    // New entries go to page 0
    this._lists[ns].firstPage();
    this._notify(ns);
    // Live-refresh the popover if it's open (a no-op when closed)
    this._popovers[ns]?.refreshIfVisible();
  },
};
