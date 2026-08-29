import { toHex } from 'crypto-api/src/encoder/hex';
import Ripemd from 'crypto-api/src/hasher/ripemd';

const UINT32 = 2 ** 32;
const BLOCK = 64; // bytes

/** A binary string, one character per byte, of less than a block of `bytes`. */
const binary = (bytes) => String.fromCharCode.apply(null, bytes);

/** crypto-api's RIPEMD with a correct message length, fed bytes instead of a string.
 *
 *  - Its `addLengthBits` encodes the length with int32 shifts (a known, unfixed gap upstream), so every
 *    digest of 2 GiB or more is silently wrong.
 *  - It reads a binary string, and turning a chunk into one and then picking it apart again a block at a
 *    time cost about as much as the rounds themselves. `updateBytes` hands the round functions (which are
 *    crypto-api's own) their words straight from the bytes; only the unfinished block at the end of a
 *    chunk is ever a string, kept in `state.message` as `finalize` expects it. */
class Ripemd64bit extends Ripemd {
  addLengthBits() {
    const bits = this.state.length * 8; // exact up to 2^53 bits
    let tail = '';
    for (const word of [bits % UINT32, Math.floor(bits / UINT32)]) {
      for (let shift = 0; shift < 32; shift += 8) tail += String.fromCharCode((word >>> shift) & 0xff);
    }
    this.state.message += tail;
  }

  updateBytes(bytes) {
    const { length } = bytes;
    let offset = 0;
    this.state.length += length;

    // Complete the block left over from the last chunk first.
    if (this.state.message.length) {
      offset = Math.min(BLOCK - this.state.message.length, length);
      this.state.message += binary(bytes.subarray(0, offset));
      if (this.state.message.length < BLOCK) return;
      this.process();
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, length);
    const words = new Array(BLOCK / 4);
    for (; offset + BLOCK <= length; offset += BLOCK) {
      for (let i = 0; i < words.length; i++) words[i] = view.getInt32(offset + i * 4, true);
      this.processBlock(words);
    }
    if (offset < length) this.state.message += binary(bytes.subarray(offset));
  }
}

/** The engine (see hasher-server.js) for RIPEMD of `bits` bits, from crypto-api. */
export function ripemdEngine(bits) {
  return {
    async create() {
      const hasher = new Ripemd64bit({ length: bits });
      return {
        update: (chunk) => hasher.updateBytes(chunk),
        digest: () => toHex(hasher.finalize()),
      };
    },
  };
}
