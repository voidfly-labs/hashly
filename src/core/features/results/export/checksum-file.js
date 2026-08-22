const HEX = /^[0-9a-f]+$/i;

/** A name as GNU coreutils writes it when it holds a backslash or a newline: those are escaped
 *  (`\\`, `\n`) and the whole line gets a leading backslash, or `-c` would read the name wrong. */
const needsEscape = (name) => /[\\\n]/.test(name);
const escapeName = (name) => name.replaceAll('\\', '\\\\').replaceAll('\n', '\\n');

/** The file a "download hash" button should write for a named file, in the format `sha256sum -c`,
 *  `md5sum -c`, `b2sum -c` & co. read (GNU coreutils): one line `<digest>  <filename>`,
 *  newline-terminated, in a file named `<filename>.<ext>` (`ubuntu.iso.sha256`), where `ext` is the app's slug
 *  of the algorithm name (`APP_CONFIG.slugify`).
 *  Returns `{ filename, content }`, or null with no source filename (hashed text), which the caller
 *  downloads as the plain digest.
 *
 *  Every output format gets this layout, so downloads are named and shaped alike. Only a hex digest
 *  is something a checksum tool can read back; it is written in lowercase, the form every tool
 *  emits. A Base64 or binary digest is written as it is shown. A name with a backslash or newline in
 *  it is escaped the way coreutils does (see `escapeName`). */
export function toChecksumFile(hash, ext, sourceName) {
  if (!sourceName) return null;
  const digest = HEX.test(hash) ? hash.toLowerCase() : hash;
  const line = needsEscape(sourceName) ? `\\${digest}  ${escapeName(sourceName)}` : `${digest}  ${sourceName}`;
  return { filename: `${sourceName}.${ext}`, content: `${line}\n` };
}
