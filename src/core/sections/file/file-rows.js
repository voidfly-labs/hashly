import { createHashProgress } from '~core/features/results/hash-progress.js';
import { setHashEmpty } from '~core/features/results/result.js';
import {
  buildResultRow,
  hideRow,
  setHashText,
  setRowActions,
  showRow,
  wireResultRow,
} from '~core/features/results/result-row.js';
import { Format } from '~core/lib/format.js';

/** The result rows of the File section, one per algorithm, appended to `resultsEl`, and what each
 *  says as a file is hashed: a progress bar while computing, then its digest, or why there is none.
 *
 *  `isHidden(id)` says whether an algorithm is hidden (hidden rows are left as they are, bar the
 *  ones asked for by name), `hasFile()` whether a file is loaded. `handlers` is what a row's badge,
 *  buttons and click do: `onToggle(id)`, `onCopy(id)`, `onDownload(id)` and `getHash(id)` (the digest
 *  as shown, '' while there is none).
 *
 *  A row is `{ row, badge, hash, copy, download, progress }`, see `get`. `showDigests` and `reformat`
 *  return the `[{ hash, algo }]` they now show, for the history. */
export function createFileRows({ resultsEl, algorithms, isHidden, hasFile, handlers }) {
  const rows = new Map();

  for (const { id } of algorithms) {
    const els = buildResultRow({ prefix: 'file', algoId: id, emptyText: 'no file selected', withStatus: true });
    resultsEl.appendChild(els.row);
    els.progress = createHashProgress({ row: els.row, hash: els.hash, algoId: id });
    rows.set(id, els);

    wireResultRow(els, {
      isHidden: () => isHidden(id),
      onToggle: () => handlers.onToggle(id),
      onDownload: () => handlers.onDownload(id),
      onCopy: () => handlers.onCopy(id),
      getHash: () => handlers.getHash(id),
    });

    // Apply initial hidden state if set before the rows are built.
    if (isHidden(id)) hideRow(els);
  }

  const visible = () => algorithms.filter(({ id }) => !isHidden(id));

  /** What a visible row with no digest says: nothing was chosen, or the file was hashed (or its
   *  run stopped) without this algorithm, which was hidden at the time. */
  const emptyText = () => (hasFile() ? 'not computed' : 'no file selected');

  return {
    get: (id) => rows.get(id),

    /** Hides one algorithm's row, ending its progress. */
    hide(id) {
      const els = rows.get(id);
      els.progress.stop();
      hideRow(els);
    },

    /** Shows one algorithm's row again, with `digest` if the file has been hashed with it, and
     *  otherwise saying so. */
    show: (id, digest) => showRow(rows.get(id), digest, emptyText()),

    /** Enters computing state: each visible row shows a progress fill and its hash cell scrambled
     *  characters in place of the digest (see features/results/hash-progress.js). */
    startComputing() {
      for (const { id } of visible()) {
        const els = rows.get(id);
        els.progress.start();
        setHashEmpty(els.hash, false);
      }
    },

    /** Moves the progress bar of every visible row to `ratio` (0–1). */
    setProgress(ratio) {
      for (const { id } of visible()) rows.get(id).progress.set(ratio);
    },

    /** Enables or disables the Copy and Download buttons of the visible rows. */
    setActionsEnabled(enabled) {
      for (const [id, els] of rows) {
        if (!isHidden(id)) setRowActions(els, enabled);
      }
    },

    /** Shows the digests of the file just hashed (`hexMap`: `Map<id, hex>`) in `format`. A visible
     *  row without one was hidden when the file was hashed, and says so. */
    showDigests(hexMap, format) {
      const items = [];
      for (const { id } of visible()) {
        const els = rows.get(id);
        const hex = hexMap.get(id);
        els.progress.stop();
        if (!hex) {
          setHashText(els.hash, emptyText());
          setHashEmpty(els.hash, true);
          continue;
        }
        const hash = Format.applyFormat(hex, format);
        setHashText(els.hash, hash);
        items.push({ hash, algo: id });
      }
      return items;
    },

    /** Rewrites the digests already shown in another `format`. */
    reformat(hexMap, format) {
      const items = [];
      for (const { id } of visible()) {
        const hex = hexMap.get(id);
        if (!hex) continue;
        const hash = Format.applyFormat(hex, format);
        setHashText(rows.get(id).hash, hash);
        items.push({ hash, algo: id });
      }
      return items;
    },

    /** Every algorithm is hidden, so a file was taken but nothing is computed for it. */
    showNothingToHash() {
      for (const { id } of algorithms) {
        const els = rows.get(id);
        els.progress.stop();
        setHashText(els.hash, 'disabled');
        setHashEmpty(els.hash, true);
      }
      this.setActionsEnabled(false);
    },

    /** The visible rows could not be computed: say so where the digests would be. */
    showReadError() {
      for (const { id } of visible()) {
        const els = rows.get(id);
        els.progress.stop();
        setHashText(els.hash, 'error reading file');
        setHashEmpty(els.hash, true);
      }
    },

    /** Back to having no file: nothing computing, nothing to copy. */
    reset() {
      for (const { id } of algorithms) {
        const els = rows.get(id);
        els.progress.stop();
        setHashText(els.hash, isHidden(id) ? 'disabled' : 'no file selected');
        setHashEmpty(els.hash, true);
      }
      this.setActionsEnabled(false);
    },
  };
}
