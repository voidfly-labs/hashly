import { Theme } from '../theme/manager.js';

function initLegal() {
  Theme.init();
  document.getElementById('footerYear').textContent = new Date().getFullYear();
}

initLegal();
