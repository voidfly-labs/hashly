// How far from the edge of the list a row is scrolled to.
const REVEAL_GAP = 4;

/** The keyboard of the file list (see ./file-list.js) and its scrolling: ↑ ↓ Home and End move the
 *  selection (and so the digests shown) and Delete takes a file out, each on the files on show, and the
 *  line that gets the selection takes the focus.
 *
 *  `root` is the scrolling list, `getShown()` the jobs on show in their order, `getLine(id)` the line
 *  (see ./list-line.js) of a job, and `onSelect(id)` and `onRemove(id)` the picks.
 *
 *  Returns `{ reveal }`: `reveal(item)` scrolls the list (not the page) just far enough to show `item`,
 *  with its gap to the edge. */
export function createListNavigation({ root, getShown, getLine, onSelect, onRemove }) {
  function reveal(item) {
    const top = item.offsetTop - REVEAL_GAP;
    const bottom = item.offsetTop + item.offsetHeight + REVEAL_GAP;
    if (top < root.scrollTop) root.scrollTop = top;
    else if (bottom > root.scrollTop + root.clientHeight) root.scrollTop = bottom - root.clientHeight;
  }

  function focusJob(id) {
    const line = getLine(id);
    line?.select.focus();
    if (line) reveal(line.item);
  }

  root.addEventListener('keydown', (e) => {
    const item = e.target.closest?.('.file-list__select, .file-list__retry')?.parentNode;
    if (!item) return;
    const shown = getShown();
    const index = shown.findIndex((job) => job.id === Number(item.dataset.job));
    const target = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: shown.length - 1 }[e.key];
    if (target !== undefined) {
      e.preventDefault();
      const job = shown[target];
      if (!job) return;
      onSelect(job.id);
      focusJob(job.id);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      const next = shown[index + 1] ?? shown[index - 1];
      onRemove(shown[index].id);
      if (next) focusJob(next.id);
    }
  });

  return { reveal };
}
