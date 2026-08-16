// Short enough that the preview of every batch in a full history stays a small part of the
// browser's storage quota (about 5 MB per origin in every browser this app supports).
const MAX_CHARS = 100;
// Whitespace is collapsed, so look at more than MAX_CHARS of the input to still fill the preview.
const LOOKAHEAD = 2000;
const LABELS = { hex: 'Hex', base64: 'Base64', binary: 'Binary' };

/** A one-line description of the text that was hashed, for the history: its first
 *  MAX_CHARS characters (as code points, so an emoji is never cut in half) with
 *  whitespace and control characters collapsed to single spaces, and "…" when there is more.
 *  Input that is not plain text ends with its format ("deadbeef (Hex)"). Returns '' when
 *  there is nothing visible to show. */
export function textPreview(text, format = 'utf-8') {
  const head = text.slice(0, LOOKAHEAD);
  const points = Array.from(head.replaceAll(/[\p{Cc}\s]+/gu, ' ').trim());
  if (!points.length) return '';
  const more = points.length > MAX_CHARS || head.length < text.length;
  const preview = `${points.slice(0, MAX_CHARS).join('')}${more ? '…' : ''}`;
  return LABELS[format] ? `${preview} (${LABELS[format]})` : preview;
}
