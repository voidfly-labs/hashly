/** Calls `fn` once the page has stopped scrolling: after `idleMs` without a scroll event, or at the
 *  latest after `maxMs`. Meant for right after a `scrollIntoView` (smooth scrolling has no end
 *  event in every browser of the support range, `scrollend` being new). If no scroll has begun
 *  within a couple of frames (the target was already in view), `fn` runs at once. */
export function whenScrollSettles(fn, { idleMs = 150, maxMs = 2500 } = {}) {
  let idle = 0;
  let frame = 0;

  const done = () => {
    clearTimeout(idle);
    clearTimeout(cap);
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', onScroll);
    fn();
  };
  const onScroll = () => {
    cancelAnimationFrame(frame);
    clearTimeout(idle);
    idle = setTimeout(done, idleMs);
  };
  const cap = setTimeout(done, maxMs);

  window.addEventListener('scroll', onScroll, { passive: true });
  // The scroll starts on the next frame at the earliest, so wait two for its first event.
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(done);
  });
}
