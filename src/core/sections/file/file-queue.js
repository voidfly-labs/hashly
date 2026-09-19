/** The files of one drop, hashed one after the other: the list of jobs, which one the page shows,
 *  and the loop that starts the next job when the one before it is over.
 *
 *  A job is `{ id, file, name, size, status, rawHexMap, ids, threads, batchId, run, stats }`. Its `status` is
 *  'queued', 'hashing', 'done', 'failed', 'stopped' (every algorithm it computed was hidden) or
 *  'skipped' (there was nothing visible to compute); `runJob(job)` sets all but the first two, and
 *  those are set here. `rawHexMap` (`Map<algoId, hex>`), `ids`, `threads`, `batchId`, `run` and `stats` (the last
 *  `{ text, state }` of its status line) are the runner's.
 *
 *  `runJob(job)` hashes one file and settles when it is over, however it ended. `onChange()` follows
 *  every change to the list or the selection, `onSelect(job)` a change of the selection that the
 *  runner did not make itself, `onDone({ jobs, elapsedMs })` the end of the whole queue.
 *
 *  The selection follows the job being hashed until the visitor picks one (`select`). */
export function createFileQueue({ runJob, onChange, onSelect, onDone, now = () => performance.now() }) {
  let jobs = [];
  let selectedId = null;
  let following = true;
  // Bumped whenever the list is replaced, so a loop that belongs to an earlier list stops.
  let epoch = 0;
  let nextId = 1;
  let startedAt = 0;

  const byId = (id) => jobs.find((job) => job.id === id) ?? null;
  const abortAll = () => jobs.forEach((job) => job.run?.abort());

  async function pump(mine) {
    for (;;) {
      const job = jobs.find(({ status }) => status === 'queued');
      if (!job) break;
      job.status = 'hashing';
      onChange();
      await runJob(job);
      if (mine !== epoch) return;
      onChange();
    }
    onDone({ jobs, elapsedMs: now() - startedAt });
  }

  return {
    get jobs() {
      return jobs;
    },
    get selected() {
      return byId(selectedId);
    },
    get selectedId() {
      return selectedId;
    },
    /** The job being hashed, if any. */
    get running() {
      return jobs.find(({ status }) => status === 'hashing') ?? null;
    },

    /** Replaces the list with one job per `{ file, path }` (`path` is the name it is shown by), selects
     *  the first and starts hashing. Whatever was running is abandoned. */
    start(entries) {
      abortAll();
      jobs = entries.map(({ file, path }) => ({
        id: nextId++,
        file,
        name: path,
        size: file.size,
        status: 'queued',
        rawHexMap: new Map(),
        ids: null,
        threads: 0,
        stats: null,
        batchId: null,
        run: null,
      }));
      selectedId = jobs[0]?.id ?? null;
      following = true;
      startedAt = now();
      onChange();
      pump(++epoch);
    },

    /** The visitor picks a job: the selection stays on it from now on. */
    select(id) {
      if (!byId(id)) return;
      following = false;
      if (id === selectedId) return;
      selectedId = id;
      onSelect(byId(id));
      onChange();
    },

    /** The runner is starting `job`: selects it if the selection is still following. Says whether
     *  `job` is the selected one, for the runner to show it. */
    follow(job) {
      if (following && selectedId !== job.id) {
        selectedId = job.id;
        onChange();
      }
      return selectedId === job.id;
    },

    /** Takes a job out of the list, stopping it if it is being hashed. The selection moves to the
     *  job next to it. Returns how many are left. */
    remove(id) {
      const index = jobs.findIndex((job) => job.id === id);
      if (index === -1) return jobs.length;
      const [job] = jobs.splice(index, 1);
      job.run?.abort();
      if (id === selectedId) {
        selectedId = (jobs[index] ?? jobs[index - 1])?.id ?? null;
        if (selectedId !== null) onSelect(byId(selectedId));
      }
      onChange();
      return jobs.length;
    },

    /** Abandons everything. */
    clear() {
      epoch++;
      abortAll();
      jobs = [];
      selectedId = null;
      following = true;
      onChange();
    },
  };
}
