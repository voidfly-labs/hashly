import { defaultExportFormat } from '~core/features/export/export-setting.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

/** Names the format a Download button writes ("Download XML") as its tooltip, following Settings.
 *  The click flashes "Exported" itself, so it must not hide the tooltip as well. */
export function initDownloadTooltip(button) {
  initButtonTooltip(button, () => `Download ${defaultExportFormat().label}`, { hideOnClick: false });
}
