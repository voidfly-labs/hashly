import { readReferenceFile } from '~core/utils/reference-file.js';

import { Tooltip } from './tooltip.js';

// Matches the drop zone's "browse" wording; the icon alone says it opens a file picker.
const TIP = 'Browse';

/** Wires an "Upload" button that reads a file's text into the reference field.
 *  `onText(line)` gets the reference picked from the file (see utils/reference-file.js);
 *  `onRejected(message)` runs when the file can't be used. `getFileName()` names the
 *  file currently being hashed, so a checksum list yields that file's own line. */
export function initReferenceFileButton(btn, fileInput, { getFileName, onText, onRejected }) {
  if (!btn || !fileInput) return;

  btn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const [file] = fileInput.files;
    // Reset so choosing the same file again still fires `change`.
    fileInput.value = '';
    if (!file) return;

    const { line, error } = await readReferenceFile(file, getFileName());
    if (error) onRejected(error);
    else onText(line);
  });

  btn.addEventListener('mouseenter', () => Tooltip.show(btn, TIP));
  btn.addEventListener('mouseleave', () => Tooltip.hide());
  btn.addEventListener('focus', () => Tooltip.show(btn, TIP));
  btn.addEventListener('blur', () => Tooltip.hide());
}
