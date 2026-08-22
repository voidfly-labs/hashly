import { iconHref } from '~core/lib/icon.js';
import { Checkmark } from '~core/ui/button/checkmark.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

import { initConfirmClear } from './confirm-clear.js';

const footerMarkup = ({ ns, page, pages, total, searching }) => `
          <div class="history-pagination" role="group" aria-label="History pagination">
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

/** (Re)builds the footer of a history `popover`: the pagination, the CSV export and the two-click
 *  Clear, wired to `onPage(direction)`, `onExport()` and `onClear()`. `page` is 0-based, `total` is how
 *  many entries the list has (after a search), and `searching` says there is one: Clear deletes the
 *  whole history, which is not what a search seems to show, so it is off then. Returns the new Clear
 *  button's `disarm()` (see ./confirm-clear.js), or null if there is none. */
export function renderHistoryFooter(popover, { ns, page, pages, total, searching, onPage, onExport, onClear }) {
  popover.querySelector('.history-popover__footer')?.remove();

  const footer = document.createElement('div');
  footer.className = 'history-popover__footer';
  footer.innerHTML = footerMarkup({ ns, page, pages, total, searching });
  popover.appendChild(footer);

  footer.querySelectorAll('.history-pagination__btn').forEach((btn) => {
    btn.addEventListener('mouseenter', () => Tooltip.show(btn, btn.dataset.dir === '-1' ? 'Previous' : 'Next'));
    btn.addEventListener('mouseleave', () => Tooltip.hide());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      Tooltip.hide(); // the footer is rebuilt by the page change, so no mouseleave comes for this button
      onPage(Number.parseInt(btn.dataset.dir, 10));
    });
  });

  const exportBtn = footer.querySelector('[data-history-export]');
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onExport();
    Tooltip.flash(exportBtn);
    Checkmark.flash(exportBtn);
  });

  const clearBtn = footer.querySelector('[data-history-clear]');
  return clearBtn ? initConfirmClear(clearBtn, onClear) : null;
}
