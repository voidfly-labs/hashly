/** A click on the footer under the field (not on a note, which shows its tooltip) puts the caret in
 *  the field, as a click on the field itself would. */
export function initFooterFocus({ footer, field }) {
  footer.addEventListener('click', (e) => {
    if (!e.target.closest('.counter-note')) field.focus();
  });
}
