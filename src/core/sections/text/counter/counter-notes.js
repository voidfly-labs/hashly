import { TAP_TOOLTIP_MS, Tooltip } from '~core/ui/tooltip/tooltip.js';

/** Renders short notes (`[{ label, tip }]`, see ./text-notes.js) after a counter's
 *  figures, each as a small pill with its `tip` as a tooltip on hover or tap.
 *  `container` is the element the notes go into; it should lay its children out inline. */
export function createCounterNotes(container) {
  let shown = '';

  return {
    set(notes) {
      const signature = JSON.stringify(notes);
      if (signature === shown) return; // unchanged: keep the DOM (and any open tooltip)
      shown = signature;
      // A removed note can't send mouseleave, so close a tooltip that may belong to it.
      Tooltip.hide();

      container.replaceChildren(
        ...notes.flatMap(({ label, tip }) => {
          const note = document.createElement('span');
          note.className = 'text-input__counter-note';
          note.textContent = label;
          note.addEventListener('mouseenter', () => Tooltip.show(note, tip));
          note.addEventListener('mouseleave', () => Tooltip.hide());
          // A tap doesn't reliably produce a mouseenter (iOS Safari doesn't for a plain element),
          // so the click shows it too, like the help and version tooltips. With a mouse the
          // tooltip is already up and stays until the pointer leaves.
          note.addEventListener('click', (e) =>
            Tooltip.show(note, tip, e.pointerType === 'mouse' ? undefined : TAP_TOOLTIP_MS),
          );
          // A space before each note (ignored by the layout, like those between the figures) keeps
          // the text readable to a screen reader, which announces this region as it changes.
          return [' ', note];
        }),
      );
    },
  };
}
