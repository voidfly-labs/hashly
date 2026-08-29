import { iconHref } from '~core/lib/icon.js';
import { Checkmark } from '~core/ui/button/checkmark.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

import { initConfirmClear } from './confirm-clear.js';

const footerMarkup = (ns) => `
          <div class="history-pagination" role="group" aria-label="History pagination">
            <button class="history-pagination__btn" data-dir="-1" aria-label="Previous page">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
            <span class="history-pagination__info"></span>
            <button class="history-pagination__btn" data-dir="1" aria-label="Next page">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>
          </div>
          <div class="history-popover__footer-actions">
            <button class="history-popover__export" data-history-export aria-label="Export as CSV" type="button">
              <svg class="icon-action" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('download')}"></use></svg>
              <svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('check')}"></use></svg>
              <span class="history-popover__export-label">Export<span class="history-popover__export-suffix"> CSV</span></span>
              <span class="tooltip">Exported</span>
            </button>
            <button class="history-popover__clear" data-history-clear="${ns}">
              <span class="history-popover__clear-face"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('delete')}"></use></svg>Clear</span>
              <span class="history-popover__clear-face history-popover__clear-face--confirm"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('delete')}"></use></svg>Confirm</span>
            </button>
          </div>`;

const CLEAR_SEARCHING_TITLE = 'Clear the search to delete the history';

/** Builds the footer of a history `popover` once: the pagination, the CSV export and the two-click
 *  Clear, wired to `onPage(direction)`, `onExport()` and `onClear()`. Returns `{ update, disarm }`.
 *
 *  `update({ page, pages, total, searching })` brings it in line with the list: `page` is 0-based,
 *  `total` is how many entries the list has (after a search), and `searching` says there is one:
 *  Clear deletes the whole history, which is not what a search seems to show, so it is off then.
 *  The controls stay in place, so focus stays on the one that has it; an arrow that is now disabled
 *  (the first or last page reached) hands it to the first enabled control, as a disabled button
 *  can't keep it. An update also takes Clear out of its "Confirm" state. `disarm()` does that
 *  alone (see ./confirm-clear.js) and returns whether Clear was armed. */
export function createHistoryFooter(popover, { ns, onPage, onExport, onClear }) {
  const footer = document.createElement('div');
  footer.className = 'history-popover__footer';
  footer.innerHTML = footerMarkup(ns);
  popover.appendChild(footer);

  const [prev, next] = footer.querySelectorAll('.history-pagination__btn');
  const info = footer.querySelector('.history-pagination__info');
  const exportBtn = footer.querySelector('[data-history-export]');
  const clearBtn = footer.querySelector('[data-history-clear]');

  [prev, next].forEach((btn) => {
    btn.addEventListener('mouseenter', () => Tooltip.show(btn, btn.dataset.dir === '-1' ? 'Previous' : 'Next'));
    btn.addEventListener('mouseleave', () => Tooltip.hide());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      Tooltip.hide(); // the page change redraws the footer under the pointer, so no mouseleave comes
      onPage(Number.parseInt(btn.dataset.dir, 10));
    });
  });

  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onExport();
    Tooltip.flash(exportBtn);
    Checkmark.flash(exportBtn);
  });

  const disarm = initConfirmClear(clearBtn, onClear);

  return {
    disarm,

    update({ page, pages, total, searching }) {
      const focused = footer.contains(document.activeElement) ? document.activeElement : null;
      disarm();
      prev.disabled = page === 0;
      next.disabled = page >= pages - 1;
      info.textContent = total ? `${page + 1} / ${pages}` : '—';
      exportBtn.disabled = !total;
      clearBtn.disabled = searching;
      if (searching) clearBtn.title = CLEAR_SEARCHING_TITLE;
      else clearBtn.removeAttribute('title');
      if (focused?.disabled) footer.querySelector('button:not(:disabled)')?.focus();
    },
  };
}
