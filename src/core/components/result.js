/** Marks a result's hash element as empty (or not) and mirrors the state on
 *  its row, so `components/result.css` can style the whole row without `:has()`. */
export function setHashEmpty(hashEl, empty) {
  hashEl.classList.toggle('result__hash--empty', empty);
  hashEl.closest('.result')?.classList.toggle('result--empty', empty);
}
