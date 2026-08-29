/** Calls `onChange()` when another tab of the app changes one of the localStorage `keys` (or clears
 *  the whole storage). The `storage` event only fires in the tabs that did not make the change, so
 *  a tab never hears about its own writes. */
export function initStorageSync(keys, onChange) {
  window.addEventListener('storage', (e) => {
    if (e.key === null || keys.includes(e.key)) onChange();
  });
}
