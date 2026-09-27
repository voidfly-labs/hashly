// What a file system takes for one name, in bytes (UTF-8): ext4, APFS and NTFS all stop near here.
const MAX_BYTES = 255;

const byteLength = (text) => new TextEncoder().encode(text).length;

const isUnsafe = (ch) => ch === '\\' || ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) === 0x7f;

/** The name of the file a download of `sourceName`'s checksum is saved as: `<name><suffix>`. Only
 *  the last part of a path stands in it (`docs/a.pdf` is saved as `a.pdf.sha256`; the path stays in
 *  the file's content, where a checksum tool needs it). A backslash or control character is
 *  replaced, and a name too long for a file system is cut at its end, so the suffix stays. */
export function checksumDownloadName(sourceName, suffix) {
  const chars = [...sourceName.split('/').pop()].map((ch) => (isUnsafe(ch) ? '_' : ch));
  if (!chars.length) chars.push('file');
  while (chars.length > 1 && byteLength(chars.join('') + suffix) > MAX_BYTES) chars.pop();
  return `${chars.join('')}${suffix}`;
}
