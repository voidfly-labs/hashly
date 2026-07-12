import { Clipboard } from '~core/utils/clipboard.js';

import { Tooltip } from './tooltip.js';

/** Wires a paste button: onText gets the clipboard text, onDenied runs if the
 *  browser refuses. The button is removed where reading isn't supported. */
export function initPasteButton(btn, { onText, onDenied }) {
  if (!btn) return;
  if (!Clipboard.canRead) {
    btn.remove();
    return;
  }
  btn.addEventListener('click', async () => {
    const text = await Clipboard.read();
    if (text === null) onDenied();
    else if (text) onText(text);
  });
  btn.addEventListener('mouseenter', () => Tooltip.show(btn, 'Paste'));
  btn.addEventListener('mouseleave', () => Tooltip.hide());
  btn.addEventListener('focus', () => Tooltip.show(btn, 'Paste'));
  btn.addEventListener('blur', () => Tooltip.hide());
}
