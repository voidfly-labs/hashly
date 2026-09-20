import { Announcer } from '~core/ui/announcer/announcer.js';

/** The filters of the file list (see ../file-list.js): buttons to show only the files that do not match
 *  the reference, only those it does not list, or only those that are duplicates of one another (shown
 *  together, side by side). A button is shown while it narrows the list, that is, while some of the
 *  files are of its kind and some are not (one that would show every file, or none, filters nothing);
 *  the bar (`bar`, see list-filter.html) while it has a button. At most one filter is on, and it goes
 *  off by itself when it stops narrowing the list.
 *
 *  `verdictOf(job)` gives 'match', 'mismatch', 'unlisted' or null for a job. `keyOf(job)` gives what
 *  makes it a duplicate of another (see ./duplicate-key.js), or null. `onChange()` runs after the
 *  visitor turns a filter on or off (which is also announced to screen readers).
 *
 *  Returns `{ apply, matches, twinNote, active }`: `apply(jobs)` redraws the bar for `jobs` and returns the
 *  ones to show, in the order to show them in; `matches(job)` says whether a job is among them (of the
 *  last `apply`), `twinNote(job)` what the tooltip of a duplicate says of the files it is the same as, and
 *  `active` whether a filter is on.
 *  Styles: ./list-filter.css. */
export function createListFilter({ bar, verdictOf, keyOf, onChange }) {
  const chips = [...bar.querySelectorAll('.list-filter__chip')];
  const text = bar.querySelector('.list-filter__text');
  let only = null; // 'mismatch', 'unlisted', 'duplicates' or null
  let flags = new Map(); // job → { mismatch, unlisted, duplicates }, as of the last `apply`
  let twins = new Map(); // job → the other jobs that are its duplicates

  function verdictFlags(job) {
    const verdict = job.status === 'done' ? verdictOf(job) : null;
    return { mismatch: verdict === 'mismatch', unlisted: verdict === 'unlisted' };
  }

  /** Works out the flags and twins of `jobs`; returns the key of each. */
  function analyse(jobs) {
    const keys = new Map(jobs.map((job) => [job, keyOf(job)]));
    const groups = new Map();
    for (const job of jobs) {
      const key = keys.get(job);
      if (key) groups.set(key, [...(groups.get(key) ?? []), job]);
    }
    flags = new Map();
    twins = new Map();
    for (const job of jobs) {
      const group = groups.get(keys.get(job)) ?? [];
      flags.set(job, { ...verdictFlags(job), duplicates: group.length > 1 });
      if (group.length > 1)
        twins.set(
          job,
          group.filter((other) => other !== job),
        );
    }
    return keys;
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

    matches: (job) => !only || Boolean(flags.get(job)?.[only]),

    /** What a duplicate's tooltip says, which file it is the same as ('' for a job that is not one). */
    twinNote(job) {
      const others = twins.get(job) ?? [];
      if (!others.length) return '';
      const rest = others.length - 1;
      const count = rest === 1 ? '1 other' : `${rest} others`;
      const more = rest ? ` and ${count}` : '';
      return `Same as ${others[0].name}${more}`;
    },

    apply(jobs) {
      const keys = analyse(jobs);
      const count = (kind) => jobs.filter((job) => flags.get(job)[kind]).length;
      const counts = { mismatch: count('mismatch'), unlisted: count('unlisted'), duplicates: count('duplicates') };
      // With none of its kind left there is nothing to show but an empty list, and with all of them nothing to narrow.
      if (only && !narrows(counts[only], jobs.length)) only = null;
      render(counts, jobs.length);
      if (!only) return jobs;
      const shown = jobs.filter((job) => flags.get(job)[only]);
      // Duplicates are shown together: the sort is stable, so files with one digest keep their order.
      return only === 'duplicates' ? shown.sort((a, b) => keys.get(a).localeCompare(keys.get(b))) : shown;
    },
  };
}
