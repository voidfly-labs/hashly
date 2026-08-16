import { toChecksumFile } from './checksum-file.js';
import { Download } from './download.js';

/** Downloads `hash` (the digest of `algoId`), as the checksum file of `sourceName` when it is the
 *  hex digest of a named file (see toChecksumFile). Otherwise, with Base64/binary output or hashed
 *  text, the digest alone, named `<source name without extension>.<ext>` or, with no source,
 *  `<appName>-<fileNoun>_<timestamp>.<ext>`. `app` is the app's config (`slugify`, `appName`, `fileNoun`). */
export function downloadDigest(hash, algoId, sourceName, { slugify, appName, fileNoun }) {
  const ext = slugify(algoId);
  const checksumFile = toChecksumFile(hash, ext, sourceName);
  if (checksumFile) {
    Download.trigger(checksumFile.content, checksumFile.filename);
    return;
  }
  const base = sourceName
    ? sourceName.replace(/\.[^.]+$/, '')
    : `${appName}-${fileNoun}_${Download.filenameSafeTimestamp()}`;
  Download.trigger(hash, `${base}.${ext}`);
}
