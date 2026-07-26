const DISTANCE = 16;
const DURATION = 160;

/** Slides `el` in from the side `direction` points to (1: from the right, -1: from the left),
 *  fading it up, to show that its content just changed places with the previous page's.
 *  Skipped for visitors who asked for less motion. The caller clips the overflow, if any, and
 *  gives `el` an opaque background to fade from: whatever shows through is what it flashes. */
export function slideIn(el, direction) {
  if (!el?.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.animate(
    [
      { opacity: 0, transform: `translateX(${direction * DISTANCE}px)` },
      { opacity: 1, transform: 'translateX(0)' },
    ],
    {
      duration: DURATION,
      easing: 'ease-out',
    },
  );
}
