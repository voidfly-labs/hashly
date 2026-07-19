import { AlgoSpotlight } from '~core/components/algo-spotlight.js';
import { BackToTop } from '~core/components/back-to-top.js';
import { initGlobalPaste } from '~core/components/global-paste.js';
import { HashSelect } from '~core/components/hash-select.js';
import { initHelpAction } from '~core/components/help.js';
import { History } from '~core/components/history.js';
import { Permalink } from '~core/components/permalink.js';
import { initSectionCollapse } from '~core/components/section-collapse.js';
import { TabTitle } from '~core/components/tab-title.js';
import { Tooltip } from '~core/components/tooltip.js';
import { initTypeToFocus } from '~core/components/type-to-focus.js';
import { checkWasmSupport } from '~core/components/warning-banner.js';
import { initReportTooltip } from '~core/layout/footer/report.js';
import { initSocialTooltips } from '~core/layout/footer/social.js';
import { initVersionTooltip } from '~core/layout/footer/version.js';
import { NavMenu } from '~core/layout/nav/nav-menu.js';
import { NavSpy } from '~core/layout/nav/nav-spy.js';
import { FaqSection } from '~core/sections/faq.js';
import { FileSection } from '~core/sections/file.js';
import { RandomSection } from '~core/sections/random.js';
import { TextSection } from '~core/sections/text.js';
import { Theme } from '~core/theme/manager.js';

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
    checkWasmSupport(APP_CONFIG);
    History.init({ APP_CONFIG, DEFAULT_ALGO, ALGO_ORDER });
    Theme.init();
    NavMenu.init();
    NavSpy.init();
    BackToTop.init();
    TabTitle.init();
    FaqSection.init();
    History.initPopover('text', 'textHistoryBtn', 'textHistoryPopover', 'textHistoryBody');
    History.initPopover('file', 'fileHistoryBtn', 'fileHistoryPopover', 'fileHistoryBody');
    TextSection.init({ APP_CONFIG, ALGORITHMS, Hasher });
    Permalink.init();
    const permalink = Permalink.restoreFromUrl();
    if (permalink) TextSection.onInput();
    FileSection.init({ APP_CONFIG, ALGORITHMS, Hasher });
    _initToggleAllBtn('textToggleAllBtn', TextSection, ALGORITHMS);
    _initToggleAllBtn('fileToggleAllBtn', FileSection, ALGORITHMS);
    RandomSection.init({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
    HashSelect.init();
    initGlobalPaste({
      onText: (text) => TextSection.pasteText(text),
      onFile: (file) => FileSection.pasteFile(file),
    });
    initTypeToFocus({ onType: (char) => TextSection.typeText(char) });
    AlgoSpotlight.init(ALGORITHMS, [TextSection, FileSection], {
      onChange: (algoId) => RandomSection.applySpotlight(algoId),
      permalink,
    });
    initSectionCollapse();
    initHelpAction('quickSelectHelpBtn', [
      'Start typing or drop a file – all algorithms run instantly',
      '•  Toggle algorithms on/off by clicking on them',
      '•  Browse "History" for recent outputs',
      '•  Click "Permalink" for a shareable link',
    ]);

    const yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    initReportTooltip();
    initSocialTooltips();
    initVersionTooltip();
  });
}
