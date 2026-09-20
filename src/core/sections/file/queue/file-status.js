import { TabTitle } from '~core/features/hashing/tab-title.js';
import { Announcer } from '~core/ui/announcer/announcer.js';

import { createQueueProgress } from './file-queue-progress.js';
import { describeQueueEnd } from './file-summary.js';

/** What the File section says about its files as they go: each job's status line, shown on the drop
 *  zone, and for a queue of several files the progress of them all together (./file-queue-progress.js,
 *  the status line and the tab's title) and how it ended.
 *
 *  `queue` is ./file-queue.js, `drop` ../drop/file-drop.js, `Hasher` the app's client and `visibleAlgos()` the
 *  algorithms a file is hashed with.
 *
 *  Returns `{ aggregating, setJobStats, update, resetTitle, refresh, clear, onQueueStart, onQueueDone }`. */
export function createFileStatus({ queue, drop, Hasher, visibleAlgos }) {
  // How far the files of a drop of several have got as a whole, or null.
  let progress = null;
  let elapsedMs;

  /** Several files are being hashed as a whole: the status line and the tab title are theirs together. */
  const aggregating = () => Boolean(progress) && queue.jobs.length > 1;

  /** Keeps `text` as the status line of `job`, and says it on the drop zone unless several files
   *  are shown as a whole. */
  function setJobStats(job, text, state) {
    job.stats = { text, state };
    if (!aggregating()) drop.setStats(text, state);
  }

  return {
    aggregating,
    setJobStats,

    /** Redraws the progress of the files as a whole, if that is what is shown. */
    update() {
      if (aggregating()) progress.update();
    },

    /** Takes the progress of a job that will not report its end off the tab's title, unless that is
     *  the title of several files together. */
    resetTitle() {
      if (!aggregating()) TabTitle.reset();
    },

    /** A run of the queue begins: with several files, the progress of all of them is what is shown. */
    onQueueStart() {
      const { jobs } = queue;
      if (jobs.length < 2) {
        progress = null;
        return;
      }
      const algos = visibleAlgos();
      const scope = jobs.filter(({ status }) => status === 'queued');
      progress = createQueueProgress({
        scope,
        getJobs: () => queue.jobs,
        threads: Math.min(scope.length, Hasher.concurrencyFor(algos)) * Hasher.threadsFor(algos),
        setStats: (text, state) => drop.setStats(text, state),
      });
    },

    /** The whole queue is over: said once, for several files (a single file's run has said it). */
    onQueueDone({ jobs, elapsedMs: elapsed }) {
      elapsedMs = elapsed;
      const end = describeQueueEnd(jobs, elapsed, progress?.threads);
      if (!end) {
        // A drop of several that is down to one file: its own run said how it ended, but not on the tab.
        if (progress) TabTitle.reset();
        return;
      }
      drop.setStats(end.text, end.state);
      const title = TabTitle.track();
      if (end.state === 'done') title.done();
      else title.fail();
      Announcer.say(end.text);
    },

    /** Says the status line again, for a queue that has lost a file: the line of files being hashed counts
     *  them, and that of a finished queue says how many it hashed. */
    refresh() {
      const { jobs, active } = queue;
      if (active.length && aggregating()) {
        progress.update();
        return;
      }
      const last = active[0] ?? jobs[0];
      const end = active.length ? null : describeQueueEnd(jobs, elapsedMs, progress?.threads);
      if (end) drop.setStats(end.text, end.state);
      else if (last?.stats) setJobStats(last, last.stats.text, last.stats.state);
    },

    /** The queue is emptied: no progress, no tab title. */
    clear() {
      progress = null;
      TabTitle.reset();
    },
  };
}
