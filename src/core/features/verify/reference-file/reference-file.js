import { parseChecksumLine } from '~core/features/verify/checksum-line.js';
import { parseManifest } from '~core/features/verify/manifest.js';

// A hash reference file (a lone hash, or a checksum list like SHA256SUMS) is tiny.
// Anything bigger isn't one, and reading it into the field would only be noise.
export const MAX_REFERENCE_BYTES = 256 * 1024;
// A real reference line is far shorter; this just keeps garbage out of the field.
const MAX_LINE_LENGTH = 1024;

function _baseName(path) {
  return path.split(/[\\/]/).pop();
}

/** Reads one checksum-file line as { name, line }, where `line` is what to put in the field (the digest
 *  of a BSD line, else the line itself) and `name` the file's name, without its folders (null when
 *  the line has none). */
function _parseLine(raw) {
  const { digest, name, bsd } = parseChecksumLine(raw);
  return { name: name ? _baseName(name) : null, line: bsd ? digest : raw };
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

/** The text of `buffer`. UTF-16 is read when its byte order mark says so: Windows PowerShell's `>`
 *  and `Out-File` write checksum lists that way, and read as UTF-8 they come out as nothing but NULs.
 *  Anything else is UTF-8 (a BOM there is dropped by the decoder). */
export function decodeText(buffer) {
  const [a, b] = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));
  if (a === 0xff && b === 0xfe) return new TextDecoder('utf-16le').decode(buffer);
  if (a === 0xfe && b === 0xff) return new TextDecoder('utf-16be').decode(buffer);
  return new TextDecoder('utf-8').decode(buffer);
}

/** Reads a chosen or dropped file as a hash reference. Resolves `{ line }` with the reference to use,
 *  `{ manifest }` for a list of several files (see ../manifest.js), or `{ error }` with a message for the
 *  user when it can't be used. `hexLengths` are the digest lengths of the app (see ../manifest.js). */
export async function readReferenceFile(file, fileName = '', hexLengths) {
  if (file.size > MAX_REFERENCE_BYTES) {
    return { error: `File is too large to be a hash reference (max ${MAX_REFERENCE_BYTES / 1024} KB)` };
  }
  let text;
  try {
    text = decodeText(await file.arrayBuffer());
  } catch {
    return { error: "Couldn't read that file" };
  }
  // A list of several files is kept whole, to check each file against its own line.
  const entries = parseManifest(text, hexLengths);
  if (entries.length > 1) return { manifest: { name: file.name, entries } };
  const line = pickReferenceLine(text, fileName);
  return line ? { line } : { error: 'That file has no hash in it' };
}

/** A checksum list read from `file`, as `{ name, entries }` (see ../manifest.js), or null when it is
 *  too big, unreadable or holds no file name with a hash. */
export async function readManifest(file, hexLengths) {
  if (file.size > MAX_REFERENCE_BYTES) return null;
  try {
    const entries = parseManifest(decodeText(await file.arrayBuffer()), hexLengths);
    return entries.length ? { name: file.name, entries } : null;
  } catch {
    return null;
  }
}
