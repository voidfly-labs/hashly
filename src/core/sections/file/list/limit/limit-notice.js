import { Announcer } from '~core/ui/announcer/announcer.js';

const number = (n) => n.toLocaleString('en-US');

/** The notice at the top of the file list (see limit-notice.html) for a drop that had more files than
 *  `maxFiles` allows: "First 100 of 340 files hashed", with a "Raise limit" button that calls `onRaise`.
 *  It stays until the next drop or clear. `box` is the file list's box, which it gives an amber border.
 *
 *  Returns `{ show, hide }`. `show({ limit, total, exact })`: `total` is the number of files the drop
 *  had, a lower bound ("100+") unless `exact`, since a dropped folder is only read as far as the limit. */
export function createLimitNotice({ root, box, onRaise }) {
  const text = root.querySelector('.limit-notice__text');
  const setShown = (shown) => {
    root.hidden = !shown;
    // The box's own border turns amber while the notice is on (see limit-notice.css).
    box.classList.toggle('file-list-box--limited', shown);
  };

  root.querySelector('.limit-notice__action').addEventListener('click', (e) => {
    // The click would reach the page's click-outside handler and close the popover it opens.
    e.stopPropagation();
    onRaise();
  });

  return {
    show({ limit, total, exact }) {
      text.textContent = `First ${number(limit)} of ${number(total)}${exact ? '' : '+'} files hashed`;
      setShown(true);
      Announcer.say(text.textContent);
    },
    hide() {
      setShown(false);
    },
  };
}
