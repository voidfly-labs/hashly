import { initPasteButton } from '~core/features/input/paste-button.js';
import { expandSection } from '~core/features/section-collapse/section-collapse.js';
import { Hint } from '~core/ui/hint/hint.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

import {
  allowsChar,
  filterTextForFormat,
  FORMAT_HINTS,
  normalizeBulkText,
  PLACEHOLDERS,
  selectedInputFormat,
} from './input-format.js';

// Typing is debounced so a burst of keystrokes asks for one hash.
const DEBOUNCE_MS = 20;

/** The text field (see text.html): what gets into it and the controls on it.
 *
 *  Typed, pasted and dropped text is kept to what the selected input format can hold (see
 *  ./input-format.js), and says so with a hint when it drops something. `onInput()` is called, after a
 *  short pause, whenever the text changes, and at once when it is inserted by one of the methods below.
 *  `onClear({ focus })` is asked for by Esc, the ✕ button and a change of input format: the section
 *  decides what else goes with it, and calls `clear` to empty the field.
 *
 *  Returns `{ el, card, insertText, typeText, pasteText, setText, clear, refreshPlaceholder, setClearVisible }`. */
export function createTextInput({ onInput, onClear }) {
  const el = document.getElementById('textInput');
  const clearBtn = document.getElementById('textInputClear');
  const formatHint = document.getElementById('textFormatHint');
  const card = el.closest('.card');
  let debounceTimer = null;

  /** Takes characters the input format can't hold out of the field, keeping the caret where it was.
   *  The keydown filter can't see keys that soft keyboards report as "Unidentified", so whatever
   *  they type arrives here. */
  function dropIllegalChars() {
    const format = selectedInputFormat();
    const filtered = filterTextForFormat(el.value, format);
    if (filtered === el.value) return;
    const caret = filterTextForFormat(el.value.slice(0, el.selectionStart), format).length;
    el.value = filtered;
    el.setSelectionRange(caret, caret);
    Hint.show(formatHint, FORMAT_HINTS[format]);
  }

  /** Insert `raw` at the caret (replacing any selection), filtered for the selected input
   *  format, and recompute. `replace` swaps the whole content for it instead. */
  function insertText(raw, { focus = true, replace = false } = {}) {
    // Text arriving in a collapsed section (typed, pasted, dropped) opens it, so it is seen.
    expandSection(card.closest('.section'));
    const format = selectedInputFormat();
    const readable = normalizeBulkText(raw, format);
    const filtered = filterTextForFormat(readable, format);
    if (filtered.length < readable.length) Hint.show(formatHint, FORMAT_HINTS[format]);

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
    if (!e.isComposing) dropIllegalChars();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onInput, DEBOUNCE_MS);
  });
  // Input still being composed (a soft keyboard's) is filtered once it is committed.
  el.addEventListener('compositionend', dropIllegalChars);

  // Input-format validation — discard keystrokes that are illegal for
  // the selected input encoding (Hex / Base64 / Binary).
  // UTF-8 accepts everything so only the other three need filtering.
  el.addEventListener('keydown', (e) => {
    // Esc clears the textarea regardless of input format.
    if (e.key === 'Escape') {
      e.preventDefault();
      onClear({ focus: true });
      return;
    }

    const format = selectedInputFormat();
    if (format === 'utf-8') return; // no restriction
    // A line break is no part of any of these formats (and would break Base64 decoding).
    if (e.key === 'Enter') {
      e.preventDefault();
      return;
    }
    // Allow: control keys, arrows, backspace, delete, tab, Ctrl/Cmd combos
    if (e.key.length > 1 || e.ctrlKey || e.metaKey) return;
    if (allowsChar(format, e.key)) {
      Hint.hide(formatHint);
    } else {
      e.preventDefault();
      Hint.show(formatHint, FORMAT_HINTS[format]);
    }
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

  // Inline ✕ button in the textarea corner — mirrors file-drop__clear behaviour.
  clearBtn.addEventListener('click', () => onClear({ focus: true }));
  initButtonTooltip(clearBtn, 'Clear');

  initPasteButton(document.getElementById('textPasteBtn'), {
    // Don't focus the textarea: on mobile that would raise the keyboard just for a paste.
    onText: (text) => insertText(text, { focus: false }),
    onDenied: () => {
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

    /** The first character typed elsewhere on the page (see core/features/input/type-to-focus.js).
     *  Goes through insertText so the input-format filter applies, then scrolls up to the
     *  input only if it isn't already on screen. */
    typeText(char) {
      moveCaretToEnd();
      insertText(char, { focus: false });
      el.focus({ preventScroll: true });
      const { top, bottom } = el.getBoundingClientRect();
      if (top < 0 || bottom > window.innerHeight) {
        card.closest('.section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },

    /** Text pasted outside any field: appended at the end (the textarea may hold a
     *  stale caret), and the section brought into view since the hashes change there. */
    pasteText(raw) {
      moveCaretToEnd();
      insertText(raw);
      card.closest('.section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /** Puts `text` in the field for the selected input format, minus what that format can't hold
     *  (as typing and pasting would), without recomputing: a link may carry anything. */
    setText(text) {
      const format = selectedInputFormat();
      el.value = filterTextForFormat(normalizeBulkText(text, format), format);
    },

    /** Empties the field and recomputes, without waiting for a pending keystroke. */
    clear({ focus = true } = {}) {
      clearTimeout(debounceTimer);
      el.value = '';
      onInput();
      if (focus) el.focus();
    },

    /** The ✕ button shows when there is something to clear. It has no disabled state, as it has no
     *  meaningful "empty" affordance. */
    setClearVisible: (visible) => clearBtn.classList.toggle('text-input__clear--visible', visible),
  };
}
