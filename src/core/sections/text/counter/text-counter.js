import { Format } from '~core/lib/format.js';

import { createCounterNotes } from './counter-notes.js';
import { inputNotes, isValidInput } from './text-notes.js';

// Text is hashed with every algorithm on each change; past this many bytes that is a file's job.
export const MAX_TEXT_BYTES = 1024 * 1024;
// The most characters one byte can take in each input format (a binary group and its space: 9).
// Input longer than that many times the limit is too large without being decoded, and the counter
// says "<max>+" instead of decoding megabytes on every keystroke.
const CHARS_PER_BYTE = { 'utf-8': 1, hex: 2, base64: 4 / 3, binary: 9 };
const TOO_LARGE_NOTE = { label: 'too large', tip: 'Over 1 MB, use a file' };
const isSurelyTooLarge = (text, format) => text.length > MAX_TEXT_BYTES * (CHARS_PER_BYTE[format] ?? 1);

/** The counter under the text field: how many characters it holds and how many bytes those hash as,
 *  with notes on whatever silently changes a hash (see ./text-notes.js). `charsEl`, `bytesEl` and
 *  `notesEl` are where each goes.
 *
 *  `update(text, format)` returns the number of bytes that get hashed: the decoded ones for the
 *  structured formats, none for invalid input, and more than MAX_TEXT_BYTES for input that is too large. */
export function createTextCounter({ charsEl, bytesEl, notesEl }) {
  const notes = createCounterNotes(notesEl);

  return {
    update(text, format) {
      const chars = text.length;

      // Primary label: raw char count (always shown)
      charsEl.textContent = chars === 1 ? '1 char' : `${chars.toLocaleString()} chars`;

      // Secondary label: the bytes that get hashed (decoded ones for the structured formats; none for invalid input).
      if (isSurelyTooLarge(text, format)) {
        bytesEl.textContent = `${MAX_TEXT_BYTES.toLocaleString()}+ bytes`;
        notes.set([TOO_LARGE_NOTE]);
        return MAX_TEXT_BYTES + 1;
      }
      let bytes = 0;
      if (text && isValidInput(text, format)) {
        bytes = format === 'utf-8' ? Format.utf8ByteLength(text) : Format.textToBytes(text, format).length;
      }
      bytesEl.textContent = bytes === 1 ? '1 byte' : `${bytes.toLocaleString()} bytes`;

      // Things that silently change a hash (hidden characters, padding, a trailing newline in UTF-8
      // text; what is left out of, or read differently from, the other formats).
      const found = inputNotes(text, format);
      if (bytes > MAX_TEXT_BYTES) found.push(TOO_LARGE_NOTE);
      notes.set(found);
      return bytes;
    },
  };
}
