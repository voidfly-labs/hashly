const INDENT = '  ';

// What XML 1.0 can hold at all, even as a character reference.
const isXmlChar = (c) =>
  c === 0x9 ||
  c === 0xa ||
  c === 0xd ||
  (c >= 0x20 && c <= 0xd7ff) ||
  (c >= 0xe000 && c <= 0xfffd) ||
  (c >= 0x10000 && c <= 0x10ffff);

/** Text for an element's content. What a stranger wrote (a file name, a text preview) can hold
 *  control characters and lone surrogates, which no XML parser accepts: they become U+FFFD. */
function text(value) {
  let out = '';
  // Iterating by code point hands a lone surrogate over as a character of its own.
  for (const ch of String(value ?? '')) out += isXmlChar(ch.codePointAt(0)) ? ch : '�';
  return out.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\r', '&#13;');
}

/** A table (`ExportTable`, see formats.js) as an XML document: `<root>` holding one `<item>` per row
 *  with an element per column, 2-space indent. No DOCTYPE: a parser set up to refuse one would
 *  refuse the file, and a DTD of plain text elements says nothing the nesting doesn't. */
export function toXml({ root, item, columns, rows }) {
  const entries = rows.map((cells) => {
    const fields = columns.map((name, i) => `${INDENT.repeat(2)}<${name}>${text(cells[i])}</${name}>`);
    return [`${INDENT}<${item}>`, ...fields, `${INDENT}</${item}>`].join('\n');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    ...(entries.length ? [`<${root}>`, ...entries, `</${root}>`] : [`<${root}/>`]),
    '',
  ].join('\n');
}
