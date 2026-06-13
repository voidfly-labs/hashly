import { NavMenu } from '../components/nav-menu.js';
import { initReportTooltip } from '../components/report.js';
import { initSocialTooltips } from '../components/social.js';
import { initVersionTooltip } from '../components/version.js';
import { Theme } from '../theme/manager.js';

function initLegal() {
  Theme.init();
  NavMenu.init();
  document.getElementById('footerYear').textContent = new Date().getFullYear();
  initReportTooltip();
  initSocialTooltips();
  initVersionTooltip();
}

initLegal();
