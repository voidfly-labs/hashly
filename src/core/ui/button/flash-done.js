import { Tooltip } from '~core/ui/tooltip/tooltip.js';

import { Checkmark } from './checkmark.js';

/** Confirms an action that has no feedback of its own (a download): the button's tooltip shows
 *  and its icon turns into a checkmark for a moment. */
export function flashDone(button) {
  Tooltip.flash(button);
  Checkmark.flash(button);
}
