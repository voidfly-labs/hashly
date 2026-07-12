// Singleton <div> appended to <body> so it escapes all stacking contexts
// (including transformed ancestors like the history popover).
// All .tooltip spans in markup are kept for semantic grouping but are hidden;
// only the singleton is ever visible.
export const Tooltip = (() => {
  let el = null; // singleton DOM node
  let hideTimer = null;
  let lastPointerType = 'mouse';

  document.addEventListener('pointerdown', (e) => {
    lastPointerType = e.pointerType;
  });

  function _ensureEl() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'tooltip-singleton';
    document.body.appendChild(el);
  }

  /** Position the singleton above anchorElement, centered on it. */
  function _position(anchorElement) {
    const rect = _stableRect(anchorElement);
    el.style.right = '';
    el.style.left = `${rect.left + rect.width / 2 - el.offsetWidth / 2}px`;
    el.style.top = `${rect.top}px`;
  }

  /** Position the singleton above anchorElement, right-edge-aligned to it
   *  instead of centered — for a wider (--xl) block of text. CSS `right`
   *  (not a computed `left`) lets the browser handle the box's own width
   *  natively, so this doesn't depend on measuring it. */
  function _positionXl(anchorElement) {
    const rect = _stableRect(anchorElement);
    // clientWidth excludes the scrollbar, matching getBoundingClientRect().
    const clientWidth = document.documentElement.clientWidth;
    el.style.left = '';
    el.style.right = `${Math.max(clientWidth - rect.right, 16)}px`;
    el.style.top = `${rect.top}px`;
  }

  /** anchorElement's rect with its own CSS transform (e.g. a :active press
   *  scale) neutralized, so a click mid-press-animation still measures the
   *  same stable geometry hover would have. transition also has to be
   *  disabled — otherwise transform: none just starts a new transition
   *  instead of applying instantly, and the very next read still reflects
   *  the old (transitioning-from) value. Invisible to the user — both are
   *  restored before the next paint. */
  function _stableRect(anchorElement) {
    const prevTransition = anchorElement.style.transition;
    const prevTransform = anchorElement.style.transform;
    anchorElement.style.transition = 'none';
    anchorElement.style.transform = 'none';
    const rect = anchorElement.getBoundingClientRect();
    anchorElement.style.transform = prevTransform;
    anchorElement.style.transition = prevTransition;
    return rect;
  }

  return {
    flash(anchorElement, text) {
      _ensureEl();

      // Derive label: passed explicitly, or from the child .tooltip span's text
      const label = text ?? anchorElement.querySelector('.tooltip')?.textContent ?? 'Copied!';

      el.classList.remove('tooltip-singleton--xl', 'tooltip-singleton--visible');
      el.textContent = label;

      // Force a reflow so the transition fires even if already visible
      // eslint-disable-next-line sonarjs/void-use
      void el.offsetWidth;

      _position(anchorElement);
      el.classList.add('tooltip-singleton--visible');

      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => el.classList.remove('tooltip-singleton--visible'), 1400);
    },

    /** Show a persistent tooltip above anchorElement until hide() is called.
     *  On touch/pen input the tooltip auto-dismisses after 1400 ms so it
     *  doesn't linger with no hover-leave to clear it. Pass duration to
     *  force an auto-dismiss after that many ms regardless of pointer type
     *  (e.g. a click-triggered tooltip with no hover-leave to rely on).
     *  align: 'end' right-aligns the tooltip to the anchor instead of centering it,
     *  for anchors against the right edge of the viewport. */
    show(anchorElement, text, duration, { align = 'center' } = {}) {
      _ensureEl();
      clearTimeout(hideTimer);
      el.classList.remove('tooltip-singleton--xl', 'tooltip-singleton--visible');
      el.textContent = text;
      // eslint-disable-next-line sonarjs/void-use
      void el.offsetWidth;
      (align === 'end' ? _positionXl : _position)(anchorElement);
      el.classList.add('tooltip-singleton--visible');
      if (duration) {
        hideTimer = setTimeout(() => el.classList.remove('tooltip-singleton--visible'), duration);
      } else if (lastPointerType !== 'mouse') {
        hideTimer = setTimeout(() => el.classList.remove('tooltip-singleton--visible'), 1400);
      }
    },

    /** Like show(), but right-edge-aligned instead of centered (see
     *  _positionXl) — for a wider, multi-line block of content. */
    showXl(anchorElement, text, duration) {
      _ensureEl();
      clearTimeout(hideTimer);
      el.classList.remove('tooltip-singleton--visible');
      el.classList.add('tooltip-singleton--xl');
      el.textContent = text;
      // eslint-disable-next-line sonarjs/void-use
      void el.offsetWidth;
      _positionXl(anchorElement);
      el.classList.add('tooltip-singleton--visible');
      if (duration) {
        hideTimer = setTimeout(() => el.classList.remove('tooltip-singleton--visible'), duration);
      } else if (lastPointerType !== 'mouse') {
        hideTimer = setTimeout(() => el.classList.remove('tooltip-singleton--visible'), 1400);
      }
    },

    hide() {
      if (el) el.classList.remove('tooltip-singleton--visible');
    },
  };
})();
