import { History, HISTORY_CHANGE } from '~core/components/history.js';

const MAX_SHOWN = 999;

function formatCount(count) {
  return count > MAX_SHOWN ? `${MAX_SHOWN}+` : String(count);
}

/** Shows an entry's count, and hides the entry while there is nothing to open. */
function syncItem(item, count) {
  item.hidden = count === 0;
  item.querySelector('.nav-menu__count').textContent = formatCount(count);
}

/** The group goes with its last entry. */
function syncGroup(group, items) {
  group.hidden = items.every((item) => item.hidden);
}

/** An entry opens its section's history popover. */
function bindItem(item) {
  item.addEventListener('click', (e) => {
    // The popover closes on a click outside it, and this click would otherwise count as one.
    e.stopPropagation();
    History.show(item.dataset.historyNs);
  });
}

/** Wires the hamburger menu's history entries: each opens its section's history popover, shows how
 *  many entries there are, and is hidden while there are none. */
export function initNavHistory() {
  const group = document.getElementById('navHistory');
  if (!group) return;
  const items = [...group.querySelectorAll('[data-history-ns]')];

  for (const item of items) {
    syncItem(item, History.entries(item.dataset.historyNs).length);
    bindItem(item);
  }
  syncGroup(group, items);

  document.addEventListener(HISTORY_CHANGE, ({ detail: { ns, count } }) => {
    const item = items.find((el) => el.dataset.historyNs === ns);
    if (!item) return;
    syncItem(item, count);
    syncGroup(group, items);
  });
}
