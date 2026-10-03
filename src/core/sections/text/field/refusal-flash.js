const REFUSED = 'text-input__wrap--refused';

/** A flash of the amber ring on `wrap` (the element the field's focus ring is drawn on), for when a key
 *  or some text is refused. Returns `flash()`; calling it again restarts the flash. */
export function createRefusalFlash(wrap) {
  wrap.addEventListener('animationend', (e) => {
    if (e.animationName === 'text-input-refused') wrap.classList.remove(REFUSED);
  });

  return function flash() {
    wrap.classList.remove(REFUSED);
    wrap.getBoundingClientRect(); // a reflow in between, so the animation starts over
    wrap.classList.add(REFUSED);
  };
}
