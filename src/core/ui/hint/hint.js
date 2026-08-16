const _timers = new WeakMap();

export const Hint = {
  show(el, text, duration = 2000) {
    el.textContent = text;
    el.classList.add('hint--visible');
    clearTimeout(_timers.get(el));
    _timers.set(
      el,
      setTimeout(() => this.hide(el), duration),
    );
  },

  hide(el) {
    clearTimeout(_timers.get(el));
    _timers.delete(el);
    el.classList.remove('hint--visible');
  },
};
