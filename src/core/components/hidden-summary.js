import { iconHref } from '~core/utils/icon.js';

/** Single "Showing X of N · Show all" row appended to a results container,
 *  shown whenever at least one algorithm in that section is hidden (`total` is how many
 *  algorithms the section has).
 *  Collapsed rows disappear entirely with no visible trace, so this is the
 *  only indication that something is hidden — clicking it re-shows
 *  everything via onShowAll, identically to the section's own
 *  "show all" button. */
export function createHiddenSummary({ resultsEl, total, onShowAll }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'result-hidden';
  btn.hidden = true;
  btn.innerHTML = `
        <span class="result-hidden__start">
          <svg class="result-hidden__icon" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('more-vert')}"></use></svg>
          <span class="result-hidden__label"></span>
        </span>
        <span class="result-hidden__action" aria-hidden="true">Show all</span>`;
  btn.addEventListener('click', onShowAll);
  resultsEl.appendChild(btn);

  const label = btn.querySelector('.result-hidden__label');

  return {
    /** Sync visibility and label with the section's current hidden count. */
    update(count) {
      btn.hidden = count === 0;
      if (count === 0) {
        label.textContent = '';
        btn.removeAttribute('aria-label');
        return;
      }
      label.textContent = `Showing ${total - count} of ${total}`;
      btn.setAttribute('aria-label', `Showing ${total - count} of ${total} algorithms. Show all`);
    },
  };
}
