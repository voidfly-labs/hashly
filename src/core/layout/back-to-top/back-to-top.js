import { iconHref } from '~core/lib/icon.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

/** Floating "back to top" button. Scrolling past a threshold shows it; it fades out
 *  again after a few idle seconds (unless the pointer or focus is on it) and as soon as
 *  you're back near the top, so it isn't left sitting over the row actions. On narrow
 *  windows it rests on top of the footer instead of covering it (see
 *  --back-to-top-lift in back-to-top.css). */
export const BackToTop = {
  _MIN_SHOW_AT: 300, // px: never offer it before this much scrolling
  _IDLE_HIDE_MS: 3000, // fade out after this long without scrolling
  _btn: null,
  _footer: null,
  _idleTimer: null,
  _engaged: false, // pointer over or keyboard focus on the button: keep it visible
  _queued: false,
  _scrolled: false, // a real scroll happened since the last update

  /** Scroll position past which the button is shown: one viewport height, but never
   *  later than halfway down the page, so short pages (few algorithms shown) still qualify. */
  _showThreshold() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(this._MIN_SHOW_AT, Math.min(window.innerHeight, maxScroll / 2));
  },

  /** Shows or hides the button; showing (re)starts the idle countdown. */
  _setVisible(visible) {
    this._btn.classList.toggle('back-to-top--visible', visible);
    clearTimeout(this._idleTimer);
    if (!visible) Tooltip.hide();
    if (visible) this._idleTimer = setTimeout(() => this._idleHide(), this._IDLE_HIDE_MS);
  },

  _idleHide() {
    if (!this._engaged) this._setVisible(false);
  },

  _update() {
    this._queued = false;
    const past = window.scrollY > this._showThreshold();
    if (!past) this._setVisible(false);
    else if (this._scrolled) this._setVisible(true); // only scrolling wakes it, not layout changes
    this._scrolled = false;

    // How far the footer has come up into the viewport, so the button can rest above it.
    const lift = this._footer ? Math.max(0, window.innerHeight - this._footer.getBoundingClientRect().top) : 0;
    this._btn.style.setProperty('--back-to-top-lift', `${Math.round(lift)}px`);
  },

  _schedule(scrolled = false) {
    if (scrolled) this._scrolled = true;
    if (this._queued) return;
    this._queued = true;
    requestAnimationFrame(() => this._update());
  },

  _onClick() {
    Tooltip.hide();
    window.scrollTo({ top: 0 }); // smooth unless the user prefers reduced motion (see reset.css)
    // The button hides itself on arrival, so hand keyboard focus to the page heading.
    const heading = document.querySelector('main h1');
    if (!heading) return;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
  },

  init() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('keyboard-double-arrow-up')}"></use></svg>`;
    document.body.append(btn);
    this._btn = btn;
    this._footer = document.querySelector('.footer');

    btn.addEventListener('click', () => this._onClick());

    // The label is redundant on touch screens, where it would only flash over the content.
    const showLabel = () => {
      if (window.matchMedia('(hover: hover)').matches) Tooltip.show(btn, 'Back to top', 0, { align: 'end' });
    };
    const engage = (engaged) => {
      this._engaged = engaged;
      if (engaged) return;
      Tooltip.hide();
      if (btn.classList.contains('back-to-top--visible')) this._setVisible(true); // restart the countdown
    };
    btn.addEventListener('mouseenter', () => {
      engage(true);
      showLabel();
    });
    btn.addEventListener('focus', () => {
      engage(true);
      showLabel();
    });
    btn.addEventListener('mouseleave', () => engage(false));
    btn.addEventListener('blur', () => engage(false));

    window.addEventListener('scroll', () => this._schedule(true), { passive: true });
    const schedule = () => this._schedule();
    window.addEventListener('resize', schedule);
    // Content is built after init and sections can collapse, moving the threshold and footer.
    new ResizeObserver(schedule).observe(document.body);
    this._schedule(true);
  },
};
