import { iconHref } from '~core/utils/icon.js';

import { initResponsivePlaceholder } from './responsive-placeholder.js';

// Mouse-and-keyboard devices only: on a phone, focusing the field on open raises the keyboard
// over the history before it has been seen.
const KEYBOARD_DEVICE = '(hover: hover) and (pointer: fine)';

/** The search field of a history popover: a row with the field, a clear button and the
 *  match count. `onChange(query)` is called as the visitor types or clears it.
 *
 *  Returns a controller: `el` (to insert into the popover), `value()`, `reset()`, `focus()`, and `update({ shown, matched, total })`, which shows or hides
 *  the row (a history of one page has nothing to search), refreshes the count (the number of
 *  entries, or of matches out of them) and tints the
 *  row by whether anything matched (`data-state`, see history-search.css). */
export function createHistorySearch({ ns, onChange }) {
  const el = document.createElement('div');
  el.className = 'history-search';
  el.setAttribute('role', 'search');
  el.hidden = true;
  el.innerHTML = `
    <svg class="history-search__icon" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('search')}"></use></svg>
    <input class="history-search__input" type="search" placeholder="Search ${ns === 'file' ? 'file' : 'text'}, hash or algorithm" data-placeholder-mobile="Search history"
      aria-label="Search the ${ns} history" aria-keyshortcuts="/ Control+F Meta+F" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" />
    <button class="history-search__clear" type="button" aria-label="Clear search" hidden>
      <svg viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('close')}"></use></svg>
    </button>
    <span class="history-search__count" aria-live="polite"></span>`;

  const input = el.querySelector('.history-search__input');
  const clear = el.querySelector('.history-search__clear');
  const count = el.querySelector('.history-search__count');
  const keyboard = window.matchMedia(KEYBOARD_DEVICE);
  initResponsivePlaceholder(input);

  const controller = {
    el,
    value: () => input.value.trim(),
    reset() {
      input.value = '';
      clear.hidden = true;
      delete el.dataset.state;
    },
    /** Focuses the field, if it is there. Unasked (`force` unset) only on a keyboard device,
     *  where it doesn't raise a keyboard. `force`, from a shortcut, selects what it holds too. */
    focus(force = false) {
      if (el.hidden || !(force || keyboard.matches)) return;
      input.focus();
      if (force) input.select();
    },
    update({ shown, matched, total }) {
      el.hidden = !shown;
      const query = controller.value();
      clear.hidden = !input.value;
      count.textContent = query ? `${matched} / ${total}` : `${total} entries`;
      // Blue while there are matches, red when nothing matches (see history-search.css).
      if (query) el.dataset.state = matched ? 'match' : 'none';
      else delete el.dataset.state;
    },
  };

  input.addEventListener('input', () => {
    clear.hidden = !input.value;
    onChange(controller.value());
  });
  input.addEventListener('keydown', (e) => {
    // Enter dismisses the on-screen keyboard, so the results can be seen.
    if (e.key === 'Enter' && !keyboard.matches) input.blur();
  });
  clear.addEventListener('click', () => {
    controller.reset();
    onChange('');
    input.focus();
  });

  return controller;
}
