import { md2 } from '~core/features/hashing/algos/md2.js';

/** The MD2 engine (see hasher-server.js), the pure JavaScript one in core/features/hashing/algos/md2.js. */
export const md2Engine = {
  once: (bytes) => md2(bytes),
  async create() {
    const hasher = md2.create();
    return { update: (chunk) => hasher.update(chunk), digest: () => hasher.hex() };
  },
};
