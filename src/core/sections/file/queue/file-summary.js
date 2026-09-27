import { describeRun } from '~core/features/hashing/run-stats.js';

/** What the drop zone shows for the files of the queue: the file itself, or "N files" with their
 *  total size. */
export function describeDrop(jobs) {
  if (jobs.length === 1) return jobs[0];
  return { name: `${jobs.length} files`, size: jobs.reduce((sum, { size }) => sum + size, 0) };
}

/** What the files of the queue say of one another when no reference is set, as `{ text, lead }` for the
 *  notice under the Verify field, or null: that they are all identical. Different files are the usual case
 *  and get no notice. `keyOf(job)` is what makes a file the same as another (see
 *  ../list/filter/duplicate-key.js), null where nothing can be said, as for an empty file or with only a
 *  short checksum shown. Said once every file is hashed. */
export function describeComparison(jobs, keyOf) {
  if (jobs.length < 2 || jobs.some(({ status }) => status !== 'done')) return null;
  const keys = jobs.map(keyOf);
  if (keys.includes(null) || !keys.every((key) => key === keys[0])) return null;
  return { text: `Identical – all ${jobs.length} files`, lead: 'Identical' };
}

/** Why the `failed` jobs failed, once each reason, as a tooltip: "Reason: x" when they share one (the
 *  summary counts the files already), or "Reasons:" over a "- x – N files" line for each of several. A
 *  failure with no known reason is 'unknown'. */
function describeFailures(failed) {
  const counts = new Map();
  for (const { error } of failed) {
    const reason = error || 'unknown';
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  if (counts.size === 1) return `Reason: ${[...counts.keys()][0]}`;
  return [
    'Reasons:',
    ...[...counts].map(([reason, count]) => `- ${reason} – ${count} ${count === 1 ? 'file' : 'files'}`),
  ].join('\n');
}

/** How a queue of several files ended, as `{ text, state, note }` for the status line (`state` as in the
 *  drop zone's `setStats`, `note` the reasons of the files that failed, '' when none did): the same
 *  line as for one file, over the files that were hashed, with the time the whole queue took, over
 *  `threads` threads (the most any of its files used, if left out). A single file's own run has said it
 *  already, so that gives null. */
export function describeQueueEnd(jobs, elapsedMs, threads = Math.max(1, ...jobs.map((job) => job.threads))) {
  if (jobs.length < 2) return null;
  const hashed = jobs.filter(({ status }) => status === 'done');
  const failedJobs = jobs.filter(({ status }) => status === 'failed');
  const failed = failedJobs.length;
  if (!hashed.length && !failed) return { text: 'Nothing hashed', state: 'warn', note: '' };

  const text = describeRun({
    totalBytes: hashed.reduce((sum, { size }) => sum + size, 0),
    elapsedMs,
    threads,
    files: hashed.length,
    of: jobs.length,
  });
  if (hashed.length === jobs.length) return { text, state: 'done', note: '' };
  return {
    text: failed ? `${text} · ${failed} failed` : text,
    state: failed ? 'error' : 'warn',
    note: failed ? describeFailures(failedJobs) : '',
  };
}
