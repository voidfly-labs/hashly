// What each structured input format (Hex, Base64, Binary) lets into the text field. UTF-8 takes
// anything, so it has no entry here and nothing is filtered for it.

export const FORMAT_HINTS = {
  hex: 'hex only · 0–9, a–f',
  base64: 'base64 only · a–z, 0–9, +/=',
  binary: 'binary only · 0, 1, <space>',
};

export const PLACEHOLDERS = {
  'utf-8': 'Start typing or paste text…',
  hex: 'Start typing or paste hex…',
  base64: 'Start typing or paste Base64…',
  binary: 'Start typing or paste binary…',
};

const ALLOWED_CHAR = {
  hex: /^[0-9a-fA-F]$/,
  base64: /^[A-Za-z0-9+/=]$/, // the standard alphabet and its padding
  binary: /^[01 ]$/,
};

const DISALLOWED_CHARS = {
  hex: /[^0-9a-fA-F]/g,
  base64: /[^A-Za-z0-9+/=]/g,
  binary: /[^01 ]/g,
};

/** The selected input format's value ('utf-8', 'hex', 'base64', 'binary'). */
export function selectedInputFormat() {
  return document.querySelector('input[name="textInputFormat"]:checked')?.value ?? 'utf-8';
}

/** Whether the character `ch` of one keystroke may be typed in `format` (not for UTF-8). */
export function allowsChar(format, ch) {
  return ALLOWED_CHAR[format]?.test(ch) ?? false;
}

/** Text that arrives all at once (paste, drop, link) in the notations people copy hashes and bytes
 *  in, as the reference field reads them: hex without a `0x` before a number ("0xDEADBEEF",
 *  "0xde 0xad"), Base64 in its URL-safe alphabet ("-_" for "+/"). Typing is not touched: a lone "0"
 *  followed by an "x" is still being typed. Other formats pass through unchanged. */
export function normalizeBulkText(text, format) {
  if (format === 'hex') return text.replaceAll(/(^|[^0-9a-f])0x(?=[0-9a-f])/gi, '$1');
  if (format === 'base64') return text.replaceAll('-', '+').replaceAll('_', '/');
  return text;
}

/** `text` without the characters `format` can't hold. UTF-8 passes everything through unchanged. */
export function filterTextForFormat(text, format) {
  const disallowed = DISALLOWED_CHARS[format];
  return disallowed ? text.replace(disallowed, '') : text;
}
