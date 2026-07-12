import { initReportTooltip } from '~core/layout/footer/report.js';
import { initSocialTooltips } from '~core/layout/footer/social.js';
import { initVersionTooltip } from '~core/layout/footer/version.js';
import { NavMenu } from '~core/layout/nav/nav-menu.js';
import { Theme } from '~core/theme/manager.js';

function initLegal() {
  Theme.init();
  NavMenu.init();
  document.getElementById('footerYear').textContent = new Date().getFullYear();
  initReportTooltip();
  initSocialTooltips();
  initVersionTooltip();
}

initLegal();
