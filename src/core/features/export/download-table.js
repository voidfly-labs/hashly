import { Download } from '~core/lib/export/download.js';

/** Downloads `table` (an `ExportTable`, see lib/export/formats.js) as `<baseName>.<ext>` in `format`, one of the
 *  formats `getExportFormat` gives. `guard` is for CSV only: see `toCsv`. */
export function downloadTable({ table, format, baseName, guard }) {
  Download.trigger(format.serialize(table, { guard }), `${baseName}.${format.ext}`, format.mime);
}
