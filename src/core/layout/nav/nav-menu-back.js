// State of the history entry an open menu pushes, to tell it from the page's own after a reload.
const MARKER = 'navMenuOpen';

/** Lets the Back button close the open menu instead of leaving the page. Opening `push`es a history
 *  entry and Back pops it, which calls `onBack`. Closing any other way `release`s the entry. */
export function createBackStep(onBack) {
  let pushed = false;
  let popping = null;

  // A reload keeps the entry's state, but not the menu that pushed it.
  if (history.state?.[MARKER]) history.replaceState(null, '');

  window.addEventListener('popstate', () => {
    if (popping) {
      const next = popping;
      popping = null;
      next();
    } else if (pushed) {
      pushed = false;
      onBack();
    }
  });

  return {
    get active() {
      return pushed;
    },

    push() {
      if (pushed) return;
      history.pushState({ [MARKER]: true }, '');
      pushed = true;
    },

    /** Pops the entry, then calls `then` (a link that was clicked in the menu is followed from there,
     *  so it doesn't leave the menu's entry behind it in the history). */
    release(then) {
      if (!pushed) {
        then?.();
        return;
      }
      pushed = false;
      popping = then ?? (() => {});
      history.back();
    },
  };
}
