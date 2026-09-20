/** The files of one drop, hashed a few at a time: the list of jobs, which one the page shows, and the
 *  scheduler that starts the next job whenever one is over, up to `concurrency()` at once.
 *
 *  A job is `{ id, file, name, size, status, rawHexMap, ids, threads, batchId, run, stats }`. Its `status` is
 *  'queued', 'hashing', 'done', 'failed', 'stopped' (every algorithm it computed was hidden) or
 *  'skipped' (there was nothing visible to compute); `runJob(job)` sets all but the first two, and
 *  those are set here. `rawHexMap` (`Map<algoId, hex>`), `ids`, `threads`, `batchId`, `run` and `stats` (the last
 *  `{ text, state }` of its status line) are the runner's.
 *
 *  `runJob(job)` hashes one file and settles when it is over, however it ended. `concurrency()` is how
 *  many files may be hashed at once (asked each time a job is to start). `onStart()` is a run of the
 *  queue beginning (a new list, or a failed job put back when nothing was running), `onChange()`
 *  follows every change to the list or the selection, `onSelect(job)` a change of the selection that
 *  the runner did not make itself, `onDone({ jobs, elapsedMs })` the end of the whole queue.
 *
 *  The selection follows the first job being hashed until the visitor picks one (`select`). A failed
 *  job can be put back in the queue (`retry`). */
export function createFileQueue({
  runJob,
  concurrency = () => 1,
  onStart = () => {},
  onChange,
  onSelect,
  onDone,
  now = () => performance.now(),
}) {
  let jobs = [];
  let selectedId = null;
  let following = true;
  // Bumped whenever the list is replaced, so a loop that belongs to an earlier list stops.
  let epoch = 0;
  let nextId = 1;
  let startedAt = 0;
  // How many jobs of the current list are being hashed.
  let running = 0;

  const fresh = () => ({
    status: 'queued',
    rawHexMap: new Map(),
    ids: null,
    threads: 0,
    stats: null,
    batchId: null,
    run: null,
    ratio: 0,
  });
  const byId = (id) => jobs.find((job) => job.id === id) ?? null;
  const abortAll = () => jobs.forEach((job) => job.run?.abort());
  const leading = () => jobs.find(({ status }) => status === 'hashing') ?? null;

  async function run(job, mine) {
    job.status = 'hashing';
    running++;
    onChange();
    try {
      await runJob(job);
    } catch (error) {
      // Whatever threw, the queue goes on: a job left 'hashing' would hold its slot for good.
      console.error(error);
      job.run?.abort();
      job.run = null;
      if (job.status === 'hashing') job.status = 'failed';
    }
    if (mine !== epoch) return;
    running--;
    // The selection was on the job that is over: it moves on to the first one still being hashed.
    const next = leading();
    if (following && selectedId === job.id && next) {
      selectedId = next.id;
      onSelect(next);
    }
    onChange();
    pump(mine);
  }

  /** Starts as many queued jobs as there is room for; says the queue is over when nothing is left to run. */
  function pump(mine) {
    const room = Math.max(1, concurrency());
    for (let job; running < room && (job = jobs.find(({ status }) => status === 'queued'));) run(job, mine);
    if (!running) onDone({ jobs, elapsedMs: now() - startedAt });
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
    /** The jobs being hashed. */
    get active() {
      return jobs.filter(({ status }) => status === 'hashing');
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
        ...fresh(),
      }));
      selectedId = jobs[0]?.id ?? null;
      following = true;
      startedAt = now();
      running = 0;
      epoch++;
      onChange();
      onStart();
      pump(epoch);
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

    /** The runner is starting `job`: selects it if the selection is still following and no job before it
     *  is being hashed. Says whether `job` is the selected one, for the runner to show it. */
    follow(job) {
      if (following && selectedId !== job.id) {
        const first = leading();
        if (!first || first === job) {
          selectedId = job.id;
          onChange();
        }
      }
      return selectedId === job.id;
    },

    /** Puts a failed job back in the queue, to be hashed again from the start: with jobs still being
     *  hashed it starts as soon as there is room, and with the queue over it starts again for it alone. */
    retry(id) {
      const job = byId(id);
      if (job?.status !== 'failed') return;
      Object.assign(job, fresh());
      onChange();
      if (!running) {
        startedAt = now();
        onStart();
      }
      pump(epoch);
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
      running = 0;
      abortAll();
      jobs = [];
      selectedId = null;
      following = true;
      onChange();
    },
  };
}
