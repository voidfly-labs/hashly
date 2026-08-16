/** A hash-wasm algorithm engine (see hasher-server.js): `fn(bytes)` is its one-shot function,
 *  `createFn()` makes a streaming hasher. */
export function wasmEngine({ fn, createFn }) {
  return {
    once: (bytes) => fn(bytes),
    async create() {
      const hasher = await createFn();
      hasher.init();
      return { update: (chunk) => hasher.update(chunk), digest: () => hasher.digest('hex') };
    },
  };
}
