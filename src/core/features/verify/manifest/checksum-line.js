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

/** Reads one checksum-file line as `{ digest, name, bsd }`: the GNU/coreutils layout ("<digest>  name",
 *  "<digest> *name"), the BSD layout ("SHA256 (name) = <digest>", `bsd` true) or a hand-written
 *  "<digest> name". `name` is null when the line has none, and as written otherwise (a path may be in it).
 *  Plain string operations rather than regexes: this runs on arbitrary file text. */
export function parseChecksumLine(raw) {
  const open = raw.indexOf('(');
  const close = raw.lastIndexOf(')');
  if (open > 0 && close > open) {
    const algo = raw.slice(0, open).trim();
    const rest = raw.slice(close + 1).trim();
    const digest = rest.startsWith('=') ? rest.slice(1).trim() : '';
    if (algo && digest && !/\s/.test(algo) && !/\s/.test(digest)) {
      return { digest, name: raw.slice(open + 1, close), bsd: true };
    }
  }

  const split = splitChecksumLine(raw);
  if (split.name) return { ...split, bsd: false };

  // No two-space separator: a hand-written "<digest> name", unless the line is a binary digest, whose
  // bytes are separated by single spaces too.
  const gap = raw.search(/\s/);
  if (gap <= 0 || BINARY_BYTE_RE.test(raw.slice(0, gap))) return { digest: raw, name: null, bsd: false };
  const rest = raw.slice(gap).trim();
  return { digest: raw.slice(0, gap), name: rest || null, bsd: false };
}
