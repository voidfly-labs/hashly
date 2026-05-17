import { Theme } from '../theme/manager.js';
import { NavMenu } from '../components/nav-menu.js';
import { FaqSection } from '../sections/faq.js';
import { History } from '../components/history.js';
import { TextSection } from '../sections/text.js';
import { FileSection } from '../sections/file.js';
import { RandomSection } from '../sections/random.js';
import { Permalink } from '../components/permalink.js';
import { Tooltip } from '../components/tooltip.js';

function _initToggleAllBtn(btnId, section, ALGORITHMS) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.addEventListener('click', () => section._toggleAll());
  btn.addEventListener('mouseenter', () => {
    const allSelected = ALGORITHMS.every((a) => !section.disabledAlgos.has(a.id));
    Tooltip.show(btn, allSelected ? 'Deselect all' : 'Select all');
  });
  btn.addEventListener('mouseleave', () => Tooltip.hide());
  btn.addEventListener('focus', () => {
    const allSelected = ALGORITHMS.every((a) => !section.disabledAlgos.has(a.id));
    Tooltip.show(btn, allSelected ? 'Deselect all' : 'Select all');
  });
  btn.addEventListener('blur', () => Tooltip.hide());
}

function _wireAlgoBadge(badge, algo) {
  const tipText = `${algo.bits}-bit · ${algo.hexLen} hex chars`;
  badge.setAttribute('aria-label', `${algo.id} — ${tipText} — click to start hashing`);
  badge.addEventListener('mouseenter', () => Tooltip.show(badge, tipText));
  badge.addEventListener('mouseleave', () => Tooltip.hide());
  badge.addEventListener('focus', () => Tooltip.show(badge, tipText));
  badge.addEventListener('blur', () => Tooltip.hide());
  badge.addEventListener('click', () => {
    const input = document.getElementById('textInput');
    document.getElementById('text').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => input.focus(), 200);
  });
}

function _initAlgoBadges(ALGORITHMS) {
  const container = document.getElementById('algoBadges');
  if (!container) return;
  container.innerHTML = ALGORITHMS.map(({ id }) => `<button class="algo-badge" data-algo="${id}">${id}</button>`).join(
    '',
  );
  container.querySelectorAll('.algo-badge').forEach((badge) => {
    const algo = ALGORITHMS.find((a) => a.id === badge.dataset.algo);
    _wireAlgoBadge(badge, algo);
  });
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
    _initAlgoBadges(ALGORITHMS);

    const yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  });
}
