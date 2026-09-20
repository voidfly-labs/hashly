import { Announcer } from '~core/ui/announcer/announcer.js';

/** The filters of the file list (see ../file-list.js): buttons to show only the files that do not match
 *  the reference, or only those it does not list. A button is shown while it narrows the list, that is,
 *  while some of the files are of its kind and some are not (one that would show every file, or none,
 *  filters nothing); the bar (`bar`, see list-filter.html) while it has a button. At most one filter is
 *  on, and it goes off by itself when it stops narrowing the list.
 *
 *  `verdictOf(job)` gives 'match', 'mismatch', 'unlisted' or null for a job. `onChange()` runs after the
 *  visitor turns a filter on or off (which is also announced to screen readers).
 *
 *  Returns `{ apply, matches, active }`: `apply(jobs)` redraws the bar for `jobs` and returns the ones to
 *  show, `matches(job)` says whether a job is among them, and `active` whether a filter is on. Styles:
 *  ./list-filter.css. */
export function createListFilter({ bar, verdictOf, onChange }) {
  const chips = [...bar.querySelectorAll('.list-filter__chip')];
  const text = bar.querySelector('.list-filter__text');
  let only = null; // 'mismatch', 'unlisted' or null

  /** What the reference says of a finished job, when it is not what it should be: 'mismatch' or 'unlisted'. */
  function problemOf(job) {
    const verdict = job.status === 'done' ? verdictOf(job) : null;
    return verdict === 'mismatch' || verdict === 'unlisted' ? verdict : null;
  }

  const narrows = (count, total) => count > 0 && count < total;

  function render(counts, total) {
    bar.hidden = !chips.some((chip) => narrows(counts[chip.dataset.filter], total));
    for (const chip of chips) {
      const kind = chip.dataset.filter;
      chip.hidden = !narrows(counts[kind], total);
      chip.setAttribute('aria-pressed', String(only === kind));
      chip.querySelector('.list-filter__count').textContent = counts[kind];
    }
    text.textContent = only ? `${counts[only]} of ${total} files` : '';
  }

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      only = only === chip.dataset.filter ? null : chip.dataset.filter;
      onChange();
      Announcer.say(only ? `Showing ${text.textContent}` : 'Showing all files');
    });
  }

  return {
    get active() {
      return only !== null;
    },

    matches: (job) => !only || problemOf(job) === only,

    apply(jobs) {
      const problems = jobs.map(problemOf);
      const count = (kind) => problems.filter((problem) => problem === kind).length;
      const counts = { mismatch: count('mismatch'), unlisted: count('unlisted') };
      // With none of its kind left there is nothing to show but an empty list, and with all of them nothing to narrow.
      if (only && !narrows(counts[only], jobs.length)) only = null;
      render(counts, jobs.length);
      return only ? jobs.filter((_, i) => problems[i] === only) : jobs;
    },
  };
}
