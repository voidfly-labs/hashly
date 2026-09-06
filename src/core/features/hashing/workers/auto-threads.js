// Threads hashing one file at once, unless the visitor chose a number (Settings): as many as the
// machine has cores but one (the page needs a core too), up to this many. More stops paying off: a
// file's time is that of its slowest share.
const MAX_THREADS = 8;

export const autoThreads = () => Math.min(MAX_THREADS, Math.max(1, (navigator.hardwareConcurrency ?? 2) - 1));
