const _timers = new WeakMap();

/** A short message in `el` that fades after `duration`. Its text goes in the `.hint__text` inside `el`
 *  when it has one (so an icon beside it survives), else in `el` itself. */
export const Hint = {
  show(el, text, duration = 2000) {
    (el.querySelector('.hint__text') ?? el).textContent = text;
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
