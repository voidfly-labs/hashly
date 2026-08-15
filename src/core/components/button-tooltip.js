import { Tooltip } from './tooltip.js';

/** Shows `text` as a tooltip on hover and focus of an icon-only button. A click also hides it:
 *  buttons that vanish once used (clear) never get the mouseleave or blur that would. Pass
 *  `hideOnClick: false` where the click manages the tooltip itself (e.g. flashes "Copied!"). */
export function initButtonTooltip(btn, text, { hideOnClick = true } = {}) {
  if (!btn) return;
  btn.addEventListener('mouseenter', () => Tooltip.show(btn, text));
  btn.addEventListener('mouseleave', () => Tooltip.hide());
  btn.addEventListener('focus', () => Tooltip.show(btn, text));
  btn.addEventListener('blur', () => Tooltip.hide());
  if (hideOnClick) btn.addEventListener('click', () => Tooltip.hide());
}
