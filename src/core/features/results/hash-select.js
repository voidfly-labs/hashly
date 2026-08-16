import { copyWithFeedback } from '~core/ui/button/copy-feedback.js';

const ACTIVE_CLASS = 'hash-select';
const HASH_CELL = '.result__hash';

/** True while the key that switches hash cells into selection mode is down:
 *  Ctrl, or ⌘ on a Mac (where Ctrl-click is a right-click). Shift won't do: a
 *  Shift-drag extends whatever is already selected (the textarea's caret, say)
 *  instead of starting at the pointer. */
const isSelectKey = (e) => e.ctrlKey || e.metaKey;

/** The hash cell holding the start of the current selection, if any. */
const selectedCell = () => window.getSelection().anchorNode?.parentElement?.closest(HASH_CELL);

export const HashSelect = {
  // One drag, start to finish: '' (none) → 'selecting' (began with the select key on a
  // hash cell) → 'copied' (its selection was copied; the click that ends the drag must
  // not copy the whole hash over the top).
  _gesture: '',

  /** A click that belongs to selecting, not copying: made with the select key, or
   *  the one that ends a drag whose selection was just copied. */
  isSelectClick(e) {
    return isSelectKey(e) || this._gesture === 'copied';
  },

  /** Hold Ctrl/⌘ and drag across a hash to copy just that part of it (a git-style
   *  short ID, say). While the key is down the page carries `hash-select`, which
   *  makes the hash cells selectable (see core/features/results/result.css); letting go of
   *  the drag copies the selection and flashes the usual "Copied!" tooltip, so
   *  there's no Ctrl+C step. A plain click still copies the whole hash. */
  init() {
    const root = document.documentElement;
    let keyDown = false;

    // A drag that began in selection mode stays in it until it ends, even if the key
    // is let go first: cells turning unselectable mid-drag would empty the selection.
    const refresh = () => root.classList.toggle(ACTIVE_CLASS, keyDown || this._gesture === 'selecting');
    const setGesture = (gesture) => {
      this._gesture = gesture;
      refresh();
    };

    // Read the modifier state off every key event, so combos and releases stay right.
    const onKey = (e) => {
      keyDown = isSelectKey(e);
      refresh();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    // The keyup is lost if focus leaves the page while the key is held.
    window.addEventListener('blur', () => onKey({}));

    document.addEventListener('pointerdown', (e) => {
      const selecting = isSelectKey(e) && e.target.closest(HASH_CELL);
      // Start from nothing: Firefox adds a Ctrl-drag as an extra range, and a click
      // elsewhere should drop a selection left in a cell (unselectable cells wouldn't).
      if (selecting || selectedCell()) window.getSelection().removeAllRanges();
      setGesture(selecting ? 'selecting' : '');
    });

    document.addEventListener('pointerup', () => {
      if (this._gesture !== 'selecting') return;
      const cell = selectedCell();
      const text = window.getSelection().toString();
      if (cell && text) {
        copyWithFeedback(text, { anchor: cell });
      }
      setGesture(cell && text ? 'copied' : '');
    });

    document.addEventListener('pointercancel', () => setGesture(''));
  },
};
