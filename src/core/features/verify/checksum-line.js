// GNU coreutils puts two spaces between the digest and the file name ("<digest>  name"), or a space
// and a star for binary mode ("<digest> *name"); a tab is accepted too. A digest never holds any of
// these: Base64 has no whitespace, and a binary digest separates its bytes with single spaces. So
// the first such separator tells where the digest ends, which a name with spaces in it can't blur.
/** One byte of a binary digest: eight bits. */
export const BINARY_BYTE_RE = /^[01]{8}$/;

const SEPARATOR = / {2,}|\t| \*/;

const unescapeName = (name) => name.replaceAll(/\\([\\n])/g, (_, c) => (c === 'n' ? '\n' : '\\'));

/** Splits a checksum-file line at its separator: `{ digest, name }`, with `name` null when the line
 *  has none (a bare digest, or one with single-space groups). `name` is as written, bar the star. */
export function splitChecksumLine(raw) {
  let line = raw.trim();
  // A leading backslash says the name is escaped (`\\` and `\n`, as GNU writes a name holding either).
  const escaped = line.startsWith('\\');
  if (escaped) line = line.slice(1);
  const at = line.search(SEPARATOR);
  if (at <= 0) return { digest: line, name: null };
  const written = line.slice(at).trim().replace(/^\*/, '');
  const name = escaped ? unescapeName(written) : written;
  return { digest: line.slice(0, at), name: name || null };
}
