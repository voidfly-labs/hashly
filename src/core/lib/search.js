import { Format } from '~core/lib/format.js';

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
    const last = ranges[ranges.length - 1];
    if (last && index <= last[1]) last[1] = Math.max(last[1], index + hit.length);
    else ranges.push([index, index + hit.length]);
  }
  return ranges;
}

/** `text[from, to)` as markup, with the parts inside `ranges` (see findRanges) marked. */
export function markHtml(text, ranges, from = 0, to = text.length) {
  let html = '';
  let at = from;
  for (const [start, end] of ranges) {
    const s = Math.max(start, from);
    const e = Math.min(end, to);
    if (s >= e) continue;
    html += `${Format.escapeHtml(text.slice(at, s))}<mark>${Format.escapeHtml(text.slice(s, e))}</mark>`;
    at = e;
  }
  return html + Format.escapeHtml(text.slice(at, to));
}
