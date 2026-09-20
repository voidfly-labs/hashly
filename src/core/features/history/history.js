import { createHistoryList } from '~core/features/history/list/history-list.js';
import { createHistoryPopover } from '~core/features/history/popover/history-popover.js';
import { initStorageSync } from '~core/features/history/storage-sync.js';
import { createHistoryStore } from '~core/features/history/store/history-store.js';
import { Settings } from '~core/features/settings/settings.js';

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
  // The last batch id handed out: all algorithms hashed from the same user action share one batchId,
  // allowing per-batch algo sorting.
  _lastBatchId: 0,

  init({ APP_CONFIG, DEFAULT_ALGO, ALGO_ORDER }) {
    _APP_CONFIG = APP_CONFIG;
    _DEFAULT_ALGO = DEFAULT_ALGO;
    _ALGO_ORDER = ALGO_ORDER;
  },

  /** Call once before pushing a group of per-algorithm entries so they
   *  all share the same batchId and can be sorted together. */
  nextBatch() {
    // The clock, not a counter: tabs of the same app share the stored history, and a counter each
    // of them kept would hand out the same ids (a batch's description is looked up by its id).
    // Ids stored before this were small counts, so they still sort as older. Never repeats or
    // goes back within a tab, even in one millisecond or if the clock is set back.
    this._lastBatchId = Math.max(this._lastBatchId + 1, Date.now());
    return this._lastBatchId;
  },

  _load(ns, getFormat) {
    const prefix = `${_APP_CONFIG.appName}-history`;
    const entriesKey = `${prefix}-${ns}`;
    const sourcesKey = `${prefix}-source-${ns}`;
    const store = createHistoryStore({
      entriesKey,
      sourcesKey,
      sourceIsFile: ns === 'file',
      limit: () => Settings.get('historyLimit'),
    });
    store.load();
    this._stores[ns] = store;
    this._lists[ns] = createHistoryList({ store, algoOrder: _ALGO_ORDER, defaultAlgo: _DEFAULT_ALGO, getFormat });
    // Another tab recorded or cleared: take in its changes and redraw what shows them.
    initStorageSync([entriesKey, sourcesKey], () => {
      store.load();
      this._notify(ns);
      this._popovers[ns]?.refreshIfVisible();
    });
    this._notify(ns);
  },

  clear(ns) {
    this._stores[ns].clear();
    this._lists[ns].firstPage();
    this._notify(ns);
  },

  /** Applies a lowered size limit: each history drops its oldest entries beyond it. */
  applyLimit() {
    for (const [ns, store] of Object.entries(this._stores)) {
      store.trim();
      this._lists[ns].firstPage();
      this._notify(ns);
      this._popovers[ns]?.refreshIfVisible();
    }
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
    // What was hashed is only kept as far as the visitor allows (see Settings).
    if (!Settings.get('historyEnabled')) return;
    this._stores[ns].setSource(batchId, Settings.get('historyPreviews') ? description : '');
  },

  /** Loads a section's history and wires its popover (opened by `btnId`) to the elements `popoverId`
   *  and `bodyId`. `getFormat()` is the output format the section shows its hashes in, which the
   *  popover shows them in too (see ./list). */
  initPopover(ns, btnId, popoverId, bodyId, getFormat) {
    this._load(ns, getFormat);
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

  /** Call after hashes are produced: `items` is `[{ hash, algo }]`, all of one batch, each hash as
   *  lowercase hex (never in the shown format: a new format is not a new calculation). */
  record(ns, items, batchId, filename) {
    if (!items.length || !Settings.get('historyEnabled')) return;
    this._stores[ns].push(items, batchId, Settings.get('historyFilenames') ? filename : '');
    this._notify(ns);
    // Live-refresh the popover if it's open (a no-op when closed, and when it is past its first page).
    this._popovers[ns]?.refreshIfVisible();
  },
};
