const HEX = /^[0-9a-f]+$/i;

/** The file a "download hash" button should write, in the format `sha256sum -c`,
 *  `md5sum -c`, `b2sum -c` & co. read (GNU coreutils): one line `<hex digest>  <filename>`,
 *  newline-terminated, in a file named `<filename>.<algorithm>` (`ubuntu.iso.sha256`).
 *  Returns `{ filename, content }`, or null when there is nothing to put in that format:
 *  no source filename (hashed text), or a digest shown as Base64 or binary, which no
 *  checksum tool reads. The caller then keeps its plain "just the digest" download.
 *
 *  The digest is written in lowercase, the form every tool emits. */
export function toChecksumFile(hash, algoId, sourceName) {
  if (!sourceName || !HEX.test(hash)) return null;
  const ext = algoId.toLowerCase().replaceAll('-', '');
  return { filename: `${sourceName}.${ext}`, content: `${hash.toLowerCase()}  ${sourceName}\n` };
}
