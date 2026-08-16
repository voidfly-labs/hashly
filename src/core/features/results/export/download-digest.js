import { Download } from '~core/lib/download.js';

import { toChecksumFile } from './checksum-file.js';

/** Downloads `hash` (the digest of `algoId`): as the checksum file of `sourceName` when a file was
 *  hashed (see toChecksumFile), in whatever output format. Hashed text has no file name, so it is
 *  the digest alone, named `<appName>-<fileNoun>_<timestamp>.<ext>`. The last argument is the
 *  app's config (`slugify`, `appName`, `fileNoun`). */
export function downloadDigest(hash, algoId, sourceName, { slugify, appName, fileNoun }) {
  const ext = slugify(algoId);
  const checksumFile = toChecksumFile(hash, ext, sourceName);
  if (checksumFile) {
    Download.trigger(checksumFile.content, checksumFile.filename);
    return;
  }
  Download.trigger(hash, `${appName}-${fileNoun}_${Download.filenameSafeTimestamp()}.${ext}`);
}
