const MAX_NAMES = 3;

/** "SHA-1, SHA-256, SHA3-256 +2 more" */
export function listNames(ids) {
  const shown = ids.slice(0, MAX_NAMES).join(', ');
  const more = ids.length - MAX_NAMES;
  return more > 0 ? `${shown} +${more} more` : shown;
}

/** What the notice under the reference field should say for the current state.
 *  Returns `{ text, lead?, kind? }` (`lead`: the verdict word to emphasise), or `{}` when there is nothing to say (empty
 *  field). `kind` is 'match' | 'mismatch' | 'warn'; undefined is a neutral note.
 */
export function describeVerifyState({ hasInput, ref, matched, compared, hiddenFits, unhashed = [], fits }) {
  if (!hasInput) return {};
  if (!ref) return { text: 'Not a valid hash – expected hex or Base64', kind: 'warn' };

  if (matched.length) return { text: `Match – ${listNames(matched)}`, lead: 'Match', kind: 'match' };
  // Some digests are in and some are still being worked out: it is too early to call it a mismatch.
  if (compared.length && fits.length) {
    return { text: `No match yet – compared with ${listNames(compared)} · waiting for ${listNames(fits)}` };
  }
  if (compared.length) {
    // Hidden algorithms aren't computed, so a mismatch might just mean the reference is for one of them.
    const skipped = hiddenFits.length ? ` · skipped (hidden): ${listNames(hiddenFits)}` : '';
    const missing = unhashed.length ? ` · skipped (unhashed): ${listNames(unhashed)}` : '';
    return {
      text: `No match – compared with ${listNames(compared)}${skipped}${missing}`,
      lead: 'No match',
      kind: 'mismatch',
    };
  }
  if (fits.length) return { text: `Fits ${listNames(fits)} – compared once a file is hashed` };
  // The length fits, but these were hidden when the file was hashed, so there is no digest to compare.
  if (unhashed.length) {
    return { text: `Fits ${listNames(unhashed)} – skipped (unhashed)` };
  }
  if (hiddenFits.length) return { text: `Fits ${listNames(hiddenFits)} – currently hidden` };
  return { text: `${ref.hex.length * 4}-bit hash – no algorithm matches this length`, kind: 'warn' };
}
