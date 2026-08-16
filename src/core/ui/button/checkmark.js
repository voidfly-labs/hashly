// Briefly toggles .btn--done on a button, morphing its icon into a
// checkmark (see button.css). Duration matches Tooltip.flash's 1400ms.
const DONE_DURATION = 1400;
const timers = new WeakMap();

export const Checkmark = {
  flash(btn) {
    clearTimeout(timers.get(btn));
    btn.classList.add('btn--done');
    timers.set(
      btn,
      setTimeout(() => btn.classList.remove('btn--done'), DONE_DURATION),
    );
  },
};
