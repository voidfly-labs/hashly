import { trackPageDrag } from '~core/features/input/page-drag.js';
import { Format } from '~core/lib/format.js';
import { scrollBehavior } from '~core/lib/motion/motion.js';
import { takesText } from '~core/lib/text-field.js';
import { Announcer } from '~core/ui/announcer/announcer.js';
import { createIconButton } from '~core/ui/icon-button/icon-button.js';
import { TAP_TOOLTIP_MS, Tooltip } from '~core/ui/tooltip/tooltip.js';

import { createDropActions } from './actions/drop-actions.js';
import { droppedFiles } from './dropped-files.js';
import { initFolderPicker } from './folder/folder-picker.js';

/** The file drop zone (see file.html): how a file arrives, and the zone's own display of it.
 *
 *  Files arrive by being picked (the input, or the folder picker: ./folder/), dropped on the zone, or dropped anywhere else on the
 *  page; each way hands them to `onFiles(files, { truncated })` as `{ file, path }` (`path`: the name, or
 *  the place in a dropped folder, which is read through, see dropped-files.js; `truncated`: there were
 *  more than `getLimit()` files, so the rest were left out). The zone's ✕ button (./actions/) and Esc on the input call
 *  `onClear()` (Esc only while `hasFile()`); the ✕ says it stops and removes while `isHashing()`, and `refreshClearLabel()`
 *  brings its spoken label up to date when that changes. The zone lights up whenever a file is dragged anywhere over the
 *  window, and the page's own drop handler stops the browser from navigating to a dropped file.
 *
 *  Returns `{ section, mirrorInput, notify, showFile, clearFile, setStats, showStats, hideStats }`: the
 *  section the zone is in, `notify(message)` (a short notice at the zone), and what the section does
 *  to the zone's file name, ✕ button and status line (see file-stats.html: its text, and an icon picked by its `state`). */
