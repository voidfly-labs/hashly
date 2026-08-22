import { exportHistoryCsv } from '~core/features/history/export/history-csv.js';
import { formatTimestamp } from '~core/features/history/export/history-time.js';
import { PAGE_SIZE } from '~core/features/history/list/history-list.js';
import { createHistorySearch } from '~core/features/history/search/history-search.js';
import { initHistoryRows } from '~core/features/history/table/history-rows.js';
import { renderHistoryTable } from '~core/features/history/table/history-table.js';
import { downloadDigest } from '~core/features/results/export/download-digest.js';
import { slideIn } from '~core/lib/slide-in.js';
import { takesText } from '~core/lib/text-field.js';
import { Checkmark } from '~core/ui/button/checkmark.js';
import { copyWithFeedback } from '~core/ui/button/copy-feedback.js';
import { createPopover } from '~core/ui/popover.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

import { renderHistoryFooter } from './history-footer.js';

const VISIBLE_CLASS = 'history-popover--visible';

/** The popover of one section's history (`ns`: 'text', 'file'): its search field, the table of the
 *  current page and its footer, opened by `trigger`. `store` and `list` (see ../store and ../list) are
 *  what it shows; `appConfig` and `defaultAlgo` are the app's; `onClear()` empties the history.
 *
 *  Returns `{ open, close, refreshIfVisible }`. A batch records one entry per algorithm in a row, so
 *  `refreshIfVisible` redraws on the next frame, once for all of them, and only while it is open. */
export function createHistoryPopover({ ns, trigger, popover, body, store, list, appConfig, defaultAlgo, onClear }) {
  // The tallest the body has been since the popover opened: it keeps that height, so the popover
  // doesn't shrink and grow as pages with fewer rows come and go.
  let tallest = 0;
  // Takes the Clear button of the current footer out of its "Confirm" state.
  let disarmClear = null;

  const isVisible = () => popover.classList.contains(VISIBLE_CLASS);

  async function copyRow(row) {
    const entry = list.rowAt(Number(row.dataset.i));
    if (!entry) return;
    await copyWithFeedback(entry.hash, { anchor: row.querySelector('.history-table__hash') });
  }

  // The body is re-rendered often; this listens on it once.
  initHistoryRows(body, copyRow);

  const search = createHistorySearch({
    ns,
    onChange: (query) => {
      list.setQuery(query);
      refresh();
    },
  });
  popover.insertBefore(search.el, body);

  function renderBody() {
    const { rows, start } = list.currentPage();
    body.classList.toggle('history-popover__body--empty', !rows.length);
    body.innerHTML = renderHistoryTable(rows, {
      start,
      defaultAlgo,
      formatTs: formatTimestamp,
      sourceOf: (e) => store.sourceOf(e),
      sourceIsFile: ns === 'file',
      query: list.query,
      terms: list.terms,
    });
    // Hover tooltips on the newly rendered action buttons. Their click flashes "Copied!" /
    // "Exported", so it must not hide the tooltip as well.
    body.querySelectorAll('.history-table__action-btn[data-action]').forEach((btn) => {
      const label = btn.dataset.action === 'copy-history' ? 'Copy' : 'Download';
      initButtonTooltip(btn, label, { hideOnClick: false });
    });
  }

  function renderFooter() {
    const total = list.visible().length;
    disarmClear =
      renderHistoryFooter(popover, {
        ns,
        page: list.page,
        pages: list.pageCount(),
        total,
        searching: list.searching,
        onPage(direction) {
          list.step(direction);
          refresh();
          slideIn(body.querySelector('.history-table'), direction);
        },
        onExport: () =>
          exportHistoryCsv({
            entries: list.visible(),
            kind: ns,
            appName: appConfig.appName,
            defaultAlgo,
            sourceOf: (e) => store.sourceOf(e),
          }),
        onClear() {
          onClear();
          tallest = 0;
          refresh();
        },
      }) ?? disarmClear;
  }

  /** Renders the search, the body and the footer for the current state. */
  function refresh() {
    const total = store.entries().length;
    // A history of one page has nothing to search, so the field is only there for a longer one.
    if (total <= PAGE_SIZE && list.searching) {
      list.setQuery('');
      search.reset();
    }
    search.update({ shown: total > PAGE_SIZE, matched: list.visible().length, total });
    body.style.minHeight = `${tallest}px`;
    renderBody();
    renderFooter();
    // Measured with the footer in place: on a short screen the body is what gives way to it.
    tallest = Math.max(tallest, body.offsetHeight);
  }

  let refreshQueued = false;
  function refreshIfVisible() {
    if (refreshQueued || !isVisible()) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      if (isVisible()) refresh();
    });
  }

  // Hover tooltip on the history clock button
  trigger.addEventListener('mouseenter', () => Tooltip.show(trigger, 'History'));
  trigger.addEventListener('mouseleave', () => Tooltip.hide());

  const { open, close } = createPopover({
    trigger,
    el: popover,
    visibleClass: VISIBLE_CLASS,
    onOpen: () => {
      tallest = 0;
      list.setQuery('');
      search.reset();
      refresh();
    },
    onShown: () => search.focus(),
    onClose: () => disarmClear?.(),
    // Escape backs out of the innermost thing first: an armed Clear, then a search, then the popover.
    onEscape: () => {
      if (disarmClear?.()) return true;
      if (!search.value()) return false;
      search.reset();
      list.setQuery('');
      refresh();
      return true;
    },
  });

  document.addEventListener('keydown', (e) => {
    if (!isVisible()) return;
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
      list.setQuery('');
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
      downloadDigest(hash, target.dataset.algo ?? defaultAlgo, target.dataset.filename ?? '', appConfig);
      Tooltip.flash(target);
      Checkmark.flash(target);
    }
  });

  return { open, close, refreshIfVisible };
}
