import { initButtonTooltip } from '~core/components/button-tooltip.js';

/** Wire the footer's "Report issue" tooltip on `.footer__report`.
 *  Shared by the main app init and the legal-page init — both render the
 *  same footer markup. No-ops if the element isn't present. */
export function initReportTooltip() {
  const reportEl = document.querySelector('.footer__report');
  if (!reportEl) return;
  initButtonTooltip(reportEl, 'Found a bug?');
}
