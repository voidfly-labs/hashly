import { parseChecksumLine } from './checksum-line.js';
import { parseReference } from './reference.js';

// What a checksum list is usually called: SHA256SUMS, sha256sum.txt, SHASUMS256.txt, checksums.txt, app.sha256.
// Only a hint, the text is read before it is taken for one.
const MANIFEST_NAME = /sums?\d*(?:\.(?:txt|asc))?$|\.(?:md5|sha1|sha224|sha256|sha384|sha512|sum|sums|b2sum)$/i;
const MAX_LINE_LENGTH = 4096;
// A digest in a list is hex of at least this many characters, or Base64 of one of these sizes (in bytes):
// any short word is valid Base64, and a line of prose must not pass for a checksum.
const MIN_HEX_LENGTH = 8;
const DIGEST_BYTES = new Set([4, 8, 16, 20, 28, 32, 48, 64]);

const normalizeName = (name) => name.replaceAll('\\', '/').replace(/^(?:\.\/)+/, '');
const baseName = (name) => name.split('/').pop();
const endsAt = (path, tail) => path === tail || path.endsWith(`/${tail}`);

/** Whether `digest`, as written, plausibly is a hash whose hex is `hex`. */
function isDigest(digest, hex) {
  const token = digest.replace(/^0x/i, '');
  if (/^[\da-f]+$/i.test(token)) return token.length >= MIN_HEX_LENGTH && token.length % 2 === 0;
  return DIGEST_BYTES.has(hex.length / 2);
}

/** Whether a file's name looks like a checksum list's. */
export const looksLikeManifestName = (name) => MANIFEST_NAME.test(baseName(normalizeName(name)));

/** The `{ name, hex }` entries of a checksum list's text (see ./checksum-line.js for the layouts): one
 *  per line that holds a file name and a hash, the hash as lowercase hex. Blank lines, `#` and `;`
 *  comments and anything else are left out. */
export function parseManifest(text) {
  const entries = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.length > MAX_LINE_LENGTH || line.startsWith('#') || line.startsWith(';')) continue;
    const { digest, name } = parseChecksumLine(line);
    const ref = name && parseReference(digest);
    if (ref && isDigest(digest, ref.hex)) entries.push({ name: normalizeName(name), hex: ref.hex });
  }
  return entries;
}

/** The entry for the file called `fileName` (its path, if it came in a folder): the one with that very
 *  name, else the only one whose path ends the same way (a list written in the folder's parent, or
 *  inside it), else the only one with that file name. Null when there is none or it is ambiguous. */
export function findEntry(entries, fileName) {
  const name = normalizeName(fileName);
  const exact = entries.find((entry) => entry.name === name);
  if (exact) return exact;
  const related = entries.filter((entry) => endsAt(name, entry.name) || endsAt(entry.name, name));
  if (related.length === 1) return related[0];
  const sameFile = entries.filter((entry) => baseName(entry.name) === baseName(name));
  return sameFile.length === 1 ? sameFile[0] : null;
}

const FINISHED = new Set(['done', 'failed', 'stopped', 'skipped']);

/** What a manifest says of the files of a queue, as `{ text, lead, kind }` for the notice under the
 *  field (see status/verify-messages.js). `verdictOf(job)` is 'match', 'mismatch', 'unlisted' (not in
 *  the list) or null (nothing to compare it with) for a finished job. A single file the list covers has
 *  the usual notice of its own, so that gives null. */
export function describeManifest({ entries }, jobs, verdictOf) {
  if (jobs.length === 1 && findEntry(entries, jobs[0].name)) return null;
  if (!jobs.length) return { text: `${entries.length} files listed – drop the files to check` };
  const finished = jobs.filter((job) => FINISHED.has(job.status));
  if (jobs.length > 1 && finished.length < jobs.length)
    return { text: `Checking – ${finished.length} of ${jobs.length} files` };

  const tally = { match: 0, mismatch: 0, unlisted: 0, unchecked: 0 };
  for (const job of jobs) {
    if (!findEntry(entries, job.name)) tally.unlisted++;
    else if (job.status === 'done') tally[verdictOf(job) ?? 'unchecked']++;
    else tally.unchecked++;
  }
  const listed = new Set(jobs.map((job) => findEntry(entries, job.name)).filter(Boolean));
  const missing = entries.length - listed.size;

  const parts = [
    [tally.match, 'match'],
    [tally.mismatch, 'differ'],
    [tally.unlisted, 'not listed'],
    [missing, 'missing'],
    [tally.unchecked, 'not checked'],
  ]
    .filter(([count]) => count)
    .map(([count, label]) => `${count} ${label}`);

  if (parts.length === 1 && tally.match) {
    return { text: `Match – all ${tally.match} files`, lead: 'Match', kind: 'match' };
  }
  const lead = tally.mismatch ? 'Mismatch' : 'Incomplete';
  return { text: `${lead} – ${parts.join(', ')}`, lead, kind: tally.mismatch ? 'mismatch' : 'warn' };
}
