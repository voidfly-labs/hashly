import { MOBILE_QUERY } from '~core/lib/viewport.js';
import { OPEN_POPOVER } from '~core/ui/popover/popover.js';

import { createBackStep } from './nav-menu-back.js';
import { initSwipeUp } from './nav-menu-swipe.js';

// What closes the menu when clicked: the section links, and the history entries (see nav-history.js).
const CLOSING_ITEMS = '.header__nav-link, .nav-menu__action';

/** Dims the page under the drawer. It lives on <body>, not in the header: the header's
 *  backdrop-filter would make it the containing block of a fixed child. */
function createBackdrop() {
  const backdrop = document.createElement('div');
  backdrop.className = 'nav-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.appendChild(backdrop);
  return backdrop;
}

/** A click the browser follows in this tab: not a new-tab or new-window one. */
function isPlainClick(e) {
  return !e.defaultPrevented && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
}

export const NavMenu = {
  init() {
    const toggle = document.getElementById('navToggle');
    const header = toggle?.closest('.header');
    const nav = document.getElementById('navMenu');
    if (!toggle || !header || !nav) return;

    const backdrop = createBackdrop();
    const isOpen = () => header.classList.contains('is-open');

    const setOpen = (open) => {
      header.classList.toggle('is-open', open);
      // Locks the page's scroll under the drawer (nav-menu.css).
      document.documentElement.classList.toggle('is-nav-open', open);
      backdrop.classList.toggle('nav-backdrop--visible', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    };

    // `keepFocus`: the caller moves on to something that takes focus itself. `then` runs once the
    // menu's history entry is gone.
    const close = ({ keepFocus = false, then } = {}) => {
      if (!isOpen()) return;
      setOpen(false);
      // The drawer is hidden now: focus left in it would be lost.
      if (!keepFocus && nav.contains(document.activeElement)) toggle.focus();
      back.release(then);
    };

    const back = createBackStep(() => close());

    const open = (byKeyboard) => {
      setOpen(true);
      back.push();
      if (byKeyboard) nav.querySelector('.header__nav-link')?.focus();
    };

    // A click with no pointer (detail 0) is the keyboard's.
    toggle.addEventListener('click', (e) => (isOpen() ? close() : open(e.detail === 0)));
    backdrop.addEventListener('click', () => close());

    nav.querySelectorAll(CLOSING_ITEMS).forEach((item) =>
      item.addEventListener('click', (e) => {
        if (!isOpen()) return;
        const follows = item.tagName === 'A' && isPlainClick(e);
        if (follows && back.active) {
          // Follow the link only after the menu's entry is popped, so Back from where it leads
          // returns to the page, not to the same page with the menu's entry in between.
          e.preventDefault();
          close({ keepFocus: true, then: () => item.click() });
        } else {
          close({ keepFocus: item.tagName === 'A' });
        }
      }),
    );

    initSwipeUp(backdrop, () => close());
    // A drawer taller than the screen scrolls: swiping up dismisses it only once it is at its end.
    initSwipeUp(
      nav,
      () => close(),
      () => nav.scrollTop + nav.clientHeight >= nav.scrollHeight - 1,
    );

    // Past the breakpoint the drawer is gone, and an open state would come back with it.
    window.matchMedia(MOBILE_QUERY).addEventListener('change', (e) => {
      if (!e.matches) close({ keepFocus: true });
    });

    // Coming back to the page from the back-forward cache must not show a menu left open.
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) close({ keepFocus: true });
    });

    // Escape closes the menu and hands focus back to its button, so the keyboard isn't left in a
    // drawer that is gone.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !isOpen()) return;
      // A popover opened from the menu has its own Escape.
      if (document.querySelector(OPEN_POPOVER)) return;
      close();
      toggle.focus();
    });
  },
};
