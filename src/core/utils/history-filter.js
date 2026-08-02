/** The words of a search query: lower-cased and split on whitespace. */
export function searchTerms(query) {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Whether every one of `terms` appears in at least one of `fields` (case-insensitive).
 *  The fields are kept apart, so a word never matches across the end of one and the start of the next. */
export function matchesTerms(terms, fields) {
  const haystack = fields.join('\n').toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

const escapeRegExp = (s) => s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** Where `terms` occur in `text`, as sorted, merged `[start, end)` ranges of its characters. */
export function findRanges(text, terms) {
  if (!terms.length) return [];
  const pattern = new RegExp(
    terms
      .map(escapeRegExp)
      .sort((a, b) => b.length - a.length)
      .join('|'),
    'giu',
  );
  const ranges = [];
  for (const { index, 0: hit } of text.matchAll(pattern)) {
    const last = ranges.at(-1);
    if (last && index <= last[1]) last[1] = Math.max(last[1], index + hit.length);
    else ranges.push([index, index + hit.length]);
  }
  return ranges;
}
