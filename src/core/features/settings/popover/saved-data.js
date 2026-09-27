// What the app keeps in localStorage: every key starting with `<appName>-` (history and its
// descriptions, preferences, settings), and the theme under its own key.
const keysOf = (appName, themeKey) => {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(`${appName}-`) || key === themeKey) keys.push(key);
    }
  } catch {
    /* storage unavailable: nothing is kept */
  }
  return keys;
};

/** How much the app has saved, as an approximate size in bytes (localStorage keeps UTF-16: 2 bytes a character). */
export function savedBytes(appName, themeKey) {
  let chars = 0;
  try {
    for (const key of keysOf(appName, themeKey)) chars += key.length + (localStorage.getItem(key)?.length ?? 0);
  } catch {
    /* storage unavailable: nothing is kept */
  }
  return chars * 2;
}

/** Removes everything the app has saved, and reloads the page so that nothing in memory is left to
 *  write it back. A write that is still on its way at the page's end (text waiting for the history is
 *  recorded on `pagehide`) would bring some of it back, so the removal is repeated after those. */
export function clearSavedData(appName, themeKey) {
  const wipe = () => {
    try {
      keysOf(appName, themeKey).forEach((key) => localStorage.removeItem(key));
    } catch {
      /* storage unavailable: nothing to remove */
    }
  };
  wipe();
  window.addEventListener('pagehide', wipe);
  location.reload();
}
