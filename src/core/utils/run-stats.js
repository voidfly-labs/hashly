const MIB = 1024 * 1024;
const GIB = 1024 * MIB;

// Live numbers start this far into a run; before that the caller shows a plain "Hashing…".
const LIVE_AFTER_MS = 1500;
// Below this a run is mostly start-up cost, so its "speed" would only mislead.
const SPEED_AFTER_MS = 500;
// ETA from the first chunks is unrepresentative (cold caches, WASM start-up).
const ETA_AFTER_RATIO = 0.03;
// Speed is averaged over this window, so one slow chunk doesn't jerk the numbers.
const WINDOW_MS = 5000;
// The line is rewritten at most this often.
const UPDATE_EVERY_MS = 1000;

/** "38.2 MiB/s", in the same binary units as the file size. */
function formatRate(bytesPerSecond) {
  if (bytesPerSecond >= GIB) return `${(bytesPerSecond / GIB).toFixed(1)} GiB/s`;
  if (bytesPerSecond >= MIB) return `${(bytesPerSecond / MIB).toFixed(1)} MiB/s`;
  return `${Math.max(1, Math.round(bytesPerSecond / 1024))} KiB/s`;
}

/** "45 s", "3 min", "1 h 05 min": coarse on purpose, an ETA isn't precise. */
function formatRemaining(seconds) {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/** "<0.1 s", "4.2 s", "1 min 12 s". */
function formatElapsed(seconds) {
  if (seconds < 0.05) return '<0.1 s';
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const whole = Math.round(seconds);
  if (whole < 3600) return `${Math.floor(whole / 60)} min ${String(whole % 60).padStart(2, '0')} s`;
  return `${Math.floor(whole / 3600)} h ${String(Math.floor((whole % 3600) / 60)).padStart(2, '0')} min`;
}

/** Speed and time-left for one hashing run over `totalBytes`.
 *
 *  `update(ratio)` takes the 0–1 progress and returns the line to show
 *  ("42% · 38.2 MiB/s · 2 min left · 4 threads"), or null when there is nothing new to show:
 *  too early in the run, or sooner than UPDATE_EVERY_MS after the last line.
 *  `summary()` returns "Hashed in 4.2 s · 38.2 MiB/s · 4 threads" for a finished run (just
 *  "Hashed in 0.2 s" when it was too short for a speed to mean anything).
 *
 *  `threads` is how many threads the run is spread over, named on every line it produces.
 *  `now` is injectable (ms) so the maths can be tested without waiting. */
export function createRunStats(totalBytes, { threads = 1, now = () => performance.now() } = {}) {
  const onThreads = `${threads} ${threads === 1 ? 'thread' : 'threads'}`;
  const start = now();
  const samples = [{ time: start, bytes: 0 }];
  let lastShown = -Infinity;

  /** Bytes per second over the recent window, or over the whole run if it is shorter.
   *  The newest sample is the current one, so the span always starts at an earlier
   *  one: if every earlier sample is older than the window (one slow chunk took
   *  longer than that), the latest of them is used. */
  function speed(time, bytes) {
    const earlier = samples.slice(0, -1);
    const from = earlier.find((s) => time - s.time <= WINDOW_MS) ?? earlier[earlier.length - 1];
    const seconds = (time - from.time) / 1000;
    return seconds > 0 ? (bytes - from.bytes) / seconds : 0;
  }

  return {
    /** The plain line for the start of a run, before there are numbers to show. */
    start: () => `Hashing… · ${onThreads}`,

    update(ratio) {
      const time = now();
      const bytes = ratio * totalBytes;
      samples.push({ time, bytes });
      while (samples.length > 2 && time - samples[1].time > WINDOW_MS) samples.shift();

      if (time - start < LIVE_AFTER_MS || time - lastShown < UPDATE_EVERY_MS) return null;
      const rate = speed(time, bytes);
      if (rate <= 0) return null;
      lastShown = time;

      const parts = [`${Math.floor(ratio * 100)}%`, formatRate(rate)];
      if (ratio >= ETA_AFTER_RATIO) parts.push(`${formatRemaining((totalBytes - bytes) / rate)} left`);
      return [...parts, onThreads].join(' · ');
    },

    summary() {
      const elapsedMs = now() - start;
      const took = `Hashed in ${formatElapsed(elapsedMs / 1000)}`;
      if (elapsedMs < SPEED_AFTER_MS) return `${took} · ${onThreads}`;
      return `${took} · ${formatRate(totalBytes / (elapsedMs / 1000))} · ${onThreads}`;
    },
  };
}
