let opener = null;

/** How anything on the page opens the settings popover without knowing about it (sections may not
 *  import `app/`, which owns the popover's trigger): the popover registers itself, a caller asks.
 *  `open({ focus })` shows the popover and puts the focus on the named control (`focus`: a key of
 *  `FIELDS` in settings-popover.js, e.g. 'maxFiles'); it does nothing on a page without one. */
export const SettingsOpener = {
  register(fn) {
    opener = fn;
  },
  open(options) {
    opener?.(options);
  },
};
