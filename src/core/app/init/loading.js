const LOADING = 'is-loading';

/** Until here nothing transitions (loading.css), so the page builds itself into its first view
 *  instead of animating into it. `is-loading` is set by a script in the head (layout/head.html), so
 *  it covers the first paint as well. Two frames later, so the first view has been styled before
 *  transitions are switched back on. */
export function endLoading() {
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove(LOADING)));
}
