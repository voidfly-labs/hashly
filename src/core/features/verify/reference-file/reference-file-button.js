import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

import { readReferenceFiles } from './reference-file.js';

// Matches the drop zone's "browse" wording; the icon alone says it opens a file picker.
const TIP = 'Browse';

/** Wires an "Upload" button that reads a file's text into the reference field.
 *  `onText(line)` gets the reference picked from the file (see ./reference-file.js), `onManifest(manifest)`
 *  the list, when it names several files;
 *  `onRejected(message)` runs when the file can't be used. `getFileName()` names the
 *  file currently being hashed, so a checksum list yields that file's own line. `hexLengths` are the
 *  digest lengths of the app (see ../manifest.js). */
export function initReferenceFileButton(btn, fileInput, { getFileName, hexLengths, onText, onManifest, onRejected }) {
  if (!btn || !fileInput) return;

  btn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const files = [...fileInput.files];
    // Reset so choosing the same file again still fires `change`.
    fileInput.value = '';
    if (!files.length) return;

    const { line, manifest, error } = await readReferenceFiles(files, getFileName(), hexLengths);
    if (error) onRejected(error);
    else if (manifest) onManifest(manifest);
    else onText(line);
  });

  initButtonTooltip(btn, TIP);
}
