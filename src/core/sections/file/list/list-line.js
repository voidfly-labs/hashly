import { el } from '~core/lib/dom.js';
import { Format } from '~core/lib/format.js';
import { svgIcon } from '~core/lib/icon.js';
import { createIconButton } from '~core/ui/icon-button/icon-button.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';
import { TAP_TOOLTIP_MS, Tooltip } from '~core/ui/tooltip/tooltip.js';

const STATE_LABELS = {
  queued: 'waiting',
  hashing: 'hashing',
  done: 'done',
  failed: 'failed',
  stopped: 'stopped',
  skipped: 'nothing to hash',
};
const VERDICT_LABELS = { match: 'Match', mismatch: 'No match', unlisted: 'Not listed' };

/** One line of the file list (see ./file-list.js), built for `job`: its name and size, how it is doing,
 *  what the reference hash says of it, a button to take it out (or stop it), another to hash it again when
 *  it failed (a stop for the Tab key on the selected line, as the line itself is), and a bar for its progress. `onSelect()`, `onRemove()` and `onRetry()` are the visitor's picks;
 *  `noteOf()` is a line to add under the name in its tooltip ('' for none).
 *
 *  Returns `{ item, select, update, setProgress }`: `item` is the `<li>` the caller puts in the list and
 *  `select` the button the line is picked and focused by. `update(job, { selected, verdict })` brings the line
 *  up to date (`verdict` is 'match', 'mismatch', 'unlisted', 'unchecked' or null); `setProgress(ratio)` moves the bar of a
 *  line being hashed. */
export function createListLine(job, { noteOf, onSelect, onRemove, onRetry }) {
  const item = el('li', 'file-list__item');
  item.dataset.job = job.id;
  const select = el('button', 'file-list__select');
  select.type = 'button';
  select.setAttribute('aria-keyshortcuts', 'Delete');
  const status = el('span', 'file-list__status');
  status.setAttribute('aria-hidden', 'true');
  status.append(el('span', 'spinner file-list__spinner'), svgIcon('check'), svgIcon('close'), svgIcon('warning'));
  const verdictEl = el('span', 'file-list__verdict');
  verdictEl.setAttribute('aria-hidden', 'true');
  select.append(
    status,
    el('span', 'file-list__name', job.name),
    verdictEl,
    el('span', 'file-list__size', Format.fileSize(job.size)),
  );
  // The full name, for a long one the row cuts off, and which files it is a duplicate of: on hover, and for a
  // while after a tap.
  const tip = () => [job.name, noteOf()].filter(Boolean).join('\n');
  initButtonTooltip(select, tip, { hideOnClick: false });
  select.addEventListener('click', (e) => {
    Tooltip.show(select, tip(), e.pointerType === 'mouse' ? undefined : TAP_TOOLTIP_MS);
    onSelect();
  });

  const remove = createIconButton({
    icon: 'close',
    label: 'Remove',
    tip: () => (job.status === 'hashing' ? 'Stop and remove' : 'Remove'),
    danger: true,
    className: 'file-list__remove',
    onClick: onRemove,
  });
  remove.tabIndex = -1;

  const retry = createIconButton({
    icon: 'refresh',
    label: 'Retry',
    className: 'file-list__retry',
    onClick: () => {
      onRetry();
      select.focus();
    },
  });
  retry.tabIndex = -1;
  retry.hidden = true;

  const bar = el('span', 'file-list__bar');
  item.append(select, retry, remove, bar);

  return {
    item,
    select,

    update(current, { selected, verdict }) {
      item.classList.toggle('file-list__item--selected', selected);
      item.classList.toggle('file-list__item--hashing', current.status === 'hashing');
      select.tabIndex = selected ? 0 : -1;
      // Retry is the next stop after the selected line, when that has failed: not one per failed file.
      retry.tabIndex = selected && current.status === 'failed' ? 0 : -1;
      if (selected) select.setAttribute('aria-current', 'true');
      else select.removeAttribute('aria-current');
      status.dataset.state = current.status;
      status.toggleAttribute('data-judged', Boolean(verdict));
      verdictEl.dataset.verdict = verdict ?? '';
      // 'unchecked' (a reference, but nothing to compare this file with) has no pill: the notice counts those.
      verdictEl.textContent = VERDICT_LABELS[verdict] ?? '';
      const spoken = [
        current.name,
        Format.fileSize(current.size),
        current.status === 'failed' && current.error
          ? `${STATE_LABELS.failed}: ${current.error}`
          : STATE_LABELS[current.status],
        verdict && (VERDICT_LABELS[verdict] ?? 'Not checked'),
      ];
      select.setAttribute('aria-label', spoken.filter(Boolean).join(', '));
      remove.setAttribute(
        'aria-label',
        `${current.status === 'hashing' ? 'Stop and remove' : 'Remove'} ${current.name}`,
      );
      retry.hidden = current.status !== 'failed';
      retry.setAttribute('aria-label', `Retry ${current.name}`);
      if (current.status !== 'hashing') bar.style.transform = 'scaleX(0)';
    },

    setProgress(ratio) {
      bar.style.transform = `scaleX(${ratio})`;
    },
  };
}
