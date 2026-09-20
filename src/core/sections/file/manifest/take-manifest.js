import { looksLikeManifestName } from '~core/features/verify/manifest.js';
import { readManifest } from '~core/features/verify/reference-file/reference-file.js';

/** A checksum list dropped among other files is taken out of them, to check the others against (see
 *  ~core/features/verify/manifest.js). `entries` are the `{ file, path }` of a drop. Resolves
 *  `{ manifest, files }`: the list as `{ name, entries }` and the other files, or no manifest and
 *  all of them. A single file is always taken for a file to hash, whatever it is called. */
export async function takeManifest(entries) {
  if (entries.length < 2) return { manifest: null, files: entries };
  for (const entry of entries.filter(({ path }) => looksLikeManifestName(path))) {
    const manifest = await readManifest(entry.file);
    if (manifest) return { manifest, files: entries.filter((other) => other !== entry) };
  }
  return { manifest: null, files: entries };
}
