/** Wires a hamburger menu entry (`itemId`: Help, Settings) to its popover, and shows it: the entry
 *  stays hidden where there is no popover to open. */
export function initNavPopover(itemId, popover) {
  const item = document.getElementById(itemId);
  if (!item || !popover) return;
  item.hidden = false;
  item.addEventListener('click', (e) => {
    // The popover closes on a click outside it, and this click would otherwise count as one.
    e.stopPropagation();
    popover.open();
  });
}
