import { createBatchSources } from '~core/services/batch-sources.js';
import { Checkmark } from '~core/utils/checkmark.js';
import { toCsv } from '~core/utils/csv.js';
import { Download } from '~core/utils/download.js';
import { downloadDigest } from '~core/utils/download-digest.js';
import { matchesTerms, searchTerms } from '~core/utils/history-filter.js';
import { iconHref } from '~core/utils/icon.js';
import { slideIn } from '~core/utils/slide-in.js';
import { takesText } from '~core/utils/text-field.js';

import { initButtonTooltip } from './button-tooltip.js';
import { copyWithFeedback } from './copy-feedback.js';
import { initHistoryRows } from './history-rows.js';
import { createHistorySearch } from './history-search.js';
import { renderHistoryTable } from './history-table.js';
import { createPopover } from './popover.js';
import { Tooltip } from './tooltip.js';

// How long Clear stays armed for its confirming second click.
const CLEAR_CONFIRM_MS = 4000;
const ARMED_CLASS = 'history-popover__clear--armed';
/** Fired on `document` whenever a history's entries change; `detail` is `{ ns, count }`. */
export const HISTORY_CHANGE = 'history:change';

let _APP_CONFIG, _DEFAULT_ALGO, _ALGO_ORDER;

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

// Persisted per section, max 1000 entries, newest first.
// Pagination: PAGE_SIZE rows per page, controls rendered in popover footer.
export const History = {
  MAX: 1000,
  PAGE_SIZE: 10,
  _stores: { text: [], file: [] },
  // What was hashed, per batch (see services/batch-sources.js). Only text needs it: a file
  // entry carries its own file name.
  _sources: {},
  // The rows currently rendered per ns, so a row's index (data-i) leads back to its entry.
  _view: {},
  _pages: { text: 0, file: 0 }, // current 0-based page index per ns
  // The tallest the body has been since the popover opened, per ns: it keeps that height, so the
  // popover doesn't shrink and grow as pages with fewer rows come and go.
  _tallest: {},
  // Per popover, the function that takes its Clear button out of the "Confirm" state (see initPopover).
  _disarmClear: {},
  // Per popover, how to open and close it from outside (the nav menu opens them).
  _openFns: {},
  _closeFns: {},
  // The search in each popover: the query as typed, and its words (see utils/history-filter.js).
  _query: { text: '', file: '' },
  _terms: { text: [], file: [] },
  // Monotonically-increasing batch counter: all algorithms hashed from the
  // same user action share one batchId, allowing per-batch algo sorting.
  _batchCounter: 0,

  init({ APP_CONFIG, DEFAULT_ALGO, ALGO_ORDER }) {
    _APP_CONFIG = APP_CONFIG;
    _DEFAULT_ALGO = DEFAULT_ALGO;
    _ALGO_ORDER = ALGO_ORDER;
  },

  _key(ns) {
    return `${_APP_CONFIG.appName}-history-${ns}`;
  },

  /** Call once before pushing a group of per-algorithm entries so they
   *  all share the same batchId and can be sorted together. */
  nextBatch() {
    return ++this._batchCounter;
  },

  load(ns) {
    this._sources[ns] = createBatchSources(`${_APP_CONFIG.appName}-history-source-${ns}`);
    this._sources[ns].load();
    this.setQuery(ns, '');
    try {
      const raw = localStorage.getItem(this._key(ns));
      const parsed = raw ? JSON.parse(raw) : [];
      // Anything unreadable is dropped, not repaired: the next save writes back what is left.
      this._stores[ns] = Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, this.MAX) : [];
    } catch {
      this._stores[ns] = [];
    }
    this._pages[ns] = 0;
    // _batchCounter isn't persisted — only the entries are — so on a fresh
    // page load it would otherwise restart at 0 and immediately collide with
    // batchIds already stored from a previous session, scrambling the sort
    // (colliding batchIds fall through to the algo-order tiebreak instead of
    // recency). Resume it above whatever's already on record instead.
    for (const { batchId } of this._stores[ns]) {
      if (batchId > this._batchCounter) this._batchCounter = batchId;
    }
    this._notify(ns);
  },

  save(ns) {
    try {
      localStorage.setItem(this._key(ns), JSON.stringify(this._stores[ns]));
    } catch {
      /* storage full — silently skip */
    }
  },

  /** Puts `items` (`[{ hash, algo }]`, one batch) at the top of the history with a single write, however
   *  many there are: a batch holds an entry per algorithm, and writing the whole store for each of them
   *  would stall the page. */
  push(ns, items, batchId, filename) {
    const entries = this._stores[ns];
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
    if (entries.length > this.MAX) entries.length = this.MAX;
    // A batch's description goes when its last entry does (trimmed, or replaced by a re-hash).
    this._sources[ns].keepOnly(new Set(entries.map((e) => e.batchId)));
    // New entries go to page 0
    this._pages[ns] = 0;
    this.save(ns);
    this._notify(ns);
  },

  clear(ns) {
    this._stores[ns] = [];
    this._sources[ns].clear();
    this._pages[ns] = 0;
    this.save(ns);
    this._notify(ns);
  },

  entries(ns) {
    return this._stores[ns];
  },

  /** Opens a section's history popover from outside it, closing the other one. */
  show(ns) {
    for (const other of Object.keys(this._closeFns)) if (other !== ns) this._closeFns[other]();
    this._openFns[ns]?.();
  },

  /** Tells listeners (the nav menu's counts) that a history's entries changed. */
  _notify(ns) {
    document.dispatchEvent(new CustomEvent(HISTORY_CHANGE, { detail: { ns, count: this._stores[ns].length } }));
  },

  /** The entries the popover shows, in its order: all of them, or those matching the search. */
  _visible(ns) {
    const sorted = this._sorted(ns);
    const terms = this._terms[ns];
    if (!terms.length) return sorted;
    return sorted.filter((e) => matchesTerms(terms, [e.hash, e.algo ?? _DEFAULT_ALGO, this.sourceOf(ns, e)]));
  },

  /** Sets the search (an empty `query` ends it) and goes back to the first page. */
  setQuery(ns, query) {
    this._query[ns] = query;
    this._terms[ns] = searchTerms(query);
    this._pages[ns] = 0;
  },

  /** Records what was hashed in a batch (call once per batch, before its entries). */
  setSource(ns, batchId, description) {
    this._sources[ns].set(batchId, description);
  },

  /** What an entry was made from: its file name, or the text description of its batch ('' if unknown). */
  sourceOf(ns, entry) {
    return ns === 'file' ? (entry.filename ?? '') : this._sources[ns].get(entry.batchId);
  },

  /** Copies a rendered row's hash, confirming on its hash cell. */
  async _copyRow(ns, row) {
    const entry = this._view[ns]?.[Number(row.dataset.i)];
    if (!entry) return;
    await copyWithFeedback(entry.hash, { anchor: row.querySelector('.history-table__hash') });
  },

  // ── Rendering ────────────────────────────────────────────────────────────

  _formatTs(ts) {
    const d = new Date(ts);
    const pad = (v) => String(v).padStart(2, '0');
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  },

  // Sort: primary = batchId descending (newest calculation first),
  // secondary = algo index ascending (SHA-1 → SHA-256 → … within a batch).
  // Entries without a batchId (legacy localStorage data) fall back to ts.
  _sorted(ns) {
    return this.entries(ns)
      .slice()
      .sort((a, b) => {
        const bA = a.batchId ?? -a.ts;
        const bB = b.batchId ?? -b.ts;
        if (bB !== bA) return bB - bA;
        return (_ALGO_ORDER.get(a.algo) ?? 999) - (_ALGO_ORDER.get(b.algo) ?? 999);
      });
  },

  /** ISO 8601 with the UTC offset ("2026-10-05T14:03:09+02:00"): unlike the popover's local time,
   *  a CSV outlives the machine and timezone it was exported in. */
  _isoTs(ts) {
    const d = new Date(ts);
    const pad = (v) => String(Math.trunc(Math.abs(v))).padStart(2, '0');
    const offset = -d.getTimezoneOffset();
    const sign = offset < 0 ? '-' : '+';
    return `${this._formatTs(ts).replace(' ', 'T')}${sign}${pad(offset / 60)}:${pad(offset % 60)}`;
  },

  /** Downloads the whole history, or the matches of a search (not just the visible page), in the order the popover shows it. */
  exportCsv(ns) {
    // What was hashed comes before the hash: the file name, or (text) the stored description.
    const rows = this._visible(ns).map((e) => [
      this._isoTs(e.ts),
      e.algo ?? _DEFAULT_ALGO,
      this.sourceOf(ns, e),
      e.hash,
    ]);
    // Only the source (a file name, or text) is a stranger's: the hash must stay as it is.
    const csv = toCsv(['time', 'algorithm', ns === 'file' ? 'filename' : 'text', 'hash'], rows, { guard: [2] });
    const date = this._formatTs(Date.now()).slice(0, 10);
    Download.trigger(csv, `${_APP_CONFIG.appName}-${ns}-history_${date}.csv`, 'text/csv;charset=utf-8');
  },

  renderBody(ns, bodyEl) {
    const visible = this._visible(ns);
    const pages = Math.max(1, Math.ceil(visible.length / this.PAGE_SIZE));
    // Clamp page in case entries shrank (e.g. after clear)
    this._pages[ns] = Math.min(this._pages[ns], pages - 1);
    const page = this._pages[ns];
    const start = page * this.PAGE_SIZE;

    const slice = visible.slice(start, start + this.PAGE_SIZE);
    this._view[ns] = slice;

    bodyEl.classList.toggle('history-popover__body--empty', !slice.length);
    bodyEl.innerHTML = renderHistoryTable(slice, {
      start,
      defaultAlgo: _DEFAULT_ALGO,
      formatTs: (ts) => this._formatTs(ts),
      sourceOf: (e) => this.sourceOf(ns, e),
      sourceIsFile: ns === 'file',
      query: this._query[ns],
      terms: this._terms[ns],
    });
  },

  // Renders the footer with pagination + clear button and wires events.
  // Called once per popover on init; re-renders pagination state on each open/page-change.
  _renderFooter(ns, popover) {
    // Remove existing footer if any
    const existing = popover.querySelector('.history-popover__footer');
    if (existing) existing.remove();

    const total = this._visible(ns).length;
    const pages = Math.max(1, Math.ceil(total / this.PAGE_SIZE));
    const page = this._pages[ns];
    // Clear deletes the whole history, which is not what a search seems to show.
    const searching = this._terms[ns].length > 0;

    const footer = document.createElement('div');
    footer.className = 'history-popover__footer';
    footer.innerHTML = `
          <div class="history-pagination" aria-label="History pagination">
            <button
              class="history-pagination__btn"
              data-dir="-1"
              aria-label="Previous page"
              ${page === 0 ? 'disabled' : ''}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
            <span class="history-pagination__info">${total ? `${page + 1} / ${pages}` : '—'}</span>
            <button
              class="history-pagination__btn"
              data-dir="1"
              aria-label="Next page"
              ${page >= pages - 1 ? 'disabled' : ''}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>
          </div>
          <div class="history-popover__footer-actions">
            <button class="history-popover__export" data-history-export aria-label="Export as CSV" type="button" ${total ? '' : 'disabled'}>
              <svg class="icon-action" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('download')}"></use></svg>
              <svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('check')}"></use></svg>
              <span class="history-popover__export-label">Export<span class="history-popover__export-suffix"> CSV</span></span>
              <span class="tooltip">Exported</span>
            </button>
            <button class="history-popover__clear" data-history-clear="${ns}" ${
              searching ? 'disabled title="Clear the search to delete the history"' : ''
            }>
              <span class="history-popover__clear-face"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('delete')}"></use></svg>Clear</span>
              <span class="history-popover__clear-face history-popover__clear-face--confirm"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('delete')}"></use></svg>Confirm</span>
            </button>
          </div>`;
    popover.appendChild(footer);
  },

  // ── Popover controller ───────────────────────────────────────────────────

  _refreshFns: {}, // keyed by ns; used by record() to live-update open popovers

  initPopover(ns, btnId, popoverId, bodyId) {
    this.load(ns);

    const btn = document.getElementById(btnId);
    const popover = document.getElementById(popoverId);
    const body = document.getElementById(bodyId);

    // The body is re-rendered often; this listens on it once.
    initHistoryRows(body, (row) => this._copyRow(ns, row));

    const search = createHistorySearch({
      ns,
      onChange: (query) => {
        this.setQuery(ns, query);
        refresh();
      },
    });
    popover.insertBefore(search.el, body);

    // Render body + footer and re-wire footer controls (footer is fully replaced each call)
    const refresh = () => {
      const total = this.entries(ns).length;
      // A history of one page has nothing to search, so the field is only there for a longer one.
      if (total <= this.PAGE_SIZE && this._terms[ns].length) {
        this.setQuery(ns, '');
        search.reset();
      }
      search.update({ shown: total > this.PAGE_SIZE, matched: this._visible(ns).length, total });
      body.style.minHeight = `${this._tallest[ns] ?? 0}px`;
      this.renderBody(ns, body);
      this._renderFooter(ns, popover);
      // Measured with the footer in place: on a short screen the body is what gives way to it.
      this._tallest[ns] = Math.max(this._tallest[ns] ?? 0, body.offsetHeight);
      // Re-wire hover tooltips on the newly-rendered action buttons. Their click flashes
      // "Copied!" / "Exported", so it must not hide the tooltip as well.
      body.querySelectorAll('.history-table__action-btn[data-action]').forEach((btn) => {
        const label = btn.dataset.action === 'copy-history' ? 'Copy' : 'Download';
        initButtonTooltip(btn, label, { hideOnClick: false });
      });

      popover.querySelectorAll('.history-pagination__btn').forEach((pbtn) => {
        pbtn.addEventListener('mouseenter', () => Tooltip.show(pbtn, pbtn.dataset.dir === '-1' ? 'Previous' : 'Next'));
        pbtn.addEventListener('mouseleave', () => Tooltip.hide());
        pbtn.addEventListener('click', (e) => {
          e.stopPropagation();
          Tooltip.hide(); // the footer is rebuilt below, so no mouseleave comes for this button
          const pages = Math.max(1, Math.ceil(this._visible(ns).length / this.PAGE_SIZE));
          const dir = Number.parseInt(pbtn.dataset.dir, 10);
          this._pages[ns] = Math.max(0, Math.min(this._pages[ns] + dir, pages - 1));
          refresh();
          slideIn(body.querySelector('.history-table'), dir);
        });
      });

      const exportBtn = popover.querySelector('[data-history-export]');
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exportCsv(ns);
        Tooltip.flash(exportBtn);
        Checkmark.flash(exportBtn);
      });

      // Clear takes two clicks: the first arms it ("Confirm"), the second, within a few seconds,
      // deletes. It disarms on a timeout, on focus leaving it, on Escape and on closing.
      const clearBtn = popover.querySelector('[data-history-clear]');
      if (clearBtn) {
        let timer = 0;
        // Returns whether it was armed, which Escape uses to know it has done something.
        const disarm = () => {
          clearTimeout(timer);
          const wasArmed = clearBtn.classList.contains(ARMED_CLASS);
          clearBtn.classList.remove(ARMED_CLASS);
          return wasArmed;
        };
        this._disarmClear[ns] = disarm;
        clearBtn.addEventListener('blur', disarm);
        clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!clearBtn.classList.contains(ARMED_CLASS)) {
            clearBtn.classList.add(ARMED_CLASS);
            timer = setTimeout(disarm, CLEAR_CONFIRM_MS);
            return;
          }
          disarm();
          this.clear(ns);
          this._tallest[ns] = 0;
          refresh();
        });
      }
    };

    // Expose refresh so record() can call it when the popover is live. A batch records one entry
    // per algorithm in a row, so the redraw waits for the next frame and covers them all at once.
    let refreshQueued = false;
    this._refreshFns[ns] = () => {
      if (refreshQueued || !popover.classList.contains('history-popover--visible')) return;
      refreshQueued = true;
      requestAnimationFrame(() => {
        refreshQueued = false;
        if (popover.classList.contains('history-popover--visible')) refresh();
      });
    };

    // Hover tooltip on the history clock button
    btn.addEventListener('mouseenter', () => Tooltip.show(btn, 'History'));
    btn.addEventListener('mouseleave', () => Tooltip.hide());

    const { open, close } = createPopover({
      trigger: btn,
      el: popover,
      visibleClass: 'history-popover--visible',
      onOpen: () => {
        this._tallest[ns] = 0;
        this.setQuery(ns, '');
        search.reset();
        refresh();
      },
      onShown: () => search.focus(),
      onClose: () => this._disarmClear[ns]?.(),
      // Escape backs out of the innermost thing first: an armed Clear, then a search, then the popover.
      onEscape: () => {
        if (this._disarmClear[ns]?.()) return true;
        if (!search.value()) return false;
        search.reset();
        this.setQuery(ns, '');
        refresh();
        return true;
      },
    });

    this._openFns[ns] = open;
    this._closeFns[ns] = close;

    document.addEventListener('keydown', (e) => {
      if (!popover.classList.contains('history-popover--visible')) return;
      // "/" or Ctrl/⌘+F goes to the search field (when the history is long enough to have one). "/"
      // is left alone in a field, where it is a character; the browser's own find is only taken
      // over while there is a field to take its place.
      const findKey = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'f';
      const slashKey = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !takesText(e.target);
      if ((findKey || slashKey) && !search.el.hidden) {
        e.preventDefault();
        search.focus(true);
      }
    });

    // Delegated actions (the action buttons, and clearing a search that matched nothing) — wired once, works across re-renders
    body.addEventListener('click', async (e) => {
      if (e.target.closest('[data-search-clear]')) {
        e.stopPropagation(); // the re-render detaches the link, which would read as a click outside
        search.reset();
        this.setQuery(ns, '');
        refresh();
        search.focus();
        return;
      }
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const { action, hash } = target.dataset;

      if (action === 'copy-history') {
        e.stopPropagation();
        await copyWithFeedback(hash, { button: target });
      } else if (action === 'download-history') {
        e.stopPropagation();
        downloadDigest(hash, target.dataset.algo ?? _DEFAULT_ALGO, target.dataset.filename ?? '', _APP_CONFIG);
        Tooltip.flash(target);
        Checkmark.flash(target);
      }
    });
  },

  /** Call after hashes are produced: `items` is `[{ hash, algo }]`, all of one batch. */
  record(ns, items, batchId, filename) {
    if (!items.length) return;
    this.push(ns, items, batchId, filename);
    // Live-refresh the popover if it's open (refresh() is a no-op when closed)
    this._refreshFns[ns]?.();
  },
};
