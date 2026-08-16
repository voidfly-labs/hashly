import { takesText } from '~core/lib/text-field.js';

// Mouse-and-keyboard devices only. On a phone or tablet a key press means an on-screen
// keyboard is already up for something else, and focusing would raise it uninvited.
const KEYBOARD_DEVICE = '(hover: hover) and (pointer: fine)';

// Controls with their own use for keys, or panels that own the keyboard while open.
const OWNS_KEYS = 'select, .history-popover, .help-popover';

/** Typing anywhere on the page starts typing into the text input: `onType(char)`
 *  gets the first character, and the keys after it land in the (now focused) input
 *  as usual. Only plain printable characters count. Modified keys (shortcuts, the
 *  Ctrl/⌘ hash selection), Space, Enter, Tab, Escape and arrows are left to the
 *  page, and so is anything typed in a field or a control that uses keys itself. */
export function initTypeToFocus({ onType }) {
  const keyboard = window.matchMedia(KEYBOARD_DEVICE);

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.isComposing) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return; // also AltGr, which reports Ctrl+Alt
    if (e.key.length !== 1 || e.key === ' ') return;
    if (!keyboard.matches || takesText(e.target) || e.target.closest?.(OWNS_KEYS)) return;

    e.preventDefault(); // onType inserts the character itself, so it isn't typed twice
    onType(e.key);
  });
}
