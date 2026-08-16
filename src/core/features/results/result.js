import { setHashDiff } from '~core/lib/diff.js';
import { iconHref } from '~core/lib/icon.js';

/** Marks a result's hash element as empty (or not) and mirrors the state on
 *  its row, so `./result.css` can style the whole row without `:has()`. */
export function setHashEmpty(hashEl, empty) {
  hashEl.classList.toggle('result__hash--empty', empty);
  hashEl.closest('.result')?.classList.toggle('result--empty', empty);
}

const VERDICTS = {
  match: { icon: 'check', text: 'Match' },
  mismatch: { icon: 'close', text: 'No match' },
};

/** Sets a row's reference-hash verdict: 'match', 'mismatch', or null to clear it.
 *  The state lives on the row as a class (no `:has()`). The verdict itself is an
 *  icon on the row's algorithm badge; its words go in the badge's accessible
 *  name and a tooltip. `against` (mismatch only) is `{ reference, digest }`: the
 *  hex digests to compare, so the differing characters get marked (see core/lib/diff.js). */
export function setVerifyState(row, state, against = null) {
  row.classList.toggle('result--match', state === 'match');
  row.classList.toggle('result--mismatch', state === 'mismatch');

  const status = row.querySelector('.result__status');
  const badge = row.querySelector('.algo-badge');
  status.hidden = !state;
  badge.setAttribute(
    'aria-label',
    state ? `${row.dataset.algo}, ${VERDICTS[state].text.toLowerCase()}` : row.dataset.algo,
  );
  const diffWith = state === 'mismatch' ? against : null;
  setHashDiff(row.querySelector('.result__hash'), diffWith?.reference, diffWith?.digest);
  if (!state) return;

  status.querySelector('use').setAttribute('href', iconHref(VERDICTS[state].icon));
  status.title = VERDICTS[state].text;
}
