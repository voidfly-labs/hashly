import { Clipboard } from '~core/lib/clipboard.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

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
  initButtonTooltip(btn, 'Paste');
}
