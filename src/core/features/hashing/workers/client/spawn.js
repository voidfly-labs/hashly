/** Starts the Web Worker at `url` (an app's `import url from './worker.js?worker&url'`).
 *
 *  A production build bundles the worker into one classic script, which every browser in the
 *  build targets can run (module workers arrived later in Firefox and Safari). The dev server
 *  serves it as a module instead, and says so with `type: 'module'`. */
export function spawnWorker(url) {
  return new Worker(url, import.meta.env.DEV ? { type: 'module' } : undefined);
}
