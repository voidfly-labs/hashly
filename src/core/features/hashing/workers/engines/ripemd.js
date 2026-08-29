import { fromArrayBuffer } from 'crypto-api/src/encoder/array-buffer';
import { toHex } from 'crypto-api/src/encoder/hex';
import Ripemd from 'crypto-api/src/hasher/ripemd';

const UINT32 = 2 ** 32;

/** crypto-api's RIPEMD with a correct message length. Its `addLengthBits` encodes the length with
 *  int32 shifts (a known, unfixed gap upstream), so every digest of 2 GiB or more is silently wrong. */
class Ripemd64bit extends Ripemd {
  addLengthBits() {
    const bits = this.state.length * 8; // exact up to 2^53 bits
    let tail = '';
    for (const word of [bits % UINT32, Math.floor(bits / UINT32)]) {
      for (let shift = 0; shift < 32; shift += 8) tail += String.fromCharCode((word >>> shift) & 0xff);
    }
    this.state.message += tail;
  }
}

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
      const hasher = new Ripemd64bit({ length: bits });
      return {
        update: (chunk, shared) => hasher.update(binary(chunk, shared)),
        digest: () => toHex(hasher.finalize()),
      };
    },
  };
}
