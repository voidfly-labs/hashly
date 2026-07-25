// Things in a text input that change its hash but are easy to miss. The text is always
// hashed exactly as it stands; these notes only point at them.

// Characters that are invisible or pass for a space: control characters (not tab or
// newline), soft hyphen, Unicode spaces (non-breaking, em, ideographic...), zero-width
// space, direction marks and controls, line/paragraph separators, invisible math
// operators and the byte order mark. Not here: the zero-width joiner and non-joiner and
// variation selectors, which real emoji and scripts such as Persian and Hindi depend on.
// Written as escapes so the source holds no invisible characters itself.
/* eslint-disable no-control-regex */
const HIDDEN =
  /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xA0\xAD\u{1680}\u{2000}-\u{200B}\u{200E}\u{200F}\u{2028}-\u{202F}\u{205F}-\u{2064}\u{2066}-\u{2069}\u{3000}\u{FEFF}]/gu;
/* eslint-enable no-control-regex */

// Padding: plain spaces, tabs and newlines. Found by scanning in from each end.
const isBlank = (c) => c === ' ' || c === '\t' || c === '\n';

/** Blank characters at the start, spaces/tabs at the end, and newlines at the end,
 *  counted separately: a trailing newline is by far the commonest surprise (`echo` adds
 *  one, `printf` doesn't), so it is reported on its own, not as padding. */
function edges(text) {
  let leading = 0;
  while (leading < text.length && isBlank(text[leading])) leading++;

  // Whitespace-only text is all "leading"; don't count it a second time as trailing.
  let start = text.length;
  if (leading < text.length) while (isBlank(text[start - 1])) start--;

  const run = text.slice(start);
  const newlines = [...run].filter((c) => c === '\n').length;
  return { leading, trailing: run.length - newlines, newlines };
}

function hiddenNote(text) {
  const count = (text.match(HIDDEN) ?? []).length;
  if (!count) return null;
  return {
    label: 'hidden', // the count is for the tooltip
    tip: `${count} hidden ${count === 1 ? 'symbol' : 'symbols'}`,
  };
}

function paddedNote({ leading, trailing }) {
  if (!leading && !trailing) return null;
  const parts = [leading && `${leading} leading`, trailing && `${trailing} trailing`].filter(Boolean);
  return { label: 'padded', tip: `${parts.join(', ')} whitespace` };
}

function newlineNote({ newlines }) {
  if (!newlines) return null;
  // The label is always just the arrow; the count is for the tooltip.
  return { label: '↵ at end', tip: newlines === 1 ? 'Trailing newline' : `${newlines} trailing newlines` };
}

/** The notes for `text` (UTF-8 input), as `[{ label, tip }]` in display order: hidden
 *  characters, padding, then a trailing newline. Empty for clean text. */
export function textNotes(text) {
  const found = edges(text);
  return [hiddenNote(text), paddedNote(found), newlineNote(found)].filter(Boolean);
}
