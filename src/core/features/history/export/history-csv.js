import { toCsv } from '~core/lib/csv.js';
import { Download } from '~core/lib/download.js';

import { formatTimestamp, isoTimestamp } from './history-time.js';

/** Downloads `entries` (what a history list shows, in its order) as a CSV file. What was hashed
 *  comes before the hash: the file name, or (text) the stored description. `sourceOf(entry)` gives
 *  it, `kind` ('text', 'file') names the column and the file, and `defaultAlgo` the algorithm of an
 *  entry without one. */
export function exportHistoryCsv({ entries, kind, appName, defaultAlgo, sourceOf }) {
  const rows = entries.map((e) => [isoTimestamp(e.ts), e.algo ?? defaultAlgo, sourceOf(e), e.hash]);
  // Only the source (a file name, or text) is a stranger's: the hash must stay as it is.
  const csv = toCsv(['time', 'algorithm', kind === 'file' ? 'filename' : 'text', 'hash'], rows, { guard: [2] });
  const date = formatTimestamp(Date.now()).slice(0, 10);
  Download.trigger(csv, `${appName}-${kind}-history_${date}.csv`, 'text/csv;charset=utf-8');
}
