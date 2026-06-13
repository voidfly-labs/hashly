import { AlgoSpotlight } from '../components/algo-spotlight.js';
import { History } from '../components/history.js';
import { NavMenu } from '../components/nav-menu.js';
import { Permalink } from '../components/permalink.js';
import { initReportTooltip } from '../components/report.js';
import { initSectionCollapse } from '../components/section-collapse.js';
import { initSocialTooltips } from '../components/social.js';
import { Tooltip } from '../components/tooltip.js';
import { initVersionTooltip } from '../components/version.js';
import { FaqSection } from '../sections/faq.js';
import { FileSection } from '../sections/file.js';
import { RandomSection } from '../sections/random.js';
import { TextSection } from '../sections/text.js';
import { Theme } from '../theme/manager.js';

function _initToggleAllBtn(btnId, section, ALGORITHMS) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.addEventListener('click', () => section._toggleAll({ refreshTooltip: true }));
  btn.addEventListener('mouseenter', () => {
    const allVisible = ALGORITHMS.every((a) => !section.hiddenAlgos.has(a.id));
    Tooltip.show(btn, allVisible ? 'Hide all' : 'Show all');
  });
  btn.addEventListener('mouseleave', () => Tooltip.hide());
  btn.addEventListener('focus', () => {
    const allVisible = ALGORITHMS.every((a) => !section.hiddenAlgos.has(a.id));
    Tooltip.show(btn, allVisible ? 'Hide all' : 'Show all');
  });
  btn.addEventListener('blur', () => Tooltip.hide());
}

export function initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher }) {
  document.addEventListener('DOMContentLoaded', () => {
    History.init({ APP_CONFIG, DEFAULT_ALGO, ALGO_ORDER });
    Theme.init();
    NavMenu.init();
    FaqSection.init();
    History.initPopover('text', 'textHistoryBtn', 'textHistoryPopover', 'textHistoryBody');
    History.initPopover('file', 'fileHistoryBtn', 'fileHistoryPopover', 'fileHistoryBody');
    TextSection.init({ APP_CONFIG, ALGORITHMS, Hasher });
    Permalink.init();
    if (Permalink.restoreFromUrl()) TextSection.onInput();
    FileSection.init({ APP_CONFIG, ALGORITHMS, Hasher });
    _initToggleAllBtn('textToggleAllBtn', TextSection, ALGORITHMS);
    _initToggleAllBtn('fileToggleAllBtn', FileSection, ALGORITHMS);
    RandomSection.init({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
    AlgoSpotlight.init(ALGORITHMS, [TextSection, FileSection]);
    initSectionCollapse();

    const yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    initReportTooltip();
    initSocialTooltips();
    initVersionTooltip();
  });
}
