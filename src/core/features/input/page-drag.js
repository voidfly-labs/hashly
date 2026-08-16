/** Tracks a drag over the whole page, for the sections that light up while something they accept
 *  is dragged anywhere in the window.
 *
 *  `accepts(dataTransfer)` says whether a drag is one of theirs; `onChange(active, { internal })`
 *  runs when such a drag enters or leaves the page. `internal` is a drag that started on this page
 *  (selected text, say), which has no business scrolling the page away from where it began.
 *
 *  A counter pairs dragenter with dragleave, as both fire for every child element crossed. It is
 *  zeroed when it can't be trusted to balance: the drag ends or is dropped (the drop is seen in
 *  the capture phase, before a handler can stop it), or the pointer leaves the window. */
export function trackPageDrag({ accepts, onChange }) {
  let depth = 0;
  let internal = false;

  const setDepth = (next) => {
    const wasActive = depth > 0;
    depth = Math.max(0, next);
    if (wasActive !== depth > 0) onChange(depth > 0, { internal });
  };

  const leftWindow = ({ clientX, clientY }) =>
    clientX <= 0 || clientY <= 0 || clientX >= window.innerWidth || clientY >= window.innerHeight;

  document.addEventListener('dragstart', () => {
    internal = true;
  });
  document.addEventListener('dragend', () => {
    internal = false;
    setDepth(0);
  });
  document.addEventListener('dragenter', (e) => {
    if (accepts(e.dataTransfer)) setDepth(depth + 1);
  });
  document.addEventListener('dragleave', (e) => {
    if (accepts(e.dataTransfer)) setDepth(leftWindow(e) ? 0 : depth - 1);
  });
  document.addEventListener(
    'drop',
    () => {
      internal = false;
      setDepth(0);
    },
    true,
  );
}
