import { parseReference } from '~core/features/verify/reference.js';

import { parseChecksumLine } from './checksum-line.js';

// What a list of the checksums of many files is usually called: SHA256SUMS, sha256sum.txt, SHASUMS256.txt,
// checksums.txt. Only a hint, the text is read before it is taken for one. A checksum file named after
// another file (`app.iso.sha256`) is not one of these: see sections/file/manifest/take-manifest.js.
const MANIFEST_NAME = /sums?\d*(?:\.(?:txt|asc))?$/i;
const MAX_LINE_LENGTH = 4096;
// A digest in a list is hex of at least this many characters, or Base64 of one of these sizes (in bytes):
// any short word is valid Base64, and a line of prose must not pass for a checksum.
const MIN_HEX_LENGTH = 8;
const DIGEST_BYTES = new Set([4, 8, 16, 20, 28, 32, 48, 64]);

const normalizeName = (name) => name.replaceAll('\\', '/').replace(/^(?:\.\/)+/, '');
const baseName = (name) => name.split('/').pop();
const endsAt = (path, tail) => path === tail || path.endsWith(`/${tail}`);
const segments = (path) => path.split('/').length;

/** The hex lengths of the digests of `algorithms` (their `hexLen`), which a list of this app may hold
 *  though they are shorter than MIN_HEX_LENGTH (CRC-8, 16, 24) or odd (CRC-82). */
export const hexLengthsOf = (algorithms) => new Set(algorithms.map(({ hexLen }) => hexLen));

/** Whether `digest`, as written, plausibly is a hash whose hex is `hex`. */
function isDigest(digest, hex, hexLengths) {
  const token = digest.replace(/^0x/i, '');
  if (/^[\da-f]+$/i.test(token)) {
    return hexLengths.has(token.length) || (token.length >= MIN_HEX_LENGTH && token.length % 2 === 0);
  }
  return DIGEST_BYTES.has(hex.length / 2);
}

/** Several checksum lists (`{ name, entries }`, see `readManifest`) as one: the first's name and how many more
 *  there are, all their entries. One list stays as it is, and none gives null. */
export function mergeManifests(lists) {
  const [first, ...rest] = lists;
  if (!rest.length) return first ?? null;
  return { name: `${first.name} +${rest.length} more`, entries: lists.flatMap((list) => list.entries) };
}

/** Whether a file's name looks like that of a list of the checksums of many files. */
export const looksLikeManifestName = (name) => MANIFEST_NAME.test(baseName(normalizeName(name)));

/** The `{ name, hex }` entries of a checksum list's text (see ./checksum-line.js for the layouts): one
 *  per line that holds a file name and a hash, the hash as lowercase hex. Blank lines, `#` and `;`
 *  comments and anything else are left out. `hexLengths` (see hexLengthsOf) are the digest lengths
 *  the app produces, which are taken for hashes whatever their size. */
export function parseManifest(text, hexLengths = new Set()) {
  const entries = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.length > MAX_LINE_LENGTH || line.startsWith('#') || line.startsWith(';')) continue;
    const { digest, name } = parseChecksumLine(line);
    const ref = name && parseReference(digest);
    if (ref && isDigest(digest, ref.hex, hexLengths)) entries.push({ name: normalizeName(name), hex: ref.hex });
  }
  return entries;
}

// What `resolveName` answers when two or more names fit equally well, as against null for none.
const AMBIGUOUS = Symbol('ambiguous');
const pick = (names) => (names.length === 1 ? names[0] : AMBIGUOUS);
const asWritten = (text) => text;
const lowerCase = (text) => text.toLowerCase();

/** The names in `names` whose path ends the same way as `name`'s, in the most folders. */
function closestNames(names, name, key) {
  const related = names.filter((other) => endsAt(name, key(other)) || endsAt(key(other), name));
  const tail = (other) => Math.min(segments(other), segments(name));
  const longest = Math.max(...related.map(tail));
  return related.filter((other) => tail(other) === longest);
}

/** The name in `names` (those of a list's entries) for the file called `fileName` (its path, if it came in
 *  a folder): that very name, else the one whose path ends the same way in the most folders (a list
 *  written in the folder's parent, or inside it), if one is ahead of the others, else the only one
 *  with that file name. Null when there is none, `AMBIGUOUS` when several fit equally. `key` is what
 *  names are compared by (as written, or lower case). */
