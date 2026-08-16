import { fromArrayBuffer } from 'crypto-api/src/encoder/array-buffer';
import { toHex } from 'crypto-api/src/encoder/hex';
import Ripemd from 'crypto-api/src/hasher/ripemd';

/** The engine (see hasher-server.js) for RIPEMD of `bits` bits, from crypto-api.
 *  crypto-api reads a binary string, not bytes: it is made once per chunk and shared by every
 *  RIPEMD hasher of the job (`shared.binary`). */
export function ripemdEngine(bits) {
  const binary = (bytes, shared) => {
    shared.binary ??= fromArrayBuffer(
      bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength ? bytes.buffer : bytes.slice().buffer,
    );
    return shared.binary;
  };

  return {
    async create() {
      const hasher = new Ripemd({ length: bits });
      return {
        update: (chunk, shared) => hasher.update(binary(chunk, shared)),
        digest: () => toHex(hasher.finalize()),
      };
    },
  };
}
