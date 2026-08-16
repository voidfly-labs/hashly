import { AlgoSpotlight } from '~core/components/algo-spotlight.js';
import { BackToTop } from '~core/components/back-to-top.js';
import { initGlobalPaste } from '~core/components/global-paste.js';
import { HashSelect } from '~core/components/hash-select.js';
import { createHelpPopover } from '~core/components/help.js';
import { History } from '~core/components/history.js';
import { Permalink } from '~core/components/permalink.js';
import { toggleAllLabel } from '~core/components/result-row.js';
import { initSectionCollapse } from '~core/components/section-collapse.js';
import { TabTitle } from '~core/components/tab-title.js';
import { Tooltip } from '~core/components/tooltip.js';
import { initTypeToFocus } from '~core/components/type-to-focus.js';
import { checkWasmSupport } from '~core/components/warning-banner.js';
import { initReportTooltip } from '~core/layout/footer/report.js';
import { initSocialTooltips } from '~core/layout/footer/social.js';
import { initVersionTooltip } from '~core/layout/footer/version.js';
import { initNavHelp } from '~core/layout/nav/nav-help.js';
import { initNavHistory } from '~core/layout/nav/nav-history.js';
import { NavMenu } from '~core/layout/nav/nav-menu.js';
import { NavSpy } from '~core/layout/nav/nav-spy.js';
import { FaqSection } from '~core/sections/faq.js';
import { FileSection } from '~core/sections/file.js';
import { RandomSection } from '~core/sections/random.js';
import { TextSection } from '~core/sections/text.js';
import { Preferences } from '~core/services/preferences.js';
import { Theme } from '~core/theme/manager.js';

function _initToggleAllBtn(btnId, section, ALGORITHMS) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const showTip = () => Tooltip.show(btn, toggleAllLabel(section.hiddenAlgos, ALGORITHMS));
  btn.addEventListener('click', () => section._toggleAll({ refreshTooltip: true }));
  btn.addEventListener('mouseenter', showTip);
  btn.addEventListener('mouseleave', () => Tooltip.hide());
  btn.addEventListener('focus', showTip);
  btn.addEventListener('blur', () => Tooltip.hide());
}

export function initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher }) {
  document.addEventListener('DOMContentLoaded', () => {
    const canHash = checkWasmSupport(APP_CONFIG);
    // A permalink fully determines the view, so saved settings aren't applied to it.
    Preferences.init({ appName: APP_CONFIG.appName, restore: !Permalink.isPermalink() });
    Theme.init();
    NavMenu.init();
    NavSpy.init();
    BackToTop.init();
    // The banner says hashing is disabled: the sections that would hash, and what hangs off them
    // (history, permalinks, quick select, pasting), stay as they are instead of failing row by row.
    if (canHash) _initHashing({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher });
    // After the sections are built, and before the FAQ: a deep link into it has to find it collapsed or not.
    initSectionCollapse();
    FaqSection.init();
    _initFooter();
  });
}

function _initHashing({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher }) {
  History.init({ APP_CONFIG, DEFAULT_ALGO, ALGO_ORDER });
  TabTitle.init();
  History.initPopover('text', 'textHistoryBtn', 'textHistoryPopover', 'textHistoryBody');
  History.initPopover('file', 'fileHistoryBtn', 'fileHistoryPopover', 'fileHistoryBody');
  initNavHistory();
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
  initNavHelp(createHelpPopover('quickSelectHelpBtn', 'helpPopover'));
}

function _initFooter() {
  const yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  initReportTooltip();
  initSocialTooltips();
  initVersionTooltip();
}
