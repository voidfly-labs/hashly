export const FaqSection = {
  init() {
    const tablist = document.getElementById('faqTablist');
    const wrap = document.getElementById('faqTabsWrap');
    if (!tablist) return;

    this._tabs = [...document.querySelectorAll('.info__tab')];
    this._panels = [...document.querySelectorAll('.info__panel')];

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
      if (next !== -1) {
        e.preventDefault();
        tabs[next].focus();
        this.activate(tabs[next].dataset.tab);
      }
    });
  },

  activate(tabId) {
    const panel = document.getElementById(`faq-panel-${tabId}`);
    const tab = this._tabs.find((t) => t.dataset.tab === tabId);
    if (panel) panel.dataset.active = '';
    this._panels.forEach((p) => {
      if (p !== panel) p.removeAttribute('data-active');
    });
    this._tabs.forEach((t) => t.setAttribute('aria-selected', 'false'));
    if (tab) {
      tab.setAttribute('aria-selected', 'true');
      tab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  },
};
