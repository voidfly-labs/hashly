import { Settings } from '~core/features/settings/settings.js';
import { getExportFormat } from '~core/lib/export/formats.js';

/** The export format the visitor chose in Settings (CSV until then). */
export const defaultExportFormat = () => getExportFormat(Settings.get('exportFormat'));

/** Calls `fn(format)` now and whenever the setting changes. */
export function watchExportFormat(fn) {
  fn(defaultExportFormat());
  Settings.onChange(() => fn(defaultExportFormat()));
}