function resolveName(names, fileName, key = asWritten) {
  const name = key(normalizeName(fileName));
  const exact = names.filter((other) => key(other) === name);
  if (exact.length) return pick(exact);
  const best = closestNames(names, name, key);
  if (best.length === 1) return best[0];
  const sameFile = names.filter((other) => baseName(key(other)) === baseName(name));
  if (sameFile.length === 1) return sameFile[0];
  return best.length || sameFile.length ? AMBIGUOUS : null;
}

/** The entry name for `fileName` as `resolveName` says, or else, when nothing fits, the one that fits
 *  without regard to case (a list made on Windows or macOS need not spell a name as the file does;
 *  names that differ only in case stay two, as they are on Linux). Null when there is none or it is ambiguous. */
function lookUpName(names, fileName) {
  let name = resolveName(names, fileName);
  if (name === null) name = resolveName(names, fileName, lowerCase);
  return name === AMBIGUOUS ? null : name;
}

/** Which entries of a list each of the dropped files is listed under, as a `Map` from `fileNames` to
 *  entries (a file a list holds under several algorithms has one for each). A file is listed under an
 *  entry of its own path, or else, as `resolveName` says, under one that ends the same way (ignoring case,
 *  if nothing does with it), which only
 *  one file can have: where an entry is the path of one file it is not another's, and where several
 *  files would end the same way as it, none is listed under it (`a/x.txt` and `b/x.txt` with an entry
 *  `x.txt`). A file with no entry is left out. */
export function assignEntries(entries, fileNames) {
  const names = [...new Set(entries.map((entry) => entry.name))];
  const paths = new Map(fileNames.map((fileName) => [fileName, normalizeName(fileName)]));
  const own = new Set([...paths.values()].filter((path) => names.includes(path)));
  const others = names.filter((name) => !own.has(name));
  const claims = new Map(); // entry name → the files that end the same way as it
  for (const [fileName, path] of paths) {
    const name = own.has(path) ? null : lookUpName(others, fileName);
    if (name !== null) claims.set(name, [...(claims.get(name) ?? []), fileName]);
  }
  const under = (name) => entries.filter((entry) => entry.name === name);
  const assigned = new Map();
  for (const [fileName, path] of paths) if (own.has(path)) assigned.set(fileName, under(path));
  for (const [name, files] of claims) if (files.length === 1) assigned.set(files[0], under(name));
  return assigned;
}

const FINISHED = new Set(['done', 'failed', 'stopped', 'skipped']);

/** How many files `entries` are for: a list may hold a file once for each algorithm. */
export const countFiles = (entries) => new Set(entries.map((entry) => entry.name)).size;

/** What the notice says while a manifest of `count` files has no files to check yet. */
function describeWaiting(count) {
  const [files, them] = count === 1 ? ['file', 'it'] : ['files', 'them'];
  return `${count} ${files} to check – drop ${them} above`;
}

/** What a manifest says of the files of a queue, as `{ text, lead, kind }` for the notice under the
 *  field (see status/verify-messages.js). `verdictOf(job)` is 'match', 'mismatch', 'unlisted' (not in
 *  the list) or 'unchecked' (nothing to compare it with) for a finished job, and `entriesOf(job)` the entries
 *  that go with a job (the assignment is worked out once, by the verify field). A single file the list covers
 *  has the usual notice of its own, so that gives null. */
export function describeManifest({ entries }, jobs, verdictOf, entriesOf) {
  if (jobs.length === 1 && entriesOf(jobs[0]).length) return null;
  if (!jobs.length) return { text: describeWaiting(countFiles(entries)) };
  const finished = jobs.filter((job) => FINISHED.has(job.status));
  if (jobs.length > 1 && finished.length < jobs.length)
    return { text: `Checking – ${finished.length} of ${jobs.length} files` };

  const tally = { match: 0, mismatch: 0, unlisted: 0, unchecked: 0 };
  for (const job of jobs) {
    if (!entriesOf(job).length) tally.unlisted++;
    else if (job.status === 'done') tally[verdictOf(job)]++;
    else tally.unchecked++;
  }
  const listed = new Set(jobs.flatMap(entriesOf).map((entry) => entry.name));
  const missing = countFiles(entries) - listed.size;

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
