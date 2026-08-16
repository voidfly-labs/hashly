import { Theme } from '~core/app/theme/manager.js';
import { BackToTop } from '~core/layout/back-to-top/back-to-top.js';
import { initReportTooltip } from '~core/layout/footer/report.js';
import { initSocialTooltips } from '~core/layout/footer/social.js';
import { initVersionTooltip } from '~core/layout/footer/version.js';
import { initNavCurrent } from '~core/layout/nav/nav-current.js';
import { NavMenu } from '~core/layout/nav/nav-menu.js';

function initLegal() {
  Theme.init();
  NavMenu.init();
  initNavCurrent();
  BackToTop.init();
  document.getElementById('footerYear').textContent = new Date().getFullYear();
  initReportTooltip();
  initSocialTooltips();
  initVersionTooltip();
}

initLegal();
