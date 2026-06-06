/** Single "N algorithms hidden" row appended to a results container,
 *  shown whenever at least one algorithm in that section is hidden.
 *  Collapsed rows disappear entirely with no visible trace, so this is the
 *  only indication that something is hidden — clicking it re-shows
 *  everything via onShowAll, identically to the section's own
 *  "show all" button. */
export function createHiddenSummary({ resultsEl, onShowAll }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'result-hidden';
  btn.hidden = true;
  btn.innerHTML = `
        <svg class="result-hidden__icon" viewBox="0 0 24 24" aria-hidden="true">
          <use href="/src/assets/images/icons.svg#icon-more"></use>
        </svg>
        <span class="result-hidden__label"></span>`;
  btn.addEventListener('click', onShowAll);
  resultsEl.appendChild(btn);

  const label = btn.querySelector('.result-hidden__label');

  return {
    /** Sync visibility and label with the section's current hidden count. */
    update(count) {
      btn.hidden = count === 0;
      if (count === 0) {
        label.textContent = '';
        return;
      }
      const noun = count === 1 ? 'algorithm' : 'algorithms';
      label.textContent = `${count} ${noun} hidden`;
    },
  };
}
