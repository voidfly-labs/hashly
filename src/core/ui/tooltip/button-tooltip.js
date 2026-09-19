import { Tooltip } from './tooltip.js';

/** Shows `text` (a string, or a function giving it, for a label that changes) as a tooltip on hover and
 *  focus of an icon-only button. A click also hides it:
 *  buttons that vanish once used (clear) never get the mouseleave or blur that would. Pass
 *  `hideOnClick: false` where the click manages the tooltip itself (e.g. flashes "Copied!"). */
export function initButtonTooltip(btn, text, { hideOnClick = true } = {}) {
  if (!btn) return;
  const show = () => Tooltip.show(btn, typeof text === 'function' ? text() : text);
  btn.addEventListener('mouseenter', show);
  btn.addEventListener('mouseleave', () => Tooltip.hide(btn));
  btn.addEventListener('focus', show);
  btn.addEventListener('blur', () => Tooltip.hide(btn));
  if (hideOnClick) btn.addEventListener('click', () => Tooltip.hide(btn));
}
