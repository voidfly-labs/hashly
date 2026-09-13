/** Starts the text worker once the page is idle, so its script is fetched while the page is online
 *  (going offline before the first hash then still works) and the first keystroke doesn't wait for it. */
export function initHasherWarmUp(Hasher) {
  const warm = () => Hasher.warmUp();
  if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 2000 });
  else setTimeout(warm, 300);
}
