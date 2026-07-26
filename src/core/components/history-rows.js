import { TAP_TOOLTIP_MS, Tooltip } from './tooltip.js';

/** Pointer behaviour of the rows of a history table (`bodyEl` is re-rendered often, so this
 *  listens on it once). `describeRow(row)` returns the text to show for a row, or '' for none;
 *  `copyRow(row)` copies the row's hash.
 *
 *  With a mouse (or pen) the tooltip follows the hover and a click anywhere on the row copies.
 *  On touch there is no hover and a stray tap shouldn't copy, so a tap shows the tooltip for a
 *  few seconds instead. The row's action buttons do their own thing (and show their own
 *  tooltips), so all of this steps aside over them.
 *
 *  Returns `reset()`, to call whenever `bodyEl` is re-rendered. */
export function initHistoryRows(bodyEl, describeRow, copyRow) {
  let shown = false;
  let pointerType = 'mouse';

  const hide = () => {
    if (shown) Tooltip.hide();
    shown = false;
  };

  // Pointer events come before the mouse events they accompany, so this is the type of the
  // pointer behind the mouseover below (a tap also produces emulated mouse events).
  bodyEl.addEventListener('pointerover', (e) => {
    pointerType = e.pointerType;
  });

  // mouseover, not pointerover: it fires after the previous element's mouseleave, which is
  // what hides an action button's tooltip, so ours can't be hidden right after it is shown.
  bodyEl.addEventListener('mouseover', (e) => {
    if (pointerType === 'touch') return;
    const row = e.target.closest('.history-table__row');
    if (!row || e.target.closest('.history-table__actions')) {
      hide();
      return;
    }
    if (shown) return;
    const text = describeRow(row);
    if (!text) return;
    Tooltip.show(row, text, undefined, { wrap: true });
    shown = true;
  });

  bodyEl.addEventListener('click', (e) => {
    const row = e.target.closest('.history-table__row');
    if (!row || e.target.closest('[data-action]')) return;
    if (pointerType !== 'touch') {
      copyRow(row);
      return;
    }
    const text = describeRow(row);
    if (!text) return;
    Tooltip.show(row, text, TAP_TOOLTIP_MS, { wrap: true });
    shown = true;
  });

  // Moving from one row to the next passes through the gap between them, so this also
  // makes the tooltip follow the pointer row by row.
  bodyEl.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget || !e.target.closest('.history-table__row')?.contains(e.relatedTarget)) hide();
  });

  return hide;
}
