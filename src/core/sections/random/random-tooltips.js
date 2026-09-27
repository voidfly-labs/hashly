import { Tooltip } from '~core/ui/tooltip/tooltip.js';

/** Hover and focus tooltips for the rows of `list`, one set of listeners for all of them: each element
 *  with a `data-tip` shows that text. Copy and Download flash their own "Copied!" / "Exported" on a
 *  click, so only the badge's tooltip is hidden by one. */
export function initRandomTooltips(list) {
  const tipped = (e) => e.target.closest?.('[data-tip]');
  const show = (e) => {
    const el = tipped(e);
    if (el) Tooltip.show(el, el.dataset.tip);
  };
  const hide = (e) => {
    const el = tipped(e);
    if (el && !el.contains(e.relatedTarget)) Tooltip.hide(el);
  };

  list.addEventListener('mouseover', show);
  list.addEventListener('mouseout', hide);
  list.addEventListener('focusin', show);
  list.addEventListener('focusout', hide);
  list.addEventListener('click', (e) => {
    const el = tipped(e);
    if (el?.classList.contains('algo-badge')) Tooltip.hide(el);
  });
}
