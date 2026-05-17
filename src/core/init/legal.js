import { Theme } from '../theme/manager.js';
import { NavMenu } from '../components/nav-menu.js';

function initLegal() {
  Theme.init();
  NavMenu.init();
  document.getElementById('footerYear').textContent = new Date().getFullYear();
}

initLegal();
