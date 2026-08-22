import { trackPageDrag } from '~core/features/input/page-drag.js';
import { Format } from '~core/lib/format.js';
import { takesText } from '~core/lib/text-field.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

/** The file drop zone (see file.html): how a file arrives, and the zone's own display of it.
 *
 *  A file arrives by being picked (the input), dropped on the zone, or dropped anywhere else on the
 *  page; each is passed to `onFile(file)`. The zone's ✕ button and Esc on the input call `onClear()`
 *  (Esc only while `hasFile()`). The zone lights up whenever a file is dragged anywhere over the
 *  window, and the page's own drop handler stops the browser from navigating to a dropped file.
 *
 *  Returns `{ section, mirrorInput, showFile, clearFile, setStats, showStats, hideStats }`: the
 *  section the zone is in, and what the section does to the zone's file name, ✕ button and status
 *  line (see file-stats.html: its text, and an icon picked by its `state`). */
export function createFileDrop({ hasFile, onFile, onClear }) {
  const drop = document.getElementById('fileDrop');
  const input = document.getElementById('fileInput');
  const clearBtn = document.getElementById('fileDropClear');
  const fileName = document.getElementById('fileName');
  const fileNameText = document.getElementById('fileNameText');
  const fileSize = document.getElementById('fileSize');
  const stats = document.getElementById('fileStats');
  const statsText = document.getElementById('fileStatsText');

  /** Mirrors a file that didn't come through the input itself (drop, paste) into it. */
  function mirrorInput(file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
  }

  const acceptDropped = (file) => {
    mirrorInput(file);
    onFile(file);
  };

  input.addEventListener('change', (e) => {
    if (e.target.files.length) {
      const file = e.target.files[0];
      e.target.value = '';
      onFile(file);
    }
  });

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
    const file = e.dataTransfer.files[0];
    if (file) acceptDropped(file);
  });

  // ── Whole-page drag indicator ──────────────────────────────────────
  // Highlights the drop zone whenever a file is dragged anywhere over
  // the browser window, not just directly over the zone itself.
  // Only file drags count, not text selections or other drag types.
  trackPageDrag({
    accepts: (dt) => Boolean(dt?.types?.includes('Files')),
    onChange: (active, { internal }) => {
      drop.classList.toggle('file-drop--page-drag', active);
      if (active && !internal) drop.closest('.section').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    // already processed the file — don't process it a second time.
    if (drop.contains(e.target)) return;
    // Drop landed outside the zone: extract the file and process it.
    const file = e.dataTransfer?.files?.[0];
    if (file) acceptDropped(file);
  });

  clearBtn.addEventListener('mouseenter', () => drop.classList.add('file-drop--clear-hover'));
  clearBtn.addEventListener('mouseleave', () => drop.classList.remove('file-drop--clear-hover'));

  initButtonTooltip(clearBtn, 'Remove file');

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClear();
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

    /** Shows `file`'s name and size in the zone, and its ✕ button. */
    showFile(file) {
      fileNameText.textContent = file.name;
      fileSize.textContent = ` · ${Format.fileSize(file.size)}`;
      fileName.classList.add('file-drop__filename--visible');
      clearBtn.classList.add('file-drop__clear--visible');
    },

    /** Puts the zone back to having no file: no name, no ✕ button, nothing in the input. */
    clearFile() {
      input.value = '';
      fileNameText.textContent = '';
      fileSize.textContent = '';
      fileName.classList.remove('file-drop__filename--visible');
      clearBtn.classList.remove('file-drop__clear--visible');
      // The button may hide under the pointer without firing mouseleave.
      drop.classList.remove('file-drop--clear-hover');
    },

    /** The status line under the file name. `state` picks its icon: 'busy' (spinner),
     *  'done' (✓), 'error' (✕) or 'warn' (⚠); none for an empty row. */
    setStats(text, state = '') {
      statsText.textContent = text;
      stats.dataset.state = state;
    },
    showStats: () => stats.classList.add('file-drop__stats--visible'),
    hideStats: () => stats.classList.remove('file-drop__stats--visible'),
  };
}
