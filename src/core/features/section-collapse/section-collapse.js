import { saveCollapsedSections, savedCollapsedSections } from '~core/features/preferences/saved-view.js';

const PREF_NAME = 'collapsedSections';

// Material Icons "keyboard_arrow_down" — rotated 180° for the expanded
// (pointing up) state rather than swapped for a separate "keyboard_arrow_up"
// glyph, since the two are exact mirror images and rotation is what lets the
// change animate smoothly (see section-collapse.css).
const ICON_CHEVRON_DOWN = 'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z';

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
    const header = section.querySelector('.section__label-row') || section.querySelector(':scope > .section__label');
    if (!header) return;
    const heading = header.classList.contains('section__label') ? header : header.querySelector('.section__label');
    if (!heading) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'section__toggle';
    toggleBtn.setAttribute('aria-expanded', 'true');
    while (heading.firstChild) toggleBtn.appendChild(heading.firstChild);
    heading.appendChild(toggleBtn);

    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.setAttribute('class', 'section__toggle-chevron');
    chevron.setAttribute('viewBox', '0 0 24 24');
    chevron.setAttribute('aria-hidden', 'true');
    const chevronPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    chevronPath.setAttribute('d', ICON_CHEVRON_DOWN);
    chevron.appendChild(chevronPath);
    toggleBtn.appendChild(chevron);

    const bodyInner = document.createElement('div');
    bodyInner.className = 'section__body-inner';
    let next = header.nextElementSibling;
    while (next) {
      const toMove = next;
      next = next.nextElementSibling;
      bodyInner.appendChild(toMove);
    }

    const body = document.createElement('div');
    body.className = 'section__body';
    body.id = `${section.id}-body`;
    body.appendChild(bodyInner);
    section.appendChild(body);
    toggleBtn.setAttribute('aria-controls', body.id);

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

  const expandFromHash = () => {
    const target = document.getElementById(location.hash.slice(1));
    const entry = entries.get(target?.closest('.section')?.id);
    if (!entry) return;
    const wasCollapsed = entry.section.classList.contains('section--collapsed');
    _setCollapsed(entry, false);
    // The browser's own focus attempt hit an inert target; retry once the expand animation settles.
    if (wasCollapsed && target !== entry.section) setTimeout(() => target.focus(), 300);
  };
  window.addEventListener('hashchange', expandFromHash);
  expandFromHash();
}
