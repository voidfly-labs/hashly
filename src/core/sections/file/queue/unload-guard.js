/** Makes the browser ask before the page is closed or reloaded while `isBusy()` is true, so a long hash
 *  is not lost by accident. Call `sync()` whenever that may have changed: the listener is attached only
 *  while busy. The text of the prompt is the browser's own. */
export function createUnloadGuard({ isBusy }) {
  let armed = false;

  const onBeforeUnload = (event) => {
    event.preventDefault();
    event.returnValue = '';
  };

  return {
    sync() {
      const busy = isBusy();
      if (busy === armed) return;
      armed = busy;
      if (busy) window.addEventListener('beforeunload', onBeforeUnload);
      else window.removeEventListener('beforeunload', onBeforeUnload);
    },
  };
}
