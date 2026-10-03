import { PLACEHOLDERS, selectedInputFormat } from '~core/sections/text/input-format.js';

/** The Input format radios (see text.html) as the field sees them: a change of format asks for the field
 *  to be cleared (`onChange()`, the format's text is no use in another) and puts the format's
 *  placeholder in `field`, to guide what valid input looks like for the new encoding.
 *
 *  Returns `{ refreshPlaceholder, select }`. `refreshPlaceholder()` is needed after a radio is set in
 *  code, which fires no change event. `select(format)` puts a format's radio back in code and saves the
 *  choice as any other, without the clear. */
export function createFormatRadios({ field, onChange }) {
  const radios = document.querySelectorAll('input[name="textInputFormat"]');
  // Set while `select` fires the change event, which is not a change of format for the field.
  let selecting = false;

  function refreshPlaceholder() {
    field.placeholder = PLACEHOLDERS[selectedInputFormat()] ?? PLACEHOLDERS['utf-8'];
  }

  radios.forEach((radio) =>
    radio.addEventListener('change', () => {
      if (selecting) return;
      onChange();
      refreshPlaceholder();
    }),
  );

  return {
    refreshPlaceholder,

    select(format) {
      const radio = document.querySelector(`input[name="textInputFormat"][value="${format}"]`);
      radio.checked = true;
      // A real change event, so that the choice is saved (see preferences/saved-view.js).
      selecting = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      selecting = false;
      refreshPlaceholder();
    },
  };
}
