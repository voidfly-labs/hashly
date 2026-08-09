/** Wires the hamburger menu's Help entry to the help popover, and shows it: the entry stays
 *  hidden where there is no popover to open. */
export function initNavHelp(help) {
  const item = document.getElementById('navHelp');
  if (!item || !help) return;
  item.hidden = false;
  item.addEventListener('click', (e) => {
    // The popover closes on a click outside it, and this click would otherwise count as one.
    e.stopPropagation();
    help.open();
  });
}
