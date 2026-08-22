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

const AWAITING = 'awaiting input…';

/** The result rows of the Text section, one per algorithm, appended to `resultsEl`, and what each
 *  says: its digest, or why there is none.
 *
 *  `isHidden(id)` says whether an algorithm is hidden (hidden rows are left as they are). `handlers`
 *  is what a row's badge, buttons and click do: `onToggle(id)`, `onCopy(id)`, `onDownload(id)` and
 *  `getHash(id)` (the digest as shown, '' while there is none).
 *
 *  A row is `{ row, badge, hash, copy, download }`, see `get`. */
export function createTextRows({ resultsEl, algorithms, isHidden, handlers }) {
  const rows = new Map();

  for (const { id } of algorithms) {
    const els = buildResultRow({ prefix: 'text', algoId: id, emptyText: AWAITING });
    resultsEl.appendChild(els.row);
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

  return {
    get: (id) => rows.get(id),

    hide: (id) => hideRow(rows.get(id)),

    /** Shows a hidden row again, with `digest` if the current input has one. */
    show: (id, digest) => showRow(rows.get(id), digest, AWAITING),

    /** Enables or disables the Copy and Download buttons of the visible rows. */
    setActionsEnabled(enabled) {
      for (const [id, els] of rows) {
        if (!isHidden(id)) setRowActions(els, enabled);
      }
    },

    /** Shows the digests of the current input (`hexMap`: `Map<id, hex>`) in `format`; a visible row
     *  that has none yet waits for it. */
    showDigests(hexMap, format) {
      for (const { id } of visible()) {
        const els = rows.get(id);
        const hex = hexMap.get(id);
        // Shown while the digests were being computed: it has none yet, and is filled in when it does.
        setHashText(els.hash, hex ? Format.applyFormat(hex, format) : AWAITING);
        setHashEmpty(els.hash, !hex);
      }
    },

    /** Rewrites the digests already shown in another `format`. */
    reformat(hexMap, format) {
      for (const { id } of visible()) {
        const hex = hexMap.get(id);
        if (hex) setHashText(rows.get(id).hash, Format.applyFormat(hex, format));
      }
    },

    /** The visible rows have no digests: `message` says why (no input, invalid input, hashing
     *  failed…), where the digests would be. */
    showMessage(message) {
      for (const { id } of visible()) {
        const els = rows.get(id);
        setHashText(els.hash, message);
        setHashEmpty(els.hash, true);
      }
    },

    /** Like `showMessage`, for the rows of `ids` only. */
    showMessageFor(ids, message) {
      for (const id of ids) {
        const els = rows.get(id);
        setHashText(els.hash, message);
        setHashEmpty(els.hash, true);
      }
    },

    showAwaiting() {
      this.showMessage(AWAITING);
    },
  };
}
