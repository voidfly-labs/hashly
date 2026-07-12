import { MAX_REFERENCE_BYTES, pickReferenceLine } from '~core/utils/reference-file.js';

import { Tooltip } from './tooltip.js';

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

    if (file.size > MAX_REFERENCE_BYTES) {
      onRejected(`File is too large to be a hash reference (max ${MAX_REFERENCE_BYTES / 1024} KB)`);
      return;
    }
    let text;
    try {
      text = await file.text();
    } catch {
      onRejected("Couldn't read that file");
      return;
    }
    const line = pickReferenceLine(text, getFileName());
    if (line) onText(line);
    else onRejected('That file has no hash in it');
  });

  btn.addEventListener('mouseenter', () => Tooltip.show(btn, 'Upload'));
  btn.addEventListener('mouseleave', () => Tooltip.hide());
  btn.addEventListener('focus', () => Tooltip.show(btn, 'Upload'));
  btn.addEventListener('blur', () => Tooltip.hide());
}
