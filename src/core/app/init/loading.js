const LOADING = 'is-loading';

/** From here until `endLoading()`, nothing transitions (see loading.css), so the page builds
 *  itself into its first view instead of animating into it. */
export function startLoading() {
  document.documentElement.classList.add(LOADING);
}

/** Two frames later, so the first view has been styled before transitions are switched back on. */
export function endLoading() {
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove(LOADING)));
}
