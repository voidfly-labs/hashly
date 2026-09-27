import { isJunk } from '~core/sections/file/drop/read-entries.js';

const collator = new Intl.Collator(undefined, { numeric: true });

/** Orders paths as a dropped folder is read: folder by folder, each by name. */
const byPath = (a, b) => {
  const x = a.path.split('/');
  const y = b.path.split('/');
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const order = collator.compare(x[i], y[i]);
    if (order) return order;
  }
  return x.length - y.length;
};

/** The files of a folder chosen with the picker, as a drop would give them: `{ files, truncated }`.
 *  `path` is `webkitRelativePath` ("docs/a.pdf"), OS junk is left out and at most `limit` files are kept. */
export function pickedFolderFiles(fileList, limit) {
  const found = [...fileList]
    .filter((file) => !isJunk(file.name))
    .map((file) => ({ file, path: file.webkitRelativePath || file.name }))
    .sort(byPath);
  return { files: found.slice(0, limit), truncated: found.length > limit };
}
