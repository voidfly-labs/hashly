const FORMULA_START = /^[=+\-@\t\r]/;

/** One CSV field: neutralises spreadsheet formulas when `guard` is set (a leading `'`, since file
 *  names are user-controlled and this opens in Excel) and quotes per RFC 4180 when needed. */
function field(value, guard) {
  let s = String(value ?? '');
  if (guard && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/** A CSV file's content: `header` and each of `rows` are arrays of cells.
 *  CRLF line endings (RFC 4180). A UTF-8 BOM is added only when something is non-ASCII: Excel
 *  needs it to read such text (file names, say) correctly, while on plain ASCII it is just a
 *  stray character at the start of the first header for anything that isn't Excel.
 *
 *  `guard` lists the columns that can hold text a stranger wrote, which get the formula
 *  guard (all of them by default). Leave it off a column of digests: a Base64 digest starts
 *  with "+" one time in 64, and the guard would put an apostrophe in front of it. */
export function toCsv(header, rows, { guard } = {}) {
  const guarded = (i) => !guard || guard.includes(i);
  const lines = [header, ...rows].map((cells) => cells.map((cell, i) => field(cell, guarded(i))).join(','));
  const csv = `${lines.join('\r\n')}\r\n`;
  return /\P{ASCII}/u.test(csv) ? `\uFEFF${csv}` : csv;
}
