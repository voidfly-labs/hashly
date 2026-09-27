/** Notices requests whose worker has gone silent. A worker that dies without an event (some browsers
 *  stop one that runs out of memory without a word) would leave its requests waiting for ever.
 *
 *  `requests()` returns the ones in flight, each with `heardAt`, the `performance.now()` of the last
 *  thing its worker said (the owner keeps that up to date; the watchdog holds no list of its own,
 *  so there is nothing to forget). `start()` begins looking every `checkMs`, and the looking stops by
 *  itself once there are no requests. If one has heard nothing for `stallMs`, `onStall()` is called.
 *
 *  A gap between two looks far past `checkMs` means the page was asleep or throttled, not the worker
 *  silent: what it sent is likely still waiting to be handled. Then the count starts again. */
export function createStallWatchdog({ requests, stallMs, checkMs, onStall }) {
  let timer = null;
  let checkedAt = 0;

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  function check() {
    const inFlight = [...requests()];
    if (!inFlight.length) {
      stop();
      return;
    }
    const now = performance.now();
    const suspended = now - checkedAt > checkMs * 2;
    checkedAt = now;
    if (suspended) {
      for (const request of inFlight) request.heardAt = now;
    } else if (inFlight.some((request) => now - request.heardAt > stallMs)) {
      stop();
      onStall();
    }
  }

  return {
    start() {
      if (timer !== null) return;
      checkedAt = performance.now();
      timer = setInterval(check, checkMs);
    },
    stop,
  };
}
