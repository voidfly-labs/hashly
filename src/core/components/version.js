import { Tooltip } from './tooltip.js';

/** Wire the footer's build-date tooltip on `.footer__version[data-build-date]`.
 *  Shared by the main app init and the legal-page init — both render the same
 *  footer markup. No-ops if the element isn't present. */
export function initVersionTooltip() {
  const versionEl = document.querySelector('.footer__version[data-build-date]');
  if (!versionEl) return;
  const tip = `Built on ${versionEl.dataset.buildDate}`;
  versionEl.addEventListener('mouseenter', () => Tooltip.show(versionEl, tip));
  versionEl.addEventListener('mouseleave', () => Tooltip.hide());
  versionEl.addEventListener('click', () => Tooltip.show(versionEl, tip));
  versionEl.addEventListener('focus', () => Tooltip.show(versionEl, tip));
  versionEl.addEventListener('blur', () => Tooltip.hide());
}
