/** Marks the header nav link of the section being read (aria-current + --active). */
export const NavSpy = {
  // A section is "current" once its top is within this fraction of the viewport height from the top.
  _TRIGGER_RATIO: 0.4,
  _items: [],
  _sections: [],
  _queued: false,

  _currentSection() {
    const { scrollHeight } = document.documentElement;
    const atBottom = scrollHeight > window.innerHeight && window.innerHeight + window.scrollY >= scrollHeight - 2;
    if (atBottom) return this._sections[this._sections.length - 1];
    let current = null;
    for (const section of this._sections) {
      if (section.getBoundingClientRect().top <= window.innerHeight * this._TRIGGER_RATIO) current = section;
    }
    return current;
  },

  _update() {
    this._queued = false;
    const current = this._currentSection();
    for (const { link, section } of this._items) {
      const active = section === current;
      link.classList.toggle('header__nav-link--active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  },

  _schedule() {
    if (this._queued) return;
    this._queued = true;
    requestAnimationFrame(() => this._update());
  },

  init() {
    this._items = [...document.querySelectorAll('.header__nav-link[href^="#"]')]
      .map((link) => ({ link, section: document.querySelector(link.getAttribute('href')) }))
      .filter((item) => item.section);
    if (!this._items.length) return;

    const linked = new Set(this._items.map((item) => item.section));
    this._sections = [...document.querySelectorAll('[id]')].filter((el) => linked.has(el)); // document order

    const schedule = () => this._schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Content is built after init and sections can collapse, shifting positions without a scroll event.
    new ResizeObserver(schedule).observe(document.body);
    this._update();
  },
};
