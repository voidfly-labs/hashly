import { Format } from '~core/lib/format.js';
import { svgIcon } from '~core/lib/icon.js';
import { createIconButton } from '~core/ui/icon-button/icon-button.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';
import { TAP_TOOLTIP_MS, Tooltip } from '~core/ui/tooltip/tooltip.js';

import { el } from './dom.js';

const STATE_LABELS = {
  queued: 'waiting',
  hashing: 'hashing',
  done: 'done',
  failed: 'failed',
  stopped: 'stopped',
  skipped: 'nothing to hash',
};
// How far from the edge of the list a row is scrolled to.
const REVEAL_GAP = 4;
const VERDICT_LABELS = { match: 'Match', mismatch: 'No match', unlisted: 'Not listed' };

/** The list of files of a multi-file drop (see file.html), one line per job: its name and size, how it
 *  is doing, what the reference hash says of it, and a button to take it out (or stop it).
 *  `onSelect(id)` and `onRemove(id)` are the visitor's picks; `verdictOf(job)` gives 'match',
 *  'mismatch' or null for a job.
 *
 *  After the files comes `manifestRow` (see manifest/manifest-row.js), once there is a manifest to show
 *  (`manifest`, the `{ name, size, ready }` it is rendered with). It is not a file of the queue: it can't
 *  be selected or removed, and the arrow keys pass over it.
 *
 *  The list is one stop for the Tab key (the selected line); ↑ ↓ Home and End move the selection, and
 *  Delete takes the line out. The ✕ buttons are for the pointer and assistive technology.
 *
 *  Returns `{ render, setProgress }`. `render({ jobs, selectedId, manifest })` brings the list up to date. Lines
 *  are kept between renders, so the focus stays where it is while a run changes their
 *  status. Shown only for two files or more: a single file has the drop zone's own display.
 *  `setProgress(id, ratio)` moves the bar of a line being hashed. */
export function createFileList({ root, onSelect, onRemove, verdictOf, manifestRow }) {
  const lines = new Map(); // job id → { item, select, status, verdict, bar, remove }
  let jobs = [];

  function build(job) {
    const item = el('li', 'file-list__item');
    item.dataset.job = job.id;
    const select = el('button', 'file-list__select');
    select.type = 'button';
    select.setAttribute('aria-keyshortcuts', 'Delete');
    const status = el('span', 'file-list__status');
    status.setAttribute('aria-hidden', 'true');
    status.append(el('span', 'file-list__spinner'), svgIcon('check'), svgIcon('warning'));
    const verdict = el('span', 'file-list__verdict');
    verdict.setAttribute('aria-hidden', 'true');
    select.append(
      status,
      el('span', 'file-list__name', job.name),
      verdict,
      el('span', 'file-list__size', Format.fileSize(job.size)),
    );
    // The full name, for a long one the row cuts off: on hover, and for a while after a tap.
    initButtonTooltip(select, job.name, { hideOnClick: false });
    select.addEventListener('click', (e) => {
      Tooltip.show(select, job.name, e.pointerType === 'mouse' ? undefined : TAP_TOOLTIP_MS);
      onSelect(job.id);
    });

    const remove = createIconButton({
      icon: 'close',
      label: 'Remove',
      tip: () => (job.status === 'hashing' ? 'Stop and remove' : 'Remove'),
      danger: true,
      className: 'file-list__remove',
      onClick: () => onRemove(job.id),
    });
    remove.tabIndex = -1;

    const bar = el('span', 'file-list__bar');
    item.append(select, remove, bar);
    return { item, select, status, verdict, bar, remove };
  }

  /** Shows the manifest row at the end of the list, or takes it out when there is no manifest. */
  function renderManifest(manifest) {
    const { item } = manifestRow;
    if (!manifest) {
      item.remove();
      return;
    }
    manifestRow.render(manifest);
    // Last, and only moved when it isn't (a move would drop the focus).
    if (item.parentNode !== root || item.nextElementSibling) root.append(item);
  }

  function lineFor(job) {
    if (!lines.has(job.id)) lines.set(job.id, build(job));
    return lines.get(job.id);
  }

  /** Brings one line up to date with its job. */
  function update(line, job, selected) {
    const verdict = job.status === 'done' ? verdictOf(job) : null;
    line.item.classList.toggle('file-list__item--selected', selected);
    line.item.classList.toggle('file-list__item--hashing', job.status === 'hashing');
    line.select.tabIndex = selected ? 0 : -1;
    if (selected) line.select.setAttribute('aria-current', 'true');
    else line.select.removeAttribute('aria-current');
    line.status.dataset.state = job.status;
    line.status.toggleAttribute('data-judged', Boolean(verdict));
    line.verdict.dataset.verdict = verdict ?? '';
    line.verdict.textContent = verdict ? VERDICT_LABELS[verdict] : '';
    const spoken = [job.name, Format.fileSize(job.size), STATE_LABELS[job.status], verdict && VERDICT_LABELS[verdict]];
    line.select.setAttribute('aria-label', spoken.filter(Boolean).join(', '));
    line.remove.setAttribute('aria-label', `${job.status === 'hashing' ? 'Stop and remove' : 'Remove'} ${job.name}`);
    if (job.status !== 'hashing') line.bar.style.transform = 'scaleX(0)';
  }

  /** Scrolls the list (not the page) just far enough to show `item`, with its gap to the edge. */
  function reveal(item) {
    const top = item.offsetTop - REVEAL_GAP;
    const bottom = item.offsetTop + item.offsetHeight + REVEAL_GAP;
    if (top < root.scrollTop) root.scrollTop = top;
    else if (bottom > root.scrollTop + root.clientHeight) root.scrollTop = bottom - root.clientHeight;
  }

  /** Puts the lines in the order of `jobs`, moving only those that are not already in place (a move
   *  would drop the focus). */
  function arrange() {
    let previous = null;
    for (const job of jobs) {
      const { item } = lineFor(job);
      if (item.parentNode !== root || item.previousElementSibling !== previous) {
        root.insertBefore(item, previous?.nextSibling ?? root.firstChild);
      }
      previous = item;
    }
  }

  function focusJob(id) {
    const line = lines.get(id);
    line?.select.focus();
    if (line) reveal(line.item);
  }

  // Arrow keys move the selection (and so the digests shown), Delete takes a file out.
  root.addEventListener('keydown', (e) => {
    const item = e.target.closest?.('.file-list__select')?.parentNode;
    if (!item) return;
    const index = jobs.findIndex((job) => job.id === Number(item.dataset.job));
    const target = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: jobs.length - 1 }[e.key];
    if (target !== undefined) {
      e.preventDefault();
      const job = jobs[target];
      if (!job) return;
      onSelect(job.id);
      focusJob(job.id);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      const next = jobs[index + 1] ?? jobs[index - 1];
      onRemove(jobs[index].id);
      if (next) focusJob(next.id);
    }
  });

  return {
    render({ jobs: current, selectedId, manifest = null }) {
      jobs = current;
      root.hidden = jobs.length < 2;
      const live = new Set(jobs.map((job) => job.id));
      for (const [id, line] of lines) {
        if (live.has(id)) continue;
        line.item.remove();
        lines.delete(id);
      }
      arrange();
      for (const job of jobs) {
        const selected = job.id === selectedId;
        update(lineFor(job), job, selected);
        if (selected && job.status === 'hashing') reveal(lineFor(job).item);
      }
      renderManifest(jobs.length > 1 ? manifest : null);
    },

    setProgress(id, ratio) {
      const line = lines.get(id);
      if (line) line.bar.style.transform = `scaleX(${ratio})`;
    },
  };
}
