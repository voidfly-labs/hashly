const MAX_NAMES = 3;
// Past this many distinct digest sizes the "available sizes" hint stops being helpful.
const MAX_HINT_SIZES = 3;

/** "SHA-1, SHA-256, SHA3-256 +2 more" */
export function listNames(ids) {
  const shown = ids.slice(0, MAX_NAMES).join(', ');
  const more = ids.length - MAX_NAMES;
  return more > 0 ? `${shown} +${more} more` : shown;
}

/** "Available: 128-bit (MD4, MD5) · 160-bit (RIPEMD-160)", or '' when there are
 *  too many sizes to be useful. `algorithms`: [{ id, hexLen }]. */
export function availableSizes(algorithms) {
  const bySize = new Map();
  for (const { id, hexLen } of algorithms) bySize.set(hexLen * 4, [...(bySize.get(hexLen * 4) ?? []), id]);
  if (bySize.size > MAX_HINT_SIZES) return '';
  const parts = [...bySize].sort(([a], [b]) => a - b).map(([bits, ids]) => `${bits}-bit (${listNames(ids)})`);
  return `Available: ${parts.join(' · ')}`;
}

/** What the notice under the reference field should say for the current state.
 *  Returns `{ text, lead?, hint?, kind? }` (`lead`: the verdict word to emphasise), or `{}` when there is nothing to say (empty
 *  field). `kind` is 'match' | 'mismatch' | 'warn'; undefined is a neutral note.
 *  `sizesHint` is `availableSizes(...)`, shown when no algorithm fits the length. */
export function describeVerifyState({ hasInput, ref, matched, compared, hiddenFits, fits, sizesHint }) {
  if (!hasInput) return {};
  if (!ref) return { text: 'Not a valid hash – expected hex or Base64', kind: 'warn' };

  if (matched.length) return { text: `Match – ${listNames(matched)}`, lead: 'Match', kind: 'match' };
  if (compared.length) {
    // Hidden algorithms aren't computed, so a mismatch might just mean the reference is for one of them.
    const skipped = hiddenFits.length ? ` · not compared (hidden): ${listNames(hiddenFits)}` : '';
    return { text: `No match – compared with ${listNames(compared)}${skipped}`, lead: 'No match', kind: 'mismatch' };
  }
  if (fits.length) return { text: `Fits ${listNames(fits)} – compared once a file is hashed` };
  if (hiddenFits.length) return { text: `Fits ${listNames(hiddenFits)} – currently hidden` };
  return {
    text: `${ref.hex.length * 4}-bit hash – no algorithm matches this length`,
    hint: sizesHint,
    kind: 'warn',
  };
}
