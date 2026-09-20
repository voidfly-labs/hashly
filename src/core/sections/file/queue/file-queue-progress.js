import { createRunStats } from '~core/features/hashing/run-stats.js';
import { TabTitle } from '~core/features/hashing/tab-title.js';

const isOver = ({ status }) => status !== 'queued' && status !== 'hashing';

/** How far a queue of several files has got as a whole, for the status line under the drop zone and
 *  the browser tab's title: the files hashed at once report as one. `scope` are the jobs it counts
 *  (those still to be hashed when it was made), `getJobs()` the queue's jobs now (a file taken out
 *  of the list stops counting), `threads` how many threads the run is spread over, `setStats(text,
 *  state)` the status line.
 *
 *  Returns `{ update, threads }`: `update()` redraws both from the jobs (call it whenever one
 *  moves on, starts or ends). */
export function createQueueProgress({ scope, getJobs, threads, setStats }) {
  const title = TabTitle.track();
  const stats = createRunStats(
    scope.reduce((sum, { size }) => sum + size, 0),
    { threads },
  );
  let statsLine = '';
  let shown = '';

  return {
    threads,

    update() {
      const live = scope.filter((job) => getJobs().includes(job));
      const total = live.reduce((sum, { size }) => sum + size, 0);
      const done = live.reduce((sum, job) => sum + job.size * (isOver(job) ? 1 : job.ratio), 0);
      const ratio = total ? Math.min(done / total, 1) : 1;
      title.progress(ratio);

      statsLine = stats.update(ratio) ?? statsLine;
      const finished = live.filter(isOver).length;
      const count = live.length > 1 ? `${finished} of ${live.length} files · ` : '';
      const text = count + statsLine;
      if (text === shown) return;
      shown = text;
      setStats(text, 'busy');
    },
  };
}
