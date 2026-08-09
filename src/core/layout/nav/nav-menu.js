import { OPEN_POPOVER } from '~core/components/popover.js';

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
      backdrop.classList.toggle('nav-backdrop--visible', open);
      toggle.setAttribute('aria-expanded', String(open));
      nav.setAttribute('aria-hidden', String(!open));
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    };

    toggle.addEventListener('click', () => setOpen(!isOpen()));
    backdrop.addEventListener('click', () => setOpen(false));
    nav.querySelectorAll(CLOSING_ITEMS).forEach((item) => item.addEventListener('click', () => setOpen(false)));

    document.addEventListener('click', (e) => {
      if (isOpen() && !header.contains(e.target)) setOpen(false);
    });

    // Escape closes the menu and hands focus back to its button, so the keyboard isn't left in a
    // drawer that is gone.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !isOpen()) return;
      // A popover opened from the menu has its own Escape.
      if (document.querySelector(OPEN_POPOVER)) return;
      setOpen(false);
      toggle.focus();
    });
  },
};
