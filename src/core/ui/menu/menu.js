import { el } from '~core/lib/dom.js';
import { svgIcon } from '~core/lib/icon.js';

const ITEM = '.menu__item';

function createItem({ value, label, hint }) {
  const item = el('button', 'menu__item');
  item.type = 'button';
  item.setAttribute('role', 'menuitemradio');
  item.setAttribute('aria-checked', 'false');
  item.dataset.value = value;
  item.append(svgIcon('check'), el('span', 'menu__label', label));
  if (hint) item.append(el('span', 'menu__hint', hint));
  return item;
}

/** A small menu that opens under `trigger` (a button) and closes on a pick, a click elsewhere,
 *  Escape (focus goes back to the trigger), Tab, a scroll or a resize. `items` are
 *  `{ value, label, hint }` (`value` a string, `label` and `hint` plain text); `getCurrent()` says which
 *  value to mark; `onSelect(value)` runs on a pick. The menu is named after the trigger's `aria-label`.
 *
 *  It is a `position: fixed` element of the page's body, so no clipping ancestor (a popover) cuts it
 *  off. A click on it never reaches the document, as a popover would take it for a click outside, and
 *  Escape never reaches the popover under it. Opens above the trigger when there is no room below. */
export function createMenu({ trigger, items, onSelect, getCurrent = () => null }) {
  const menu = el('div', 'menu');
  menu.setAttribute('role', 'menu');
  const name = trigger.getAttribute('aria-label');
  if (name) menu.setAttribute('aria-label', name);
  menu.hidden = true;
  menu.append(...items.map(createItem));
  document.body.appendChild(menu);

  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');

  const buttons = () => [...menu.querySelectorAll(ITEM)];
  const isOpen = () => !menu.hidden;

  function place() {
    const gap = 4;
    const edge = 8;
    const at = trigger.getBoundingClientRect();
    const { width, height } = menu.getBoundingClientRect();
    const below = at.bottom + gap;
    const top =
      below + height > window.innerHeight - edge && at.top - gap - height >= edge ? at.top - gap - height : below;
    const left = Math.min(Math.max(edge, at.right - width), window.innerWidth - width - edge);
    menu.style.top = `${Math.round(top)}px`;
    menu.style.left = `${Math.round(left)}px`;
  }

  function close({ refocus = false } = {}) {
    if (!isOpen()) return;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('resize', onDismiss);
    window.removeEventListener('scroll', onDismiss, true);
    if (refocus) trigger.focus();
  }

  function open() {
    const current = getCurrent();
    buttons().forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === current)));
    menu.hidden = false;
    place();
    trigger.setAttribute('aria-expanded', 'true');
    (menu.querySelector('[aria-checked="true"]') ?? buttons()[0]).focus({ preventScroll: true });
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('resize', onDismiss);
    window.addEventListener('scroll', onDismiss, true);
  }

  // Clicks on the menu and on its trigger stop there (below), so one that gets here is outside.
  function onDocumentClick() {
    close();
  }

  // A scroll inside the menu itself must not dismiss it.
  function onDismiss(e) {
    if (e.target !== menu && !menu.contains(e.target)) close();
  }

  function onKeydown(e) {
    const stops = buttons();
    const at = stops.indexOf(document.activeElement);
    const focus = (i) => {
      e.preventDefault();
      stops[(i + stops.length) % stops.length].focus({ preventScroll: true });
    };
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        e.stopPropagation(); // a popover around the trigger stays open
        close({ refocus: true });
        break;
      case 'Tab':
        close();
        break;
      case 'ArrowDown':
        focus(at + 1);
        break;
      case 'ArrowUp':
        focus(at < 0 ? -1 : at - 1);
        break;
      case 'Home':
        focus(0);
        break;
      case 'End':
        focus(-1);
        break;
      default:
    }
  }

  menu.addEventListener('click', (e) => {
    e.stopPropagation();
    const item = e.target.closest(ITEM);
    if (!item) return;
    close({ refocus: true });
    onSelect(item.dataset.value);
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen()) close();
    else open();
  });

  trigger.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    if (!isOpen()) open();
  });

  return { open, close, isOpen };
}
