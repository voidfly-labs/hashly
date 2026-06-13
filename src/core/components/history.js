import { Clipboard } from '~core/utils/clipboard.js';
import { Download } from '~core/utils/download.js';

import { Tooltip } from './tooltip.js';

let _APP_CONFIG, _DEFAULT_ALGO, _ALGO_ORDER;

// Persisted per section, max 1000 entries, newest first.
// Pagination: PAGE_SIZE rows per page, controls rendered in popover footer.
export const History = {
  MAX: 1000,
  PAGE_SIZE: 10,
  _stores: { text: [], file: [] },
  _pages: { text: 0, file: 0 }, // current 0-based page index per ns
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
    try {
      const raw = localStorage.getItem(this._key(ns));
      this._stores[ns] = raw ? JSON.parse(raw) : [];
    } catch {
      this._stores[ns] = [];
    }
    this._pages[ns] = 0;
  },

  save(ns) {
    try {
      localStorage.setItem(this._key(ns), JSON.stringify(this._stores[ns]));
    } catch {
      /* storage full — silently skip */
    }
  },

  push(ns, hash, algo, batchId, filename) {
    const entries = this._stores[ns];
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
    if (entries.length > this.MAX) entries.length = this.MAX;
    // New entry goes to page 0
    this._pages[ns] = 0;
    this.save(ns);
  },

  clear(ns) {
    this._stores[ns] = [];
    this._pages[ns] = 0;
    this.save(ns);
  },

  entries(ns) {
    return this._stores[ns];
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

  renderBody(ns, bodyEl) {
    const entries = this.entries(ns);
    const total = entries.length;
    const pages = Math.max(1, Math.ceil(total / this.PAGE_SIZE));
    // Clamp page in case entries shrank (e.g. after clear)
    this._pages[ns] = Math.min(this._pages[ns], pages - 1);
    const page = this._pages[ns];
    const start = page * this.PAGE_SIZE;

    // Sort: primary = batchId descending (newest calculation first),
    // secondary = algo index ascending (SHA-1 → SHA-256 → … within a batch).
    // Entries without a batchId (legacy localStorage data) fall back to ts.
    const sorted = entries.slice().sort((a, b) => {
      const bA = a.batchId ?? -a.ts;
      const bB = b.batchId ?? -b.ts;
      if (bB !== bA) return bB - bA;
      return (_ALGO_ORDER.get(a.algo) ?? 999) - (_ALGO_ORDER.get(b.algo) ?? 999);
    });

    const slice = sorted.slice(start, start + this.PAGE_SIZE);

    // ── Table ──
    if (!slice.length) {
      bodyEl.innerHTML = `
            <table class="history-table" aria-label="Hash history">
              <thead>
                <tr>
                  <th class="history-table__num">#</th>
                  <th class="history-table__algo">Algo</th>
                  <th class="history-table__hash">Hash</th>
                  <th class="history-table__time">Time</th>
                  <th class="history-table__actions"></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="5" class="history-popover__empty">No hashes yet.</td>
                </tr>
              </tbody>
            </table>`;
      return;
    }

    const tbody = slice
      .map(
        (e, i) => `
          <tr>
            <td class="history-table__num">${String(start + i + 1).padStart(3, '0')}</td>
            <td class="history-table__algo"><span class="algo-badge" data-algo="${e.algo ?? _DEFAULT_ALGO}">${e.algo ?? _DEFAULT_ALGO}</span></td>
            <td class="history-table__hash" title="${e.hash}"
                data-action="copy-history" data-hash="${e.hash}">${e.hash}<span class="tooltip">Copied!</span></td>
            <td class="history-table__time"><span dir="ltr">${this._formatTs(e.ts)}</span></td>
            <td class="history-table__actions">
              <div class="history-table__action-btns">
                <button class="history-table__action-btn" data-action="copy-history" data-hash="${e.hash}" aria-label="Copy hash">
                  <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                  <span class="tooltip">Copied!</span>
                </button>
                <button class="history-table__action-btn" data-action="download-history" data-hash="${e.hash}" data-algo="${e.algo ?? _DEFAULT_ALGO}" data-filename="${e.filename ?? ''}" aria-label="Download hash">
                  <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  <span class="tooltip">Exported</span>
                </button>
              </div>
            </td>
          </tr>`,
      )
      .join('');

    bodyEl.innerHTML = `
          <table class="history-table" aria-label="Hash history">
            <thead>
              <tr>
                <th class="history-table__num">#</th>
                <th class="history-table__algo">Algo</th>
                <th class="history-table__hash">Hash</th>
                <th class="history-table__time">Time</th>
                <th class="history-table__actions"></th>
              </tr>
            </thead>
            <tbody>${tbody}</tbody>
          </table>`;
  },

  // Renders the footer with pagination + clear button and wires events.
  // Called once per popover on init; re-renders pagination state on each open/page-change.
  _renderFooter(ns, popover) {
    // Remove existing footer if any
    const existing = popover.querySelector('.history-popover__footer');
    if (existing) existing.remove();

    const entries = this.entries(ns);
    const total = entries.length;
    const pages = Math.max(1, Math.ceil(total / this.PAGE_SIZE));
    const page = this._pages[ns];

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
          <button class="history-popover__clear" data-history-clear="${ns}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            Clear
          </button>`;
    popover.appendChild(footer);
  },

  // ── Popover controller ───────────────────────────────────────────────────

  _refreshFns: {}, // keyed by ns; used by record() to live-update open popovers

  initPopover(ns, btnId, popoverId, bodyId) {
    this.load(ns);

    const btn = document.getElementById(btnId);
    const popover = document.getElementById(popoverId);
    const body = document.getElementById(bodyId);

    // Render body + footer and re-wire footer controls (footer is fully replaced each call)
    const refresh = () => {
      this.renderBody(ns, body);
      this._renderFooter(ns, popover);
      // Re-wire hover tooltips on the newly-rendered action buttons
      body.querySelectorAll('.history-table__action-btn[data-action]').forEach((btn) => {
        const label = btn.dataset.action === 'copy-history' ? 'Copy' : 'Download';
        btn.addEventListener('mouseenter', () => Tooltip.show(btn, label));
        btn.addEventListener('mouseleave', () => Tooltip.hide());
      });

      popover.querySelectorAll('.history-pagination__btn').forEach((pbtn) => {
        pbtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pages = Math.max(1, Math.ceil(this.entries(ns).length / this.PAGE_SIZE));
          this._pages[ns] = Math.max(0, Math.min(this._pages[ns] + Number.parseInt(pbtn.dataset.dir, 10), pages - 1));
          refresh();
        });
      });

      const clearBtn = popover.querySelector('[data-history-clear]');
      if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.clear(ns);
          refresh();
        });
      }
    };

    // Expose refresh so record() can call it when the popover is live
    this._refreshFns[ns] = () => {
      if (popover.classList.contains('history-popover--visible')) refresh();
    };

    // Hover tooltip on the history clock button
    btn.addEventListener('mouseenter', () => Tooltip.show(btn, 'History'));
    btn.addEventListener('mouseleave', () => Tooltip.hide());

    const open = () => {
      refresh();
      popover.classList.add('history-popover--visible');
      btn.setAttribute('aria-expanded', 'true');
      document.getElementById('historyBackdrop').classList.add('history-backdrop--visible');
    };
    const close = () => {
      popover.classList.remove('history-popover--visible');
      btn.setAttribute('aria-expanded', 'false');
      const anyOpen = document.querySelector('.history-popover--visible');
      if (!anyOpen) document.getElementById('historyBackdrop').classList.remove('history-backdrop--visible');
    };

    popover.addEventListener('click', (e) => {
      if (e.target.closest('[data-popover-close]')) {
        e.stopPropagation();
        close();
        btn.focus();
      }
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.contains('history-popover--visible') ? close() : open();
    });

    document.addEventListener('click', (e) => {
      if (popover.classList.contains('history-popover--visible') && !popover.contains(e.target) && e.target !== btn)
        close();
    });

    document.getElementById('historyBackdrop').addEventListener('click', () => {
      if (popover.classList.contains('history-popover--visible')) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popover.classList.contains('history-popover--visible')) {
        close();
        btn.focus();
      }
    });

    // Delegated actions on hash cells and action buttons — wired once, works across re-renders
    body.addEventListener('click', async (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const { action, hash } = target.dataset;

      if (action === 'copy-history') {
        e.stopPropagation();
        await Clipboard.copy(hash);
        Tooltip.flash(target);
      } else if (action === 'download-history') {
        e.stopPropagation();
        const algo = target.dataset.algo ?? _DEFAULT_ALGO;
        const ext = algo.toLowerCase().replaceAll('-', '');
        const storedFilename = target.dataset.filename ?? '';
        // Mirror FileSection._onDownload: if a source filename was recorded,
        // use <basename>.<ext>; otherwise fall back to the timestamped default.
        const base = storedFilename
          ? storedFilename.replace(/\.[^.]+$/, '')
          : `${_APP_CONFIG.appName}-${_APP_CONFIG.fileNoun}_${Download.filenameSafeTimestamp()}`;
        Download.trigger(hash, `${base}.${ext}`);
        Tooltip.flash(target);
      }
    });
  },

  // Call after a hash is produced
  record(ns, hash, algo, batchId, filename) {
    this.push(ns, hash, algo, batchId, filename);
    // Live-refresh the popover if it's open (refresh() is a no-op when closed)
    this._refreshFns[ns]?.();
  },
};
