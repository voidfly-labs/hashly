import { expandSection } from '~core/features/section-collapse/section-collapse.js';
import { scrollBehavior } from '~core/lib/motion/motion.js';
import { initFooterFocus } from '~core/sections/text/footer/footer-focus.js';
import { PLACEHOLDERS, selectedInputFormat } from '~core/sections/text/input-format.js';
import { Hint } from '~core/ui/hint/hint.js';

import { createFieldButtons } from './field-buttons.js';
import { createFormatGuard } from './format-guard.js';

// Typing is debounced so a burst of keystrokes asks for one hash.
const DEBOUNCE_MS = 20;

/** The text field (see text.html): what gets into it and the controls on it.
 *
 *  Typed, pasted and dropped text is kept to what the selected input format can hold (see
 *  ./format-guard.js), and says so with a hint when it drops something. `onInput()` is called, after a
 *  short pause, whenever the text changes, and at once when it is inserted by one of the methods below.
 *  `onClear({ focus })` is asked for by Esc, the ✕ button and a change of input format: the section
 *  decides what else goes with it, and calls `clear` to empty the field.
 *
 *  Returns `{ el, card, insertText, typeText, pasteText, setText, clear, refreshPlaceholder, setClearVisible }`. */
export function createTextInput({ onInput, onClear }) {
  const el = document.getElementById('textInput');
  const formatHint = document.getElementById('textFormatHint');
  const card = el.closest('.card');
  const guard = createFormatGuard({ field: el, hintEl: formatHint });
  let debounceTimer = null;

  initFooterFocus({ footer: card.querySelector('.text-footer'), field: el });

  /** Insert `raw` at the caret (replacing any selection), filtered for the selected input
   *  format, and recompute. `replace` swaps the whole content for it instead. */
  function insertText(raw, { focus = true, replace = false } = {}) {
    // Text arriving in a collapsed section (typed, pasted, dropped) opens it, so it is seen.
    expandSection(card.closest('.section'));
    const filtered = guard.clean(raw);

    const start = replace ? 0 : (el.selectionStart ?? el.value.length);
    const end = replace ? el.value.length : (el.selectionEnd ?? el.value.length);
    el.value = el.value.slice(0, start) + filtered + el.value.slice(end);
    el.setSelectionRange(start + filtered.length, start + filtered.length);
    if (focus) el.focus();

    clearTimeout(debounceTimer);
    onInput();
  }

  const moveCaretToEnd = () => {
    const end = el.value.length;
    el.setSelectionRange(end, end);
  };

  /** Needed after setting the radio in code, which fires no change event. */
  function refreshPlaceholder() {
    el.placeholder = PLACEHOLDERS[selectedInputFormat()] ?? PLACEHOLDERS['utf-8'];
  }

  el.addEventListener('input', (e) => {
    if (!e.isComposing) guard.dropIllegalChars();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onInput, DEBOUNCE_MS);
  });
  // Input still being composed (a soft keyboard's) is filtered once it is committed.
  el.addEventListener('compositionend', guard.dropIllegalChars);

  el.addEventListener('keydown', (e) => {
    // A key that belongs to an input method editor (Esc cancelling a composition, Enter accepting
    // one) is not for the field. Safari ends the composition before this event, so `isComposing`
    // is already false there, but it still reports keyCode 229.
    if (e.isComposing || e.keyCode === 229) return;
    // Esc clears the textarea regardless of input format.
    if (e.key === 'Escape') {
      e.preventDefault();
      onClear({ focus: true });
      return;
    }
    guard.filterKey(e);
  });

  // Switching input format clears the textarea and updates the placeholder
  // to guide what valid input looks like for the new encoding.
  document.querySelectorAll('input[name="textInputFormat"]').forEach((radio) =>
    radio.addEventListener('change', () => {
      // Don't focus the textarea: it's usually scrolled out of view above these radios,
      // focusing it would scroll there, and it would pull focus off the radio group
      // mid-arrow-key navigation.
      onClear({ focus: false });
      refreshPlaceholder();
    }),
  );

  const buttons = createFieldButtons({
    onClear,
    // Don't focus the textarea: on mobile that would raise the keyboard just for a paste.
    onPaste: (text) => insertText(text, { focus: false }),
    onPasteDenied: () => {
      el.focus();
      Hint.show(formatHint, 'paste blocked · use Ctrl/⌘+V');
    },
  });

  // Typed input is filtered per keystroke; do the same for native paste.
  // UTF-8 accepts everything, so the browser's own paste (and undo) is kept.
  el.addEventListener('paste', (e) => {
    if (selectedInputFormat() === 'utf-8') return;
    e.preventDefault();
    insertText(e.clipboardData.getData('text/plain'));
  });

  return {
    el,
    card,
    insertText,
    refreshPlaceholder,
    setClearVisible: buttons.setClearVisible,

    /** The first character typed elsewhere on the page (see core/features/input/type-to-focus.js).
     *  Goes through insertText so the input-format filter applies, then scrolls up to the
     *  input only if it isn't already on screen. */
    typeText(char) {
      moveCaretToEnd();
      insertText(char, { focus: false });
      el.focus({ preventScroll: true });
      const { top, bottom } = el.getBoundingClientRect();
      if (top < 0 || bottom > window.innerHeight) {
        card.closest('.section').scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      }
    },

    /** Text pasted outside any field: appended at the end (the textarea may hold a
     *  stale caret), and the section brought into view since the hashes change there. */
    pasteText(raw) {
      moveCaretToEnd();
      insertText(raw);
      card.closest('.section').scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    },

    /** Puts `text` in the field for the selected input format, minus what that format can't hold
     *  (as typing and pasting would), without recomputing: a link may carry anything. */
    setText(text) {
      el.value = guard.cleanSilently(text);
    },

    /** Empties the field and recomputes, without waiting for a pending keystroke. */
    clear({ focus = true } = {}) {
      clearTimeout(debounceTimer);
      el.value = '';
      onInput();
      if (focus) el.focus();
    },
  };
}
