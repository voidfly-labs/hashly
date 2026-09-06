import { saveCollapsedSections, savedCollapsedSections } from '~core/features/preferences/saved-view.js';

const PREF_NAME = 'collapsedSections';

/** Apply (or clear) the collapsed state for one section entry, keeping
 *  aria-expanded and the inert body in sync. The chevron's rotation is
 *  driven purely by the .section--collapsed class in CSS. */
function _setCollapsed(entry, collapsed) {
  entry.section.classList.toggle('section--collapsed', collapsed);
  entry.toggleBtn.setAttribute('aria-expanded', String(!collapsed));
  entry.body.toggleAttribute('inert', collapsed);
}

/** Opens `section` if the visitor had collapsed it, so what is about to happen in it (a drop, a paste,
 *  typing) is seen. Goes through its toggle, so the choice is saved like any other. Returns whether it
 *  was collapsed. */
export function expandSection(section) {
  if (!section?.classList.contains('section--collapsed')) return false;
  section.querySelector('.section__toggle')?.click();
  return true;
}

export function initSectionCollapse() {
  const entries = new Map(); // section id -> { section, body, toggleBtn }
  const savedCollapsed = savedCollapsedSections(PREF_NAME);

  document.querySelectorAll('.section').forEach((section) => {
    const toggleBtn = section.querySelector('.section__toggle');
    const body = section.querySelector(':scope > .section__body');
    if (!toggleBtn || !body) return;
    const header = toggleBtn.closest('.section__label-row') || toggleBtn.closest('.section__label');

    const entry = { section, body, toggleBtn };
    entries.set(section.id, entry);
    if (savedCollapsed.has(section.id)) _setCollapsed(entry, true);

    toggleBtn.addEventListener('click', () => {
      const collapsed = !section.classList.contains('section--collapsed');
      _setCollapsed(entry, collapsed);
      saveCollapsedSections(
        PREF_NAME,
        [...entries.values()]
          .filter((e) => e.section.classList.contains('section--collapsed'))
          .map((e) => e.section.id),
      );
      // Close an open history popover inside a section that's collapsing —
      // it's anchored to the header, which stays visible, but its content
      // (e.g. the just-hidden result rows) no longer makes sense to show.
      if (collapsed) {
        header.querySelector('.history-popover--visible [data-popover-close]')?.click();
      }
    });
  });

  const expandTarget = (id) => {
    const target = document.getElementById(id);
    const entry = entries.get(target?.closest('.section')?.id);
    if (!entry) return;
    const wasCollapsed = entry.section.classList.contains('section--collapsed');
    _setCollapsed(entry, false);
    // The browser's own focus attempt hit an inert target; retry once the expand animation settles.
    if (wasCollapsed && target !== entry.section) setTimeout(() => target.focus(), 300);
  };
  const expandFromHash = () => expandTarget(location.hash.slice(1));
  window.addEventListener('hashchange', expandFromHash);
  // A link to the hash the URL already has fires no hashchange, e.g. the menu's FAQ link after the
  // visitor collapsed the FAQ.
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (link) expandTarget(link.getAttribute('href').slice(1));
  });
  expandFromHash();
}
