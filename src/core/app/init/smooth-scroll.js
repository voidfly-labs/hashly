/** Smooth scrolling is switched on only once the page has loaded: with it on from the start, the
 *  browser's scroll restoration on reload animates from the top instead of landing in place. */
export function initSmoothScroll() {
  const enable = () => requestAnimationFrame(() => document.documentElement.classList.add('smooth-scroll'));
  if (document.readyState === 'complete') enable();
  else window.addEventListener('load', enable, { once: true });
}
