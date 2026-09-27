const OUT_OF_MEMORY = /out of memory|allocation failed/i;
const WEBASSEMBLY = 'WebAssembly failed in this browser';

// By the error's `name`, which survives the worker (see worker-channel.js). A Map, as the name is not ours.
const BY_NAME = new Map([
  ['NotFoundError', 'file not found (moved or deleted)'],
  ['NotReadableError', 'can’t read file (changed or blocked)'],
  ['SecurityError', 'access to the file was blocked'],
  ['CompileError', WEBASSEMBLY],
  ['LinkError', WEBASSEMBLY],
]);

// By message: those of our own errors (hasher-server.js, worker-channel.js), and the browser's for WebAssembly.
const BY_MESSAGE = [
  [/^File changed while reading$/, 'file changed while reading'],
  [/^Hashing worker stopped responding$/, 'worker stopped responding'],
  [/^Hashing worker/, 'worker failed to run or crashed'],
  [/WebAssembly/, WEBASSEMBLY],
];

/** A short reason for a failed hash, or '' for an error that is not a known kind. */
export function describeError(error) {
  const message = String(error?.message ?? error ?? '');
  if (OUT_OF_MEMORY.test(message)) return 'out of memory, try fewer threads';
  return BY_NAME.get(error?.name) ?? BY_MESSAGE.find(([pattern]) => pattern.test(message))?.[1] ?? '';
}
