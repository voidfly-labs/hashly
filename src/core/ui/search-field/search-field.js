import { iconHref } from '~core/lib/icon.js';
import { initResponsivePlaceholder } from '~core/ui/responsive-placeholder.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

// Mouse-and-keyboard devices only: on a phone, focusing the field on open raises the keyboard
// over the history before it has been seen.
const KEYBOARD_DEVICE = '(hover: hover) and (pointer: fine)';

/** A search row: the field, a clear button and the match count. `label` names the field for
 *  assistive tech, `placeholder` (and `mobilePlaceholder`, for a narrow screen) is its hint, and
 *  `noun` ('entries', 'questions') is what the count counts while nothing is searched.
 *  `onChange(query)` is called as the visitor types or clears it.
 *
 *  Returns a controller: `el` (to insert into the page), `value()`, `reset()`, `focus()`, and
 *  `update({ matched, total })`, which refreshes the count (the number of items, or of matches out
 *  of them) and tints the row by whether anything matched (`data-state`, see search-field.css). */
export function createSearchField({
  label,
  placeholder,
  mobilePlaceholder = placeholder,
  noun,
  shortcuts = '',
  onChange,
}) {
  const el = document.createElement('div');
  el.className = 'search-field';
  el.setAttribute('role', 'search');
  el.innerHTML = `
    <svg class="search-field__icon" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('search')}"></use></svg>
    <input class="search-field__input" type="search" placeholder="${placeholder}" data-placeholder-mobile="${mobilePlaceholder}"
      aria-label="${label}"${shortcuts ? ` aria-keyshortcuts="${shortcuts}"` : ''} autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search" />
    <button class="search-field__clear" type="button" aria-label="Clear search" hidden>
      <svg viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('close')}"></use></svg>
    </button>
    <span class="search-field__count" aria-live="polite"></span>`;

  const input = el.querySelector('.search-field__input');
  const clear = el.querySelector('.search-field__clear');
  const count = el.querySelector('.search-field__count');
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
      if (!(force || keyboard.matches)) return;
      input.focus();
      if (force) input.select();
    },
    update({ matched, total }) {
      const query = controller.value();
      clear.hidden = !input.value;
      count.textContent = query ? `${matched} / ${total}` : `${total} ${noun}`;
      // Blue while there are matches, red when nothing matches (see search-field.css).
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
  initButtonTooltip(clear, 'Clear');
  clear.addEventListener('click', () => {
    controller.reset();
    onChange('');
    input.focus();
  });

  return controller;
}
