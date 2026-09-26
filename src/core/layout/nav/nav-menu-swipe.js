const MIN_DISTANCE = 40;

/** Calls `onSwipe` when a finger swipes up on `target`, more up than sideways. `canSwipe` is asked when
 *  the finger lands: a swipe that starts while `target` can still scroll is its scrolling, not a swipe. */
export function initSwipeUp(target, onSwipe, canSwipe = () => true) {
  let start = null;

  target.addEventListener(
    'touchstart',
    (e) => {
      const touch = e.touches[0];
      start = e.touches.length === 1 && canSwipe() ? { x: touch.clientX, y: touch.clientY } : null;
    },
    { passive: true },
  );
  target.addEventListener('touchcancel', () => (start = null), { passive: true });
  target.addEventListener(
    'touchend',
    (e) => {
      if (!start) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      start = null;
      if (-dy >= MIN_DISTANCE && -dy > Math.abs(dx)) onSwipe();
    },
    { passive: true },
  );
}
