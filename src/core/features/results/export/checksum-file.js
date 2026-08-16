const HEX = /^[0-9a-f]+$/i;

/** The file a "download hash" button should write for a named file, in the format `sha256sum -c`,
 *  `md5sum -c`, `b2sum -c` & co. read (GNU coreutils): one line `<digest>  <filename>`,
 *  newline-terminated, in a file named `<filename>.<ext>` (`ubuntu.iso.sha256`), where `ext` is the app's slug
 *  of the algorithm name (`APP_CONFIG.slugify`).
 *  Returns `{ filename, content }`, or null with no source filename (hashed text), which the caller
 *  downloads as the plain digest.
 *
 *  Every output format gets this layout, so downloads are named and shaped alike. Only a hex digest
 *  is something a checksum tool can read back; it is written in lowercase, the form every tool
 *  emits. A Base64 or binary digest is written as it is shown. */
export function toChecksumFile(hash, ext, sourceName) {
  if (!sourceName) return null;
  const digest = HEX.test(hash) ? hash.toLowerCase() : hash;
  return { filename: `${sourceName}.${ext}`, content: `${digest}  ${sourceName}\n` };
}
