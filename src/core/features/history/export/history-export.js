import { downloadTable } from '~core/features/export/download-table.js';
import { Download } from '~core/lib/export/download.js';

import { isoTimestamp } from './history-time.js';

/** Downloads `entries` (what a history list shows, in its order) as a file in `format`. What was
 *  hashed comes before the hash: the file name, or (text) the stored description. `sourceOf(entry)`
 *  gives it, `kind` ('text', 'file') names the column and the file, and `defaultAlgo` the algorithm of
 *  an entry without one. */
export function exportHistory({ entries, format, kind, appName, defaultAlgo, sourceOf }) {
  const table = {
    root: 'history',
    item: 'entry',
    columns: ['time', 'algorithm', kind === 'file' ? 'filename' : 'text', 'hash'],
    rows: entries.map((e) => [isoTimestamp(e.ts), e.algo ?? defaultAlgo, sourceOf(e), e.hash]),
  };
  // Only the source (a file name, or text) is a stranger's: the hash must stay as it is.
  downloadTable({ table, format, baseName: `${appName}-${kind}-history_${Download.filenameDate()}`, guard: [2] });
}
