export const FaqSection = {
  init() {
    const tablist = document.getElementById('faqTablist');
    const wrap = document.getElementById('faqTabsWrap');
    if (!tablist) return;

    this._tabs = [...document.querySelectorAll('.info__tab')];
    this._panels = [...document.querySelectorAll('.info__panel')];
    this._section = tablist.closest('.section');

    const updateFade = () => {
      const { scrollLeft, scrollWidth, clientWidth } = tablist;
      wrap.style.setProperty('--tabs-fade-left', scrollLeft > 1 ? '1' : '0');
      wrap.style.setProperty('--tabs-fade-right', scrollLeft + clientWidth < scrollWidth - 1 ? '1' : '0');
    };
    tablist.addEventListener('scroll', updateFade, { passive: true });
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateFade, { passive: true });
    } else {
      new ResizeObserver(updateFade).observe(tablist);
    }
    updateFade();

    tablist.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (!tab) return;
      this.activate(tab.dataset.tab);
    });

    tablist.addEventListener('keydown', (e) => {
      const tabs = [...tablist.querySelectorAll('[role="tab"]')];
      const idx = tabs.indexOf(document.activeElement);
      if (idx === -1) return;
      let next = -1;
      if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
      if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      if (next !== -1) {
        e.preventDefault();
        tabs[next].focus();
        this.activate(tabs[next].dataset.tab);
      }
    });

    // Deep links: #<tab id> (e.g. /#crc32) opens that tab. Picking a tab updates the hash
    // with replaceState, which doesn't fire hashchange, so this only reacts to the URL
    // being changed from outside.
    window.addEventListener('hashchange', () => this._openFromHash({ scroll: true }));
    this._openFromHash({ scroll: this._isFreshLoad() });
  },

  /** True for a normal navigation (a followed link, a typed URL). A reload or Back/Forward
   *  has the browser restore the user's own scroll position, which a deep link shouldn't override. */
  _isFreshLoad() {
    const [nav] = performance.getEntriesByType?.('navigation') ?? [];
    return !nav || (nav.type !== 'reload' && nav.type !== 'back_forward');
  },

  /** Opens the tab named by the URL hash, if it names one, and (when `scroll` is set) scrolls to
   *  the section the way a menu click does: the page's own smooth scrolling, landing where
   *  `scroll-margin-top` puts the section's title. The short hash names no element, so the browser
   *  never scrolls to it itself. Other hashes (#about-section, …) are ignored. */
  _openFromHash({ scroll }) {
    const tabId = window.location.hash.slice(1);
    const tab = this._tabs.find((t) => t.dataset.tab === tabId);
    if (!tab) return;
    this.activate(tabId, { fromUrl: true });

    // Open the section if the user had collapsed it, so the link doesn't land on just its title.
    const wasCollapsed = scroll && this._section.classList.contains('section--collapsed');
    if (wasCollapsed) this._section.querySelector('.section__toggle')?.click();

    const finish = () => {
      this._revealTab(tab);
      if (scroll) this._section.scrollIntoView({ block: 'start' });
    };
    // Not right away. On a fresh load this runs mid-init: the other sections are still building
    // their content (scrolling now would aim at where the FAQ is before that pushes it down), and
    // section-collapse is about to re-parent the tab strip, which resets its scroll position. After
    // a collapsed section's expand animation the page is finally tall enough to scroll that far.
    if (wasCollapsed) setTimeout(finish, 320);
    else requestAnimationFrame(finish);
  },

  /** Mirrors the open tab in the URL hash, without scrolling or adding a history entry.
   *  The first (default) tab leaves the hash off. */
  _syncUrl(tabId) {
    const { pathname, search } = window.location;
    const isDefault = tabId === this._tabs[0]?.dataset.tab;
    history.replaceState(null, '', isDefault ? pathname + search : `${pathname}${search}#${tabId}`);
  },

  /** Opens a tab. `fromUrl` is for a tab named by the URL hash: the URL already says so, and
   *  nothing scrolls here (see `_openFromHash`). */
  activate(tabId, { fromUrl = false } = {}) {
    const panel = document.getElementById(`faq-panel-${tabId}`);
    const tab = this._tabs.find((t) => t.dataset.tab === tabId);
    if (panel) panel.dataset.active = '';
    this._panels.forEach((p) => {
      if (p !== panel) p.removeAttribute('data-active');
    });
    this._tabs.forEach((t) => t.setAttribute('aria-selected', 'false'));
    if (tab) {
      tab.setAttribute('aria-selected', 'true');
      if (!fromUrl) tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    if (!fromUrl) this._syncUrl(tabId);
  },

  /** Scrolls the tab strip, and only the strip, just far enough to show `tab`. */
  _revealTab(tab) {
    const strip = tab.parentElement;
    const tabBox = tab.getBoundingClientRect();
    const stripBox = strip.getBoundingClientRect();
    if (tabBox.left < stripBox.left) strip.scrollLeft -= stripBox.left - tabBox.left;
    else if (tabBox.right > stripBox.right) strip.scrollLeft += tabBox.right - stripBox.right;
  },
};
