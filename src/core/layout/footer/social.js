import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

/** Wire hover/focus tooltips for the footer's social icon links
 *  (`.footer__social-icon[aria-label]`), reusing each link's own aria-label
 *  as the tooltip text. Shared by the main app init and the legal-page init
 *  — both render the same footer markup. No-ops if none are present. */
export function initSocialTooltips() {
  const links = document.querySelectorAll('.footer__social-icon[aria-label]');
  for (const link of links) {
    initButtonTooltip(link, link.getAttribute('aria-label'));
  }
}
