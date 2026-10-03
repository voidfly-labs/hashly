import { looksLikeManifestName } from '~core/features/verify/manifest/manifest.js';

import { walkDirectory } from './read-entries.js';

/** What a drop holds, taken at once: its entries exist only while the drop event is being handled,
 *  and are what tell a folder from a file (a folder arrives in `dataTransfer.files` as a File that
 *  cannot be read). Each is `{ file }` or `{ directory }`. */
function sourcesOf(dataTransfer) {
  const items = [...(dataTransfer?.items ?? [])].filter((item) => item.kind === 'file');
  // No entries to ask (an old browser): the files as given.
  if (!items.some((item) => item.webkitGetAsEntry)) return [...(dataTransfer?.files ?? [])].map((file) => ({ file }));

  return items.flatMap((item) => {
    const entry = item.webkitGetAsEntry();
    if (entry?.isDirectory) return [{ directory: entry }];
    const file = item.getAsFile();
    return file ? [{ file }] : [];
  });
}

/** The files of a drop, folders read through: a promise of `{ files, truncated, hadFolder }`.
 *  `files` are `{ file, path }` (`path` is the file's name, or its place in a dropped folder, "docs/a.pdf"),
 *  `truncated` says there were more than `limit` besides checksum lists, which the caller trims to. Only
 *  the first `limit + 1` are looked for, however large a folder is. */
export async function droppedFiles(dataTransfer, limit) {
  const sources = sourcesOf(dataTransfer); // before the first await
  const found = [];
  // Checksum lists are not counted: they are taken out of the files to hash later (take-manifest.js).
  let counted = 0;
  const add = (item) => {
    found.push(item);
    if (!looksLikeManifestName(item.path)) counted++;
  };
  const enough = () => counted > limit;
  for (const source of sources) {
    if (enough()) break;
    if (source.file) add({ file: source.file, path: source.file.name });
    else await walkDirectory(source.directory, add, enough);
  }
  return {
    files: found,
    truncated: enough(),
    hadFolder: sources.some(({ directory }) => directory),
  };
}
