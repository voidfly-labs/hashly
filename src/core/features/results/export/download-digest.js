import { Download } from '~core/lib/export/download.js';

import { toChecksumFile } from './checksum-file.js';

/** Downloads `hash` (the digest of `algoId`): as the checksum file of `sourceName` when a file was
 *  hashed (see toChecksumFile), in whatever output format. Hashed text has no file name, so it is
 *  the digest alone and a newline, named `<appName>-text_<date>.<ext>`. The last argument is the
 *  app's config (`slugify`, `appName`). */
export function downloadDigest(hash, algoId, sourceName, { slugify, appName }) {
  const ext = slugify(algoId);
  const checksumFile = toChecksumFile(hash, ext, sourceName);
  if (checksumFile) {
    Download.trigger(checksumFile.content, checksumFile.filename);
    return;
  }
  Download.trigger(`${hash}\n`, `${appName}-text_${Download.filenameDate()}.${ext}`);
}
