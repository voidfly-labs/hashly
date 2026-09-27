import { describeError } from '~core/features/hashing/describe-error.js';
import { History } from '~core/features/history/history.js';

import { startFileRun } from './file-run.js';

/** Hashes the files of the File section's queue (./file-queue.js), one job at a time as the queue
 *  asks (`runJob`), and follows each through to its end: its shares of the digests as they come, its
 *  progress, its history batch and how it ended, on `status` (./file-status.js) and, when it is the
 *  file on show, on `rows` and `view` (./file-job-view.js).
 *
 *  `Hasher` is the app's client, `hiddenAlgos` the section's Set of hidden ids, `visibleAlgos()` the
 *  algorithms a file is hashed with and `list` ../list/file-list.js. */
export function createFileJobRunner({
  algorithms,
  Hasher,
  hiddenAlgos,
  visibleAlgos,
  queue,
  status,
  rows,
  view,
  list,
}) {
  /** The `[{ hash, algo }]` of the visible algorithms among `digests` (`Map<id, hex>`). */
  function digestItems(digests) {
    return algorithms
      .filter(({ id }) => !hiddenAlgos.has(id) && digests.get(id))
      .map(({ id }) => ({ hash: digests.get(id), algo: id }));
  }

  /** One share of `job`'s hashing is done, while the others go on: its digests are recorded (in the
   *  batch of this file) and, if the job is the one shown, shown, can be copied and are compared
   *  with the reference now. */
  function onShare(job, digests) {
    for (const [id, hex] of digests) job.rawHexMap.set(id, hex);
    History.record('file', digestItems(digests), job.batchId, job.name);
    if (queue.selected === job) view.addDigests(job, digests);
  }

  /** Nothing to compute for `job`: the file is not read at all. */
  function skipJob(job) {
    job.status = 'skipped';
    status.resetTitle();
    status.setJobStats(job, 'Nothing to hash', 'warn');
    if (queue.follow(job)) view.show(job);
  }

  async function hashJob(job, algos) {
    // One batch for the file: its digests are recorded as the shares of the hashing finish (see onShare).
    job.batchId = History.nextBatch();
    const run = startFileRun({
      file: job.file,
      algos,
      hasher: Hasher,
      quiet: queue.jobs.length > 1,
      setStats: (text, state) => status.setJobStats(job, text, state),
      onShare: (digests) => onShare(job, digests),
      onProgress: (ratio) => {
        job.ratio = ratio;
        list.setProgress(job.id, ratio);
        status.update();
      },
      onShareProgress: (ids, ratio) => {
        if (queue.selected === job) rows.setProgress(ids, ratio);
      },
    });
    job.run = run;
    job.ids = run.ids;
    job.threads = Hasher.threadsFor(algos);
    status.update();
    if (queue.follow(job)) view.show(job);

    try {
      // Every digest is in by now, shown by its share; what is left is the end of the run.
      job.rawHexMap = await run.result;
      if (run.aborted) return; // cleared, removed or replaced just as it finished
      job.status = 'done';
      run.succeed();
    } catch (error) {
      if (run.aborted) return; // cancelled: the UI already shows what replaced it
      job.error = describeError(error);
      job.status = 'failed';
      run.fail(job.error);
    } finally {
      job.run = null;
    }
    status.update();
    if (queue.selected === job) view.showEnd(job);
  }

  return {
    /** Hashes one file of the queue, and settles when it is over, however it ended. */
    async runJob(job) {
      const algos = visibleAlgos();
      if (algos.length) await hashJob(job, algos);
      else skipJob(job);
    },

    /** A running pass stops computing the algorithms hidden meanwhile, and once it has none left it is
     *  stopped, instead of reading the rest of the file for results nobody can see. */
    cancelIfIdle() {
      for (const job of queue.active) {
        const run = job.run;
        if (!run) continue;
        run.dropHidden(hiddenAlgos);
        if (!run.isIdle()) continue;
        job.status = 'stopped';
        run.abort();
        status.resetTitle();
        status.setJobStats(job, 'Hashing stopped', 'error');
        if (queue.selected === job) view.showEnd(job);
      }
      status.update();
    },
  };
}
