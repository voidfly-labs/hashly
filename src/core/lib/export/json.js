// A valid pair, which stays, or a surrogate on its own (a text cut in the middle of an emoji), which
// strict parsers refuse even though JSON.stringify writes it.
const SURROGATE = /([\uD800-\uDBFF][\uDC00-\uDFFF])|[\uD800-\uDFFF]/g;

const wellFormed = (_key, value) =>
  typeof value === 'string' ? value.replace(SURROGATE, (_m, pair) => pair ?? '�') : value;

/** A table (`ExportTable`, see formats.js) as JSON: an array with one object per row, keyed by the column names, 2-space indent. */
export function toJson({ columns, rows }) {
  const objects = rows.map((cells) => Object.fromEntries(columns.map((name, i) => [name, cells[i] ?? ''])));
  return `${JSON.stringify(objects, wellFormed, 2)}\n`;
}
