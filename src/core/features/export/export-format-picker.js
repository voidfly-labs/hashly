import { defaultExportFormat } from '~core/features/export/export-setting.js';
import { EXPORT_FORMATS, getExportFormat } from '~core/lib/export/formats.js';
import { iconHref } from '~core/lib/icon.js';
import { createMenu } from '~core/ui/menu/menu.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

/** The format picker (a chevron) that sits against a Download button (inside a `.split-button`, see
 *  ui/split-button/) and opens the list of formats. A pick calls `onPick(format)` and leaves the format
 *  chosen in Settings as it is.
 *  Returns the button, for its caller to add and to disable with the Download button. */
export function createExportFormatPicker({ onPick }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'split-button__trigger';
  button.setAttribute('aria-label', 'Choose export format');
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('chevron-down')}"></use></svg>`;

  createMenu({
    trigger: button,
    items: EXPORT_FORMATS.map((id) => {
      const { label, ext } = getExportFormat(id);
      return { value: id, label, hint: `.${ext}` };
    }),
    getCurrent: () => defaultExportFormat().id,
    onSelect: (id) => onPick(getExportFormat(id)),
  });
  initButtonTooltip(button, 'Other formats');
  return button;
}
