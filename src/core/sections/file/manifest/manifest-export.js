import { checksumListName, toChecksumList } from '~core/features/results/export/checksum-file.js';
import { Download } from '~core/lib/download.js';
import { Format } from '~core/lib/format.js';
import { Checkmark } from '~core/ui/button/checkmark.js';
import { copyWithFeedback } from '~core/ui/button/copy-feedback.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

/** The checksum file of all the files of the queue, for several files and a single algorithm: what the
 *  manifest row (./manifest-row.js) stands for, and what its buttons copy and download. A checksum
 *  file holds one algorithm's digests, so there is none when more than one is visible.
 *
 *  `algorithms` are the app's, `isHidden(id)` says whether one is hidden, `getJobs()` the files of the
 *  queue (see ../file-queue.js), `getFormat()` the output format the digests are written in, and
 *  `slugify(id)` the app's slug of an algorithm (the file's name comes from it).
 *
 *  Returns `{ row, copy, download }`:
 *   - `row()`: how the manifest row stands, `{ name, size, ready }`, or null when there is no manifest.
 *     It is `ready` once every file is done (a failed one keeps it from being, so the list is never
 *     short of a file without saying so) and there is a digest to put in it.
 *   - `copy(button)` and `download(button)`: the buttons' clicks. */
export function createManifestExport({ algorithms, isHidden, getJobs, getFormat, slugify }) {
  /** The algorithm of the manifest: the one that is visible, if it is the only one. */
  function singleAlgorithm() {
    const visible = algorithms.filter(({ id }) => !isHidden(id));
    return visible.length === 1 ? visible[0] : null;
  }

  /** The `{ hash, name }` of the files that are done and have a digest of `algo`, as the rows show it. */
  function entriesOf(algo) {
    const format = getFormat();
    return getJobs()
      .filter(({ status, rawHexMap }) => status === 'done' && rawHexMap.get(algo.id))
      .map(({ name, rawHexMap }) => ({ hash: Format.applyFormat(rawHexMap.get(algo.id), format), name }));
  }

  function file() {
    const algo = singleAlgorithm();
    return toChecksumList(entriesOf(algo), slugify(algo.id));
  }

  return {
    row() {
      const jobs = getJobs();
      const algo = singleAlgorithm();
      if (jobs.length < 2 || !algo) return null;
      const ext = slugify(algo.id);
      const finished = jobs.every(({ status }) => status === 'done');
      const entries = entriesOf(algo);
      if (!finished || !entries.length) return { name: checksumListName(ext), size: 0, ready: false };
      const { filename, content } = toChecksumList(entries, ext);
      return { name: filename, size: new TextEncoder().encode(content).length, ready: true };
    },

    async copy(button) {
      await copyWithFeedback(file().content, { button });
    },

    download(button) {
      const { content, filename } = file();
      Download.trigger(content, filename);
      Tooltip.flash(button);
      Checkmark.flash(button);
    },
  };
}
