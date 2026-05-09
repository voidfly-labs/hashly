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

  function _position(anchorElement) {
    const rect = anchorElement.getBoundingClientRect();
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top}px`;
  }

  return {
    flash(anchorElement, text) {
      _ensureEl();

      // Derive label: passed explicitly, or from the child .tooltip span's text
      const label = text ?? anchorElement.querySelector('.tooltip')?.textContent ?? 'Copied!';

      el.textContent = label;
      el.classList.remove('tooltip-singleton--visible');

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
     *  doesn't linger with no hover-leave to clear it. */
    show(anchorElement, text) {
      _ensureEl();
      clearTimeout(hideTimer);
      el.textContent = text;
      el.classList.remove('tooltip-singleton--visible');
      // eslint-disable-next-line sonarjs/void-use
      void el.offsetWidth;
      _position(anchorElement);
      el.classList.add('tooltip-singleton--visible');
      if (lastPointerType !== 'mouse') {
        hideTimer = setTimeout(() => el.classList.remove('tooltip-singleton--visible'), 1400);
      }
    },

    hide() {
      if (el) el.classList.remove('tooltip-singleton--visible');
    },
  };
})();
