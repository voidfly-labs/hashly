import { Format } from '~core/utils/format.js';
import { iconHref } from '~core/utils/icon.js';

const HEAD = `
  <thead>
    <tr>
      <th class="history-table__num">#</th>
      <th class="history-table__algo">Algo</th>
      <th class="history-table__hash">Hash</th>
      <th class="history-table__time">Time</th>
      <th class="history-table__actions"></th>
    </tr>
  </thead>`;

const EMPTY_ROW = `
  <tr>
    <td colspan="5" class="history-popover__empty">No hashes yet.</td>
  </tr>`;

// How much of a file name stays visible at its end when the middle is cut: the extension and a bit more.
const FILE_TAIL_CHARS = 10;

/** The source line of a row. A file name is cut in the middle, not at its end, so its
 *  extension (what identifies the file) stays visible: the line is the name's start, which
 *  shrinks, and its last FILE_TAIL_CHARS characters, which don't. Both are already escaped. */
function sourceLine(source, { isFile, title = source }) {
  if (!source) return '';
  if (!isFile) return `<span class="history-table__source" title="${title}">${source}</span>`;
  const chars = Array.from(source);
  const head = chars.slice(0, -FILE_TAIL_CHARS).join('');
  const tail = chars.slice(-FILE_TAIL_CHARS).join('');
  return `<span class="history-table__source history-table__source--file" title="${title}"><span class="history-table__source-head">${head}</span><span class="history-table__source-tail">${tail}</span></span>`;
}

const table = (rows) => `
  <table class="history-table" aria-label="Hash history">${HEAD}
    <tbody>${rows}</tbody>
  </table>`;

/** The markup of a history table (see styles/components/history-table.css) for one page of
 *  entries `rows`, which is rows `start`… of the whole history.
 *  `defaultAlgo` names the algorithm of an entry without one, `formatTs(ts)` gives "YYYY-MM-DD
 *  HH:mm:ss" and `sourceOf(entry)` what the entry was made from ('' for unknown), which
 *  `sourceIsFile` says is a file name.
 *
 *  A row's `data-i` is its index in `rows`, which leads a click back to its entry. */
export function renderHistoryTable(rows, { start, defaultAlgo, formatTs, sourceOf, sourceIsFile = false }) {
  if (!rows.length) return table(EMPTY_ROW);

  return table(
    rows
      .map((e, i) => {
        // Everything below comes back out of storage, and the file name is the user's or a stranger's.
        const hash = Format.escapeHtml(e.hash);
        const algo = Format.escapeHtml(e.algo ?? defaultAlgo);
        const source = Format.escapeHtml(sourceOf(e));
        const [date, time] = formatTs(e.ts).split(' ');
        return `
          <tr class="history-table__row" data-i="${i}">
            <td class="history-table__num">${String(start + i + 1).padStart(3, '0')}</td>
            <td class="history-table__algo"><span class="algo-badge" data-algo="${algo}">${algo}</span></td>
            <td class="history-table__hash"><span class="history-table__hash-text${source ? '' : ' history-table__hash-text--last'}">${hash}</span>${sourceLine(source, { isFile: sourceIsFile })}<span class="tooltip">Copied!</span></td>
            <td class="history-table__time"><span dir="ltr"><span class="history-table__date">${date}</span> ${time}</span></td>
            <td class="history-table__actions">
              <div class="history-table__action-btns">
                <button class="history-table__action-btn" data-action="copy-history" data-hash="${hash}" aria-label="Copy hash">
                  <svg class="icon-action" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                  <svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('check')}"></use></svg>
                  <span class="tooltip">Copied!</span>
                </button>
                <button class="history-table__action-btn" data-action="download-history" data-hash="${hash}" data-algo="${algo}" data-filename="${Format.escapeHtml(e.filename)}" aria-label="Download hash">
                  <svg class="icon-action" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  <svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('check')}"></use></svg>
                  <span class="tooltip">Exported</span>
                </button>
              </div>
            </td>
          </tr>`;
      })
      .join(''),
  );
}
