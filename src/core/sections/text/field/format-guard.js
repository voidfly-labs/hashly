import {
  allowsChar,
  filterTextForFormat,
  FORMAT_HINTS,
  normalizeBulkText,
  selectedInputFormat,
} from '~core/sections/text/input-format.js';
import { Hint } from '~core/ui/hint/hint.js';

/** What the text field lets in: keeps what is typed, pasted or dropped to what the selected input
 *  format can hold (see ../input-format.js), and says so with `hintEl` when it drops something.
 *  `field` is the textarea.
 *
 *  Returns `{ clean, cleanSilently, dropIllegalChars, filterKey }`. */
export function createFormatGuard({ field, hintEl }) {
  const show = (format) => Hint.show(hintEl, FORMAT_HINTS[format]);

  /** `raw` as the selected input format reads and can hold it. */
  function readable(raw, format) {
    return filterTextForFormat(normalizeBulkText(raw, format), format);
  }

  return {
    /** `raw` for the selected input format, with the hint when characters had to go. */
    clean(raw) {
      const format = selectedInputFormat();
      const normalized = normalizeBulkText(raw, format);
      const filtered = filterTextForFormat(normalized, format);
      if (filtered.length < normalized.length) show(format);
      return filtered;
    },

    /** The same, without the hint: a link may carry anything. */
    cleanSilently(raw) {
      return readable(raw, selectedInputFormat());
    },

    /** Takes characters the input format can't hold out of the field, keeping the caret where it was.
     *  The keydown filter can't see keys that soft keyboards report as "Unidentified", so whatever
     *  they type arrives here. */
    dropIllegalChars() {
      const format = selectedInputFormat();
      const filtered = filterTextForFormat(field.value, format);
      if (filtered === field.value) return;
      const caret = filterTextForFormat(field.value.slice(0, field.selectionStart), format).length;
      field.value = filtered;
      field.setSelectionRange(caret, caret);
      show(format);
    },

    /** Discards a keystroke that is illegal for the selected input format (Hex, Base64 or Binary;
     *  UTF-8 takes everything). */
    filterKey(e) {
      const format = selectedInputFormat();
      if (format === 'utf-8') return;
      // A line break is no part of any of these formats (and would break Base64 decoding).
      if (e.key === 'Enter') {
        e.preventDefault();
        return;
      }
      // Control keys, arrows, backspace, delete, tab and Ctrl/Cmd combinations are allowed.
      if (e.key.length > 1 || e.ctrlKey || e.metaKey) return;
      if (allowsChar(format, e.key)) {
        Hint.hide(hintEl);
      } else {
        e.preventDefault();
        show(format);
      }
    },
  };
}
