// Matches whichever popover is open. The one backdrop under them stays up while any of them is.
export const OPEN_POPOVER = '.history-popover--visible, .help-popover--visible';

const BACKDROP_ID = 'historyBackdrop';
const BACKDROP_VISIBLE_CLASS = 'history-backdrop--visible';

/** The open/close behaviour the page's popovers share: the visible class, `aria-expanded` on the
 *  trigger, the backdrop, a click on the trigger toggling it, a click outside, the backdrop or a
 *  `[data-popover-close]` button closing it, and Escape, which hands focus back to the trigger.
 *
 *  Hooks, for what a popover does of its own: `onOpen` runs before it is shown, `onShown` once it
 *  is (a hidden element can't take focus), `onClose` before it is hidden. `onEscape` runs on Escape
 *  while it is open, and returns true when it backed out of something inside the popover, which
 *  leaves the popover itself open. */
export function createPopover({ trigger, el, visibleClass, onOpen, onShown, onClose, onEscape }) {
  const backdrop = () => document.getElementById(BACKDROP_ID);
  const isOpen = () => el.classList.contains(visibleClass);

  const open = () => {
    onOpen?.();
    el.classList.add(visibleClass);
    onShown?.();
    trigger.setAttribute('aria-expanded', 'true');
    backdrop().classList.add(BACKDROP_VISIBLE_CLASS);
  };

  const close = () => {
    onClose?.();
    el.classList.remove(visibleClass);
    trigger.setAttribute('aria-expanded', 'false');
    if (!document.querySelector(OPEN_POPOVER)) backdrop().classList.remove(BACKDROP_VISIBLE_CLASS);
  };

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-popover-close]')) {
      e.stopPropagation();
      close();
      trigger.focus();
    }
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen() ? close() : open();
  });

  document.addEventListener('click', (e) => {
    if (isOpen() && !el.contains(e.target) && e.target !== trigger) close();
  });

  backdrop().addEventListener('click', () => {
    if (isOpen()) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen()) return;
    if (onEscape?.()) return;
    close();
    trigger.focus();
  });

  return { open, close, isOpen };
}
