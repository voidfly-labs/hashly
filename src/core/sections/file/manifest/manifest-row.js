import { Format } from '~core/lib/format.js';
import { svgIcon } from '~core/lib/icon.js';
import { el } from '~core/sections/file/dom.js';
import { createIconButton } from '~core/ui/icon-button/icon-button.js';

/** The last row of the file list: the checksum file of all the files (see manifest-export.js), with its
 *  name, a "Manifest" tag, its size, and two icon buttons to copy and download it. It is not a file of
 *  the queue: it can't be selected or removed. Styles: ./manifest-row.css.
 *
 *  `onCopy(button)` and `onDownload(button)` are what the buttons do. Returns `{ item, render }`: the
 *  `<li>` for the list to place, and `render({ name, size, ready })`, which is how the row stands (the
 *  buttons, and the size, wait for `ready`). */
export function createManifestRow({ onCopy, onDownload }) {
  const item = el('li', 'file-list__item manifest-row');
  const label = el('div', 'file-list__label');
  const icon = el('span', 'manifest-row__icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.appendChild(svgIcon('docs'));
  const name = el('span', 'file-list__name');
  const size = el('span', 'file-list__size');
  label.append(icon, name, el('span', 'manifest-row__tag', 'Manifest'), size);
  const action = (icon, label, tip, onClick) =>
    createIconButton({ icon, label, tip, morph: true, onClick, className: 'manifest-row__action' });
  const copy = action('copy', 'Copy manifest', 'Copy', onCopy);
  const download = action('download', 'Download manifest', 'Download', onDownload);
  item.append(label, copy, download);

  return {
    item,
    render(manifest) {
      name.textContent = manifest.name;
      size.textContent = manifest.ready ? Format.fileSize(manifest.size) : '';
      item.classList.toggle('manifest-row--waiting', !manifest.ready);
      copy.disabled = !manifest.ready;
      download.disabled = !manifest.ready;
    },
  };
}
