/** Makes every top-level <section class="section"> collapsible by clicking
 *  its heading — collapsing to just the title line (and, for Text/File,
 *  the toggle-all/permalink/history buttons that share that row).
 *
 *  No template changes: at init, the heading's existing content is moved
 *  into a real <button> (for native keyboard/AT semantics), and every
 *  sibling after the header is moved into a synthetic .section__body
 *  wrapper, animated via the same grid-template-rows collapse technique
 *  used for .result rows (see result.css).
 *
 *  No persistence — every section always starts expanded on load. If the
 *  user navigates to a section via its #anchor (header nav, footer links)
 *  while it's collapsed, it auto-expands so they don't land on an
 *  apparently-empty section. */
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

export function initSectionCollapse() {
  const entries = new Map(); // section id -> { section, body, toggleBtn }

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

    toggleBtn.addEventListener('click', () => {
      const collapsed = !section.classList.contains('section--collapsed');
      _setCollapsed(entry, collapsed);
      // Close an open history popover inside a section that's collapsing —
      // it's anchored to the header, which stays visible, but its content
      // (e.g. the just-hidden result rows) no longer makes sense to show.
      if (collapsed) {
        header.querySelector('.history-popover--visible')?.classList.remove('history-popover--visible');
      }
    });
  });

  const expandFromHash = () => {
    const entry = entries.get(location.hash.slice(1));
    if (entry) _setCollapsed(entry, false);
  };
  window.addEventListener('hashchange', expandFromHash);
  expandFromHash();
}
