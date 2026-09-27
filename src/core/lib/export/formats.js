import { toCsv } from './csv.js';
import { toJson } from './json.js';
import { toXml } from './xml.js';

const CHARSET = ';charset=utf-8';

/** A table to export: `columns` names the cells of each of `rows`, and `root` and `item` name the
 *  elements of an XML document (`<root><item>…</item></root>`). Cells keep their type (a number
 *  stays one in JSON). Names are plain element names: letters, digits and hyphens.
 *  @typedef {{ root: string, item: string, columns: string[], rows: any[][] }} ExportTable */

/** The formats a table (`ExportTable`) can be exported in. `serialize(table, { guard })` gives the file's content;
 *  `guard` (the columns that can hold a stranger's text) matters to CSV only, see `toCsv`. */
const FORMATS = {
  csv: {
    id: 'csv',
    label: 'CSV',
    ext: 'csv',
    mime: `text/csv${CHARSET}`,
    serialize: (table, { guard } = {}) => toCsv(table.columns, table.rows, { guard }),
  },
  json: { id: 'json', label: 'JSON', ext: 'json', mime: `application/json${CHARSET}`, serialize: toJson },
  xml: { id: 'xml', label: 'XML', ext: 'xml', mime: `application/xml${CHARSET}`, serialize: toXml },
};

export const EXPORT_FORMATS = Object.keys(FORMATS);

/** The format `id` names, CSV for anything else. */
export const getExportFormat = (id) => FORMATS[id] ?? FORMATS.csv;
