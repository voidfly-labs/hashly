import { createPopover } from './popover.js';
import { Tooltip } from './tooltip.js';

/** Wires a .help-btn to its popover (see templates/components/help-popover.html). Returns the
 *  popover's controller, or null when either is missing from the page. */
export function createHelpPopover(buttonId, popoverId) {
  const btn = document.getElementById(buttonId);
  const popover = document.getElementById(popoverId);
  if (!btn || !popover) return null;

  const help = createPopover({ trigger: btn, el: popover, visibleClass: 'help-popover--visible' });

  btn.addEventListener('mouseenter', () => Tooltip.show(btn, 'Help'));
  btn.addEventListener('mouseleave', () => Tooltip.hide());

  // A link out of the popover (to the FAQ) closes it, but leaves focus to the page it goes to.
  popover.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', () => help.close()));

  return help;
}
