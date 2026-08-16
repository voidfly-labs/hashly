import { Permalink } from '~core/app/permalink/permalink.js';
import { Theme } from '~core/app/theme/manager.js';
import { TabTitle } from '~core/features/hashing/tab-title.js';
import { createHelpPopover } from '~core/features/help/help.js';
import { History } from '~core/features/history/history.js';
import { initGlobalPaste } from '~core/features/input/global-paste.js';
import { initTypeToFocus } from '~core/features/input/type-to-focus.js';
import { Preferences } from '~core/features/preferences/preferences.js';
import { HashSelect } from '~core/features/results/hash-select.js';
import { toggleAllLabel } from '~core/features/results/result-row.js';
import { initSectionCollapse } from '~core/features/section-collapse/section-collapse.js';
import { AlgoSpotlight } from '~core/features/spotlight/algo-spotlight.js';
import { BackToTop } from '~core/layout/back-to-top/back-to-top.js';
import { initReportTooltip } from '~core/layout/footer/report.js';
import { initSocialTooltips } from '~core/layout/footer/social.js';
import { initVersionTooltip } from '~core/layout/footer/version.js';
import { initNavHelp } from '~core/layout/nav/nav-help.js';
import { initNavHistory } from '~core/layout/nav/nav-history.js';
import { NavMenu } from '~core/layout/nav/nav-menu.js';
import { NavSpy } from '~core/layout/nav/nav-spy.js';
import { FaqSection } from '~core/sections/faq/faq.js';
import { FileSection } from '~core/sections/file/file.js';
import { RandomSection } from '~core/sections/random/random.js';
import { TextSection } from '~core/sections/text/text.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';
import { checkWasmSupport } from '~core/ui/warning-banner/warning-banner.js';

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

export function initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher }) {
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
    if (canHash) _initHashing({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
    // After the sections are built, and before the FAQ: a deep link into it has to find it collapsed or not.
    initSectionCollapse();
    FaqSection.init();
    _initFooter();
  });
}

function _initHashing({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher }) {
  History.init({
    APP_CONFIG,
    DEFAULT_ALGO,
    ALGO_ORDER: new Map(ALGORITHMS.map(({ id }, i) => [id, i])),
  });
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
