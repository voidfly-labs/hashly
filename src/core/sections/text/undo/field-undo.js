import { selectedInputFormat } from '~core/sections/text/input-format.js';

import { createTextUndo } from './text-undo.js';

/** When the text field offers to take its text back (see ./text-undo.js): after a clear, which Esc, the ✕
 *  button and a change of input format all ask for. Any new content ends the offer. It also knows the input
 *  format the text was entered in, which a change of format clears: restoring puts that format back first
 *  (`selectFormat(format)`) and then the text (`insertText(text, options)`).
 *
 *  `field` is the textarea. Returns `{ snapshot, contentChanged, cleared }`, each called by the field at the
 *  moment its name says. */
export function createFieldUndo({ field, selectFormat, insertText }) {
  // The input format the text in the field was entered in: a change of format clears the text, so
  // when it is cleared with another format selected, that is what cleared it.
  let contentFormat = selectedInputFormat();

  const undo = createTextUndo({
    field,
    onRestore({ text, format }) {
      if (format !== selectedInputFormat()) selectFormat(format);
      insertText(text, { replace: true });
    },
  });

  return {
    /** The text and format in the field now. */
    snapshot: () => ({ text: field.value, format: contentFormat }),

    /** New content in the field ends any undo on offer, and is in the selected format. */
    contentChanged() {
      contentFormat = selectedInputFormat();
      undo.dismiss();
    },

    /** After the field was emptied: `before` is the snapshot of what it held. */
    cleared(before) {
      if (before.text) undo.offer(before);
      else undo.dismiss();
      contentFormat = selectedInputFormat();
    },
  };
}
