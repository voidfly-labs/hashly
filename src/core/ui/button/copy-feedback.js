import { Clipboard } from '~core/lib/clipboard.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

import { Checkmark } from './checkmark.js';

/** Copies `text` and says how it went: "Copied!" (or the anchor's own tooltip text) on success,
 *  "Copy failed" when the browser refused. `anchor` is where the tooltip appears; `button`, if given,
 *  also morphs its icon into a checkmark on success. Resolves to whether the copy worked. */
export async function copyWithFeedback(text, { anchor, button } = {}) {
  const copied = await Clipboard.copy(text);
  Tooltip.flash(anchor ?? button, copied ? undefined : 'Copy failed');
  if (copied && button) Checkmark.flash(button);
  return copied;
}
