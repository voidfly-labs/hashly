// Files the operating system leaves in a folder: not something anyone means to hash.
const JUNK = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);

/** Whether a file is one the operating system leaves in a folder. */
export const isJunk = (name) => JUNK.has(name.toLowerCase());

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });

const batchOf = (reader) => new Promise((resolve, reject) => reader.readEntries(resolve, reject));
const fileOf = (entry) => new Promise((resolve, reject) => entry.file(resolve, reject));

/** Every entry of a directory: a reader hands them over in batches (100 at a time in Chrome), until
 *  one comes back empty. */
async function entriesOf(directory) {
  const reader = directory.createReader();
  const entries = [];
  for (;;) {
    const batch = await batchOf(reader);
    if (!batch.length) return entries;
    entries.push(...batch);
  }
}

/** Walks a dropped folder (a FileSystemDirectoryEntry), depth first and by name, calling
 *  `add({ file, path })` for each file in it (`path` is relative to the folder's parent, "docs/a/b.pdf").
 *  Stops as soon as `done()` says so, so a huge folder is not read to its end for a few files. What
 *  cannot be read is left out. */
export async function walkDirectory(directory, add, done) {
  let entries;
  try {
    entries = await entriesOf(directory);
  } catch {
    return;
  }
  for (const entry of entries.sort(byName)) {
    if (done()) return;
    if (entry.isDirectory) {
      await walkDirectory(entry, add, done);
    } else if (!isJunk(entry.name)) {
      try {
        add({ file: await fileOf(entry), path: entry.fullPath.replace(/^\//, '') });
      } catch {
        // an unreadable file: left out
      }
    }
  }
}
