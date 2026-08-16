/** Click behaviour of the rows of a history table (`bodyEl` is re-rendered often, so this
 *  listens on it once). `copyRow(row)` copies the row's hash.
 *
 *  With a mouse (or pen) a click anywhere on the row copies. On touch, where a stray tap while
 *  scrolling is easy, only a tap on the hash itself does. The row's action buttons do their
 *  own thing, so this steps aside over them. */
export function initHistoryRows(bodyEl, copyRow) {
  let pointerType = 'mouse';

  // Pointer events come before the click they accompany, so this is the type of its pointer.
  bodyEl.addEventListener('pointerover', (e) => {
    pointerType = e.pointerType;
  });

  bodyEl.addEventListener('click', (e) => {
    const row = e.target.closest('.history-table__row');
    if (!row || e.target.closest('[data-action]')) return;
    if (pointerType === 'touch' && !e.target.closest('.history-table__hash')) return;
    copyRow(row);
  });
}