export function createFileDrop({ hasFile, isHashing, getLimit, onFiles, onClear }) {
  const drop = document.getElementById('fileDrop');
  const input = document.getElementById('fileInput');
  const fileName = document.getElementById('fileName');
  const fileNameText = document.getElementById('fileNameText');
  const fileSize = document.getElementById('fileSize');
  const stats = document.getElementById('fileStats');
  const statsText = document.getElementById('fileStatsText');

  // A ? button after the status text, for a note (why several files failed) too long for the line. A tap
  // shows it for a moment, as a touch screen has no hover.
  const NOTE_LABEL = 'Why files failed';
  let statsNote = '';
  const statsNoteBtn = createIconButton({
    icon: 'help',
    label: NOTE_LABEL,
    tip: () => statsNote,
    className: 'file-drop__stats-note',
    onClick: (btn) => Tooltip.show(btn, statsNote, TAP_TOOLTIP_MS),
  });
  statsNoteBtn.hidden = true;
  stats.append(statsNoteBtn);

  /** Mirrors files that didn't come through the input itself (drop, paste) into it. */
  function mirrorInput(files) {
    const dt = new DataTransfer();
    files.forEach((file) => dt.items.add(file));
    input.files = dt.files;
  }

  /** A short notice at the zone, for what a drop could not do. */
  function notify(message) {
    Tooltip.show(drop, message, 3500);
    Announcer.say(message);
  }

  /** Takes the files of a drop, the files of a folder in it included (see dropped-files.js). */
  const acceptDrop = async (dataTransfer) => {
    const { files, truncated, hadFolder } = await droppedFiles(dataTransfer, getLimit());
    if (!files.length) {
      if (hadFolder) notify('No files found in the folder');
      return;
    }
    mirrorInput(files.map(({ file }) => file));
    onFiles(files, { truncated });
  };

  input.addEventListener('change', (e) => {
    if (e.target.files.length) {
      const files = [...e.target.files];
      e.target.value = '';
      onFiles(files.map((file) => ({ file, path: file.name })));
    }
  });

  initFolderPicker(drop, { getLimit, onFiles, notify, mirrorInput });
  const actions = createDropActions(drop, { input, isHashing, onClear });

  // Keyboard focus lights the zone's border (file-drop.css). A browser without :focus-visible lights it on any focus.
  const keyboardFocus = () => {
    try {
      return input.matches(':focus-visible');
    } catch {
      return true;
    }
  };
  input.addEventListener('focus', () => drop.classList.toggle('file-drop--focus', keyboardFocus()));
  input.addEventListener('keydown', () => drop.classList.add('file-drop--focus'));
  input.addEventListener('blur', () => drop.classList.remove('file-drop--focus'));

  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('file-drop--active');
  });

  drop.addEventListener('dragleave', () => {
    drop.classList.remove('file-drop--active');
  });

  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('file-drop--active');
    acceptDrop(e.dataTransfer);
  });

  // ── Whole-page drag indicator ──────────────────────────────────────
  // Highlights the drop zone whenever a file is dragged anywhere over
  // the browser window, not just directly over the zone itself.
  // Only file drags count, not text selections or other drag types.
  trackPageDrag({
    accepts: (dt) => Boolean(dt?.types?.includes('Files')),
    onChange: (active, { internal }) => {
      drop.classList.toggle('file-drop--page-drag', active);
      if (active && !internal) drop.closest('.section').scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    },
  });

  document.addEventListener('dragover', (e) => {
    // Required to allow drop on the document in all browsers
    if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
  });

  document.addEventListener('drop', (e) => {
    // Text dropped into a field (the reference hash, the history search) is the field's own to take.
    if (!e.dataTransfer?.types?.includes('Files') && takesText(e.target)) return;
    // Prevent the browser from navigating to a dropped file
    e.preventDefault();
    // If the drop landed inside the zone itself, the zone's own handler
    // already processed the files — don't process them a second time.
    if (drop.contains(e.target)) return;
    // Drop landed outside the zone: take its files.
    acceptDrop(e.dataTransfer);
  });

  // Esc clears the file input when a file is loaded and the drop
  // zone (file input) is focused — mirrors TextSection's Esc behaviour.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hasFile()) {
      e.preventDefault();
      onClear();
    }
  });

  return {
    section: drop.closest('.section'),
    mirrorInput,
    notify,
    refreshClearLabel: actions.refreshClearLabel,

    /** Shows `file`'s name and size in the zone, and its ✕ button. `count` is how many files the
     *  zone stands for (it clears them all). */
    showFile(file, count = 1) {
      actions.show(count);
      fileNameText.textContent = file.name;
      fileSize.textContent = ` · ${Format.fileSize(file.size)}`;
      fileName.classList.add('file-drop__filename--visible');
      drop.classList.add('file-drop--has-file');
    },

    /** Puts the zone back to having no file: no name, no ✕ button, nothing in the input. */
    clearFile() {
      input.value = '';
      fileNameText.textContent = '';
      fileSize.textContent = '';
      fileName.classList.remove('file-drop__filename--visible');
      actions.hide();
      drop.classList.remove('file-drop--has-file');
    },

    /** The status line under the file name. `state` picks its icon: 'busy' (spinner),
     *  'done' (✓), 'error' (✕) or 'warn' (⚠); none for an empty row. A `note` (lines joined by \n) puts
     *  a ? button after the text that shows it; each call sets the note anew, so a line without one has none. */
    setStats(text, state = '', note = '') {
      statsText.textContent = text;
      stats.dataset.state = state;
      statsNote = note;
      statsNoteBtn.hidden = !note;
      statsNoteBtn.setAttribute('aria-label', note ? note.replace(/\n/g, ' ') : NOTE_LABEL);
      if (!note) Tooltip.hide(statsNoteBtn);
    },
    showStats: () => stats.classList.add('file-drop__stats--visible'),
    hideStats: () => stats.classList.remove('file-drop__stats--visible'),
  };
}
