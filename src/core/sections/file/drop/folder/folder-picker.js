import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

import { pickedFolderFiles } from './picked-folder.js';

/** Picking a folder in the drop zone (markup: folder-link.html, folder-button.html). The "select a folder" link of
 *  the empty zone and the folder button of a loaded one both open the hidden `webkitdirectory` input, and
 *  what it picks goes to `onFiles(files, { truncated })` as a dropped folder would (`path` is the file's
 *  place in the folder, see picked-folder.js). A browser without `webkitdirectory` keeps both hidden.
 *  `getLimit()` is how many files to keep, `notify(message)` a short notice at the zone and
 *  `mirrorInput(files)` puts the files into the zone's own input. */
export function initFolderPicker(drop, { getLimit, onFiles, notify, mirrorInput }) {
  const folderInput = document.getElementById('fileFolderInput');
  const triggers = drop.querySelectorAll('.file-drop__folder, .file-drop__pick-folder');
  initButtonTooltip(drop.querySelector('.file-drop__pick-folder'), 'Select a folder');

  if (!('webkitdirectory' in folderInput)) return;
  triggers.forEach((btn) => {
    btn.hidden = false;
    btn.addEventListener('click', () => folderInput.click());
  });
  folderInput.addEventListener('change', () => {
    const { files, truncated } = pickedFolderFiles(folderInput.files, getLimit());
    folderInput.value = '';
    if (!files.length) return notify('No files found in the folder');
    mirrorInput(files.map(({ file }) => file));
    onFiles(files, { truncated });
  });
}
