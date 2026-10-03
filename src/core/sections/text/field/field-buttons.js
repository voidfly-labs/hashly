import { initPasteButton } from '~core/features/input/paste-button.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

/** The two buttons in the corner of the text field (see text.html): paste while it is empty, clear
 *  once it has content. `onClear({ focus })` and `onPaste(text)` are what they ask for, `onPasteDenied()`
 *  what happens when the browser refuses to hand over the clipboard.
 *
 *  Returns `{ setClearVisible }`: the ✕ shows when there is something to clear (it has no disabled
 *  state, as it has no meaningful "empty" affordance), and the paste button takes its place otherwise. */
export function createFieldButtons({ onClear, onPaste, onPasteDenied }) {
  const clearBtn = document.getElementById('textInputClear');

  clearBtn.addEventListener('click', () => onClear({ focus: true }));
  initButtonTooltip(clearBtn, 'Clear');

  initPasteButton(document.getElementById('textPasteBtn'), { onText: onPaste, onDenied: onPasteDenied });

  return {
    setClearVisible: (visible) => clearBtn.classList.toggle('text-input__clear--visible', visible),
  };
}
