import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

/** The actions of a loaded drop zone (markup: drop-actions.html; the folder button is the folder picker's,
 *  see ../folder/). The browse button opens the zone's file `input`; the ✕ calls `onClear()`, says it
 *  stops and removes while `isHashing()`, and says "all" once the zone stands for several files. While
 *  the pointer is on the ✕ the zone drops its own hover look (`file-drop--clear-hover`).
 *
 *  Returns `{ show(count), hide(), refreshClearLabel() }`: `show` reveals the ✕ for a zone that stands for
 *  `count` files, `hide` puts it away, and `refreshClearLabel` brings its spoken label up to date when
 *  `isHashing()` changes. */
export function createDropActions(drop, { input, isHashing, onClear }) {
  const browseBtn = document.getElementById('fileBrowseBtn');
  const clearBtn = document.getElementById('fileDropClear');

  browseBtn.addEventListener('click', () => input.click());
  initButtonTooltip(browseBtn, 'Browse files');

  clearBtn.addEventListener('mouseenter', () => drop.classList.add('file-drop--clear-hover'));
  clearBtn.addEventListener('mouseleave', () => drop.classList.remove('file-drop--clear-hover'));

  // Clears every file of the drop, so it says so once there are several, and says it stops what is hashing.
  let several = false;
  const clearVerb = () => (isHashing() ? 'Stop and remove' : 'Remove');
  const refreshClearLabel = () =>
    clearBtn.setAttribute('aria-label', `${clearVerb()} ${several ? 'all files' : 'selected file'}`);
  initButtonTooltip(clearBtn, () => (several ? `${clearVerb()} all` : clearVerb()));

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClear();
  });

  return {
    refreshClearLabel,

    show(count) {
      several = count > 1;
      refreshClearLabel();
      clearBtn.classList.add('file-drop__clear--visible');
    },

    hide() {
      clearBtn.classList.remove('file-drop__clear--visible');
      // The button may hide under the pointer without firing mouseleave.
      drop.classList.remove('file-drop--clear-hover');
    },
  };
}
