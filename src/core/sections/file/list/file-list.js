import { createListFilter } from './filter/list-filter.js';
import { createListLine } from './list-line.js';
import { createListNavigation } from './list-navigation.js';

/** The list of files of a multi-file drop (see file.html), one line per job: its name and size, how it
 *  is doing, what the reference hash says of it, and a button to take it out (or stop it), with another
 *  to hash it again when it failed. `onSelect(id)`, `onRemove(id)` and `onRetry(id)` are the visitor's picks; `verdictOf(job)` gives 'match',
 *  'mismatch' or null for a job.
 *
 *  `root` is the scrolling list of the files, in `box`, which is shown for two files or more. Above it
 *  `filter` (a bar of buttons, see filter/list-filter.js) appears once a file is a mismatch or not listed. Under it,
 *  in `manifestSlot` and out of the scrolling, comes `manifestRow` (see manifest/manifest-row.js), once
 *  there is a manifest to show (`manifest`, the `{ name, size, ready }` it is rendered with). It is not a
 *  file of the queue: it can't be selected or removed, and the arrow keys pass over it.
 *
 *  The list is one stop for the Tab key (the selected line); ↑ ↓ Home and End move the selection, and
 *  Delete takes the line out. The ✕ buttons are for the pointer and assistive technology.
 *
 *  A line is ./list-line.js, the keys and the scrolling ./list-navigation.js.
 *
 *  Returns `{ render, setProgress }`. `render({ jobs, selectedId, manifest })` brings the list up to date. Lines
 *  are kept between renders, so the focus stays where it is while a run changes their
 *  status. Shown only for two files or more: a single file has the drop zone's own display.
 *  `setProgress(id, ratio)` moves the bar of a line being hashed. */
export function createFileList({
  root,
  box,
  filter,
  manifestSlot,
  onSelect,
  onRemove,
  onRetry,
  verdictOf,
  keyOf,
  manifestRow,
}) {
  const lines = new Map(); // job id → line, see ./list-line.js
  let jobs = [];
  // The jobs on show: all of them, or those of the filter that is on.
  let shown = [];
  let state = { selectedId: null, manifest: null };
  const listFilter = createListFilter({
    bar: filter,
    verdictOf,
    keyOf,
    onChange() {
      // The selected file may not be on show any more: select the first that is, so the rows and the verify
      // field are about a file the visitor can see.
      const selected = jobs.find((job) => job.id === state.selectedId);
      const first = jobs.find(listFilter.matches);
      if (listFilter.active && !(selected && listFilter.matches(selected)) && first) onSelect(first.id);
      draw();
    },
  });
  const { reveal } = createListNavigation({
    root,
    getShown: () => shown,
    getLine: (id) => lines.get(id),
    onSelect,
    onRemove,
  });

  /** Shows the manifest row at the end of the list, or takes it out when there is no manifest. */
  function renderManifest(manifest) {
    const { item } = manifestRow;
    if (!manifest) {
      item.remove();
      return;
    }
    manifestRow.render(manifest);
    // Only put in the slot when it isn't there (a move would drop the focus).
    if (item.parentNode !== manifestSlot) manifestSlot.append(item);
  }

  function lineFor(job) {
    if (!lines.has(job.id)) {
      lines.set(
        job.id,
        createListLine(job, {
          noteOf: () => listFilter.twinNote(job),
          onSelect: () => onSelect(job.id),
          onRemove: () => onRemove(job.id),
          onRetry: () => onRetry(job.id),
        }),
      );
    }
    return lines.get(job.id);
  }

  /** Puts the lines in the order of `order`, moving only those that are not already in place (a move
   *  would drop the focus). */
  function arrange(order) {
    let previous = null;
    for (const job of order) {
      const { item } = lineFor(job);
      if (item.parentNode !== root || item.previousElementSibling !== previous) {
        root.insertBefore(item, previous?.nextSibling ?? root.firstChild);
      }
      previous = item;
    }
  }

  /** Brings the list up to date with `jobs` and the state of the filter. */
  function draw() {
    const { selectedId, manifest } = state;
    box.hidden = jobs.length < 2;
    const live = new Set(jobs.map((job) => job.id));
    for (const [id, line] of lines) {
      if (live.has(id)) continue;
      line.item.remove();
      lines.delete(id);
    }
    shown = listFilter.apply(jobs);
    const onShow = new Set(shown.map((job) => job.id));

    // The jobs on show first, in the order to show them in, then the ones the filter leaves out.
    arrange([...shown, ...jobs.filter((job) => !onShow.has(job.id))]);
    for (const job of jobs) {
      const line = lineFor(job);
      const selected = job.id === selectedId;
      line.item.hidden = !onShow.has(job.id);
      line.update(job, { selected, verdict: job.status === 'done' ? verdictOf(job) : null });
      if (selected && job.status === 'hashing' && !line.item.hidden) reveal(line.item);
    }
    renderManifest(jobs.length > 1 ? manifest : null);
  }

  return {
    render({ jobs: current, selectedId, manifest = null }) {
      jobs = current;
      state = { selectedId, manifest };
      draw();
    },

    setProgress(id, ratio) {
      lines.get(id)?.setProgress(ratio);
    },
  };
}
