// A hash reference file (a lone hash, or a checksum list like SHA256SUMS) is tiny.
// Anything bigger isn't one, and reading it into the field would only be noise.
export const MAX_REFERENCE_BYTES = 256 * 1024;
// A real reference line is far shorter; this just keeps garbage out of the field.
const MAX_LINE_LENGTH = 1024;

function _baseName(path) {
  return path.split(/[\\/]/).pop();
}

/** Reads one checksum-file line as { name, line }, where `line` is what to put in
 *  the field. Handles the GNU/coreutils layout ("<hash>  name", "<hash> *name") and
 *  the BSD layout ("SHA256 (name) = <hash>"). `name` is null when the line has none.
 *  Plain string operations rather than regexes: this runs on arbitrary file text. */
function _parseLine(raw) {
  const open = raw.indexOf('(');
  const close = raw.lastIndexOf(')');
  if (open > 0 && close > open) {
    const algo = raw.slice(0, open).trim();
    const rest = raw.slice(close + 1).trim();
    const hash = rest.startsWith('=') ? rest.slice(1).trim() : '';
    if (algo && hash && !/\s/.test(algo) && !/\s/.test(hash)) {
      return { name: _baseName(raw.slice(open + 1, close)), line: hash };
    }
  }

  const gap = raw.search(/\s/);
  if (gap <= 0) return { name: null, line: raw };
  const name = raw.slice(gap).trim().replace(/^\*/, '');
  return { name: name ? _baseName(name) : null, line: raw };
}

/** Picks the reference out of a file's text. A checksum list names many files, so
 *  prefer the line for `fileName` (the file being hashed); otherwise the first
 *  line. Blank lines and `#` / `;` comments are skipped. Returns '' for a file
 *  with nothing in it. */
export function pickReferenceLine(text, fileName = '') {
  const entries = text
    .split(/\r?\n/)
    .map((raw) => raw.trim())
    .filter((raw) => raw && !raw.startsWith('#') && !raw.startsWith(';'))
    .map(_parseLine);
  if (!entries.length) return '';

  const wanted = fileName && _baseName(fileName);
  const entry = (wanted && entries.find((e) => e.name === wanted)) || entries[0];
  return entry.line.slice(0, MAX_LINE_LENGTH);
}

/** Reads a chosen or dropped file as a hash reference. Resolves `{ line }` with the
 *  reference to use, or `{ error }` with a message for the user when it can't be used. */
export async function readReferenceFile(file, fileName = '') {
  if (file.size > MAX_REFERENCE_BYTES) {
    return { error: `File is too large to be a hash reference (max ${MAX_REFERENCE_BYTES / 1024} KB)` };
  }
  let text;
  try {
    text = await file.text();
  } catch {
    return { error: "Couldn't read that file" };
  }
  const line = pickReferenceLine(text, fileName);
  return line ? { line } : { error: 'That file has no hash in it' };
}
