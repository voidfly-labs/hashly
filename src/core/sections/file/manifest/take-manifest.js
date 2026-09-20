import { looksLikeManifestName, mergeManifests } from '~core/features/verify/manifest.js';
import { readManifest } from '~core/features/verify/reference-file/reference-file.js';

/** Whether `path` is the name of another dropped file (one of `paths`) with an extension added, as
 *  `app.iso.sha256` is next to `app.iso`. */
function isSidecar(path, paths) {
  const dot = path.lastIndexOf('.');
  return dot > 0 && paths.has(path.slice(0, dot));
}

/** Checksum lists dropped among other files are taken out of them, to check the others against (see
 *  ~core/features/verify/manifest.js). `entries` are the `{ file, path }` of a drop. A list is a file
 *  with a conventional name (`SHA256SUMS`, `checksums.txt`) or the name of another dropped file with an
 *  extension added (`app.iso.sha256`), whose text holds file names with hashes. Several are put
 *  together. Resolves `{ manifest, files }`: the list as `{ name, entries }` and the other files, or no
 *  manifest and all of them. A single file is always taken for a file to hash, whatever it is called,
 *  and so is the last one left of a drop that is all lists. `hexLengths` are the digest lengths of the
 *  app (see ~core/features/verify/manifest.js). */
export async function takeManifest(entries, hexLengths) {
  if (entries.length < 2) return { manifest: null, files: entries };
  const paths = new Set(entries.map(({ path }) => path));
  const lists = new Map(); // entry → its list
  for (const entry of entries) {
    if (lists.size >= entries.length - 1) break;
    if (!looksLikeManifestName(entry.path) && !isSidecar(entry.path, paths)) continue;
    const list = await readManifest(entry.file, hexLengths);
    if (list) lists.set(entry, list);
  }
  if (!lists.size) return { manifest: null, files: entries };
  const manifest = mergeManifests([...lists.values()]);
  return { manifest, files: entries.filter((entry) => !lists.has(entry)) };
}
