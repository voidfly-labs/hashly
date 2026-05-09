import { Theme } from './theme/manager.js';
import { FaqSection } from './sections/faq.js';
import { History } from './components/history.js';
import { TextSection } from './sections/text.js';
import { FileSection } from './sections/file.js';
import { RandomSection } from './sections/random.js';
import { Permalink } from './components/permalink.js';
import { Tooltip } from './components/tooltip.js';

export function initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher }) {
  document.addEventListener('DOMContentLoaded', () => {
    History.init({ APP_CONFIG, DEFAULT_ALGO, ALGO_ORDER });
    Theme.init(APP_CONFIG);
    FaqSection.init();
    History.initPopover('text', 'textHistoryBtn', 'textHistoryPopover', 'textHistoryBody');
    History.initPopover('file', 'fileHistoryBtn', 'fileHistoryPopover', 'fileHistoryBody');
    TextSection.init({ APP_CONFIG, ALGORITHMS, Hasher });
    Permalink.init();
    if (Permalink.restoreFromUrl()) TextSection.onInput();
    FileSection.init({ APP_CONFIG, ALGORITHMS, Hasher });

    // Toggle-all button — Text section
    (() => {
      const btn = document.getElementById('textToggleAllBtn');
      if (!btn) return;
      btn.addEventListener('click', () => TextSection._toggleAll());
      btn.addEventListener('mouseenter', () => {
        const allSelected = ALGORITHMS.every((a) => !TextSection.disabledAlgos.has(a.id));
        Tooltip.show(btn, allSelected ? 'Deselect all' : 'Select all');
      });
      btn.addEventListener('mouseleave', () => Tooltip.hide());
      btn.addEventListener('focus', () => {
        const allSelected = ALGORITHMS.every((a) => !TextSection.disabledAlgos.has(a.id));
        Tooltip.show(btn, allSelected ? 'Deselect all' : 'Select all');
      });
      btn.addEventListener('blur', () => Tooltip.hide());
    })();

    // Toggle-all button — File section
    (() => {
      const btn = document.getElementById('fileToggleAllBtn');
      if (!btn) return;
      btn.addEventListener('click', () => FileSection._toggleAll());
      btn.addEventListener('mouseenter', () => {
        const allSelected = ALGORITHMS.every((a) => !FileSection.disabledAlgos.has(a.id));
        Tooltip.show(btn, allSelected ? 'Deselect all' : 'Select all');
      });
      btn.addEventListener('mouseleave', () => Tooltip.hide());
      btn.addEventListener('focus', () => {
        const allSelected = ALGORITHMS.every((a) => !FileSection.disabledAlgos.has(a.id));
        Tooltip.show(btn, allSelected ? 'Deselect all' : 'Select all');
      });
      btn.addEventListener('blur', () => Tooltip.hide());
    })();

    RandomSection.init({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });

    // Heading algo badges — rendered from ALGORITHMS, click scrolls to text section.
    const badgesContainer = document.getElementById('algoBadges');
    if (badgesContainer) {
      badgesContainer.innerHTML = ALGORITHMS.map(
        ({ id }) => `<button class="algo-badge" data-algo="${id}">${id}</button>`,
      ).join('');
      badgesContainer.querySelectorAll('.algo-badge').forEach((badge) => {
        const algoId = badge.dataset.algo;
        const algo = ALGORITHMS.find((a) => a.id === algoId);
        const tipText = `${algo.bits}-bit · ${algo.hexLen} hex chars`;
        badge.setAttribute('aria-label', `${algoId} — ${tipText} — click to start hashing`);
        badge.addEventListener('mouseenter', () => Tooltip.show(badge, tipText));
        badge.addEventListener('mouseleave', () => Tooltip.hide());
        badge.addEventListener('focus', () => Tooltip.show(badge, tipText));
        badge.addEventListener('blur', () => Tooltip.hide());
        badge.addEventListener('click', () => {
          const input = document.getElementById('textInput');
          document.getElementById('text').scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => input.focus(), 200);
        });
      });
    }

    const yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  });
}
