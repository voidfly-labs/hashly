/** Lets the browser paint between chunks of long work (hashing a large file).
 *
 *  A hidden tab runs no animation frames, so waiting for one there would stall
 *  the work until the user came back. Nothing is painted while hidden anyway, so
 *  the wait is skipped when the tab is hidden, and cut short if it becomes hidden
 *  while we wait (the pending frame would otherwise never fire). */
export function yieldToPaint() {
  if (document.hidden) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      document.removeEventListener('visibilitychange', onHidden);
      resolve();
    };
    const onHidden = () => {
      if (document.hidden) finish();
    };
    document.addEventListener('visibilitychange', onHidden);
    requestAnimationFrame(() => setTimeout(finish, 0));
  });
}
