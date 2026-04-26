/*
  MD2 — RFC 1319 (Kaliski, 1992) pure-JS implementation.

  API (mirrors hash-wasm's interface):
    window.md2(Uint8Array | string) → hex string      (one-shot)
    window.md2.create() → { update(Uint8Array), hex() }  (incremental / streaming)

  The streaming path is O(1) memory: each update() processes all complete 16-byte
  blocks immediately through both the checksum accumulator (C) and the MD buffer (X).
  Only a trailing partial block (< 16 bytes) is held until hex() finalises.
*/
window.md2 = (function () {
  /* RFC 1319 §3.1 — PI_SUBST permutation table (256 entries derived from π). */
  const S = Uint8Array.from([
     41, 46, 67,201,162,216,124,  1, 61, 54, 84,161,236,240,  6, 19,
     98,167,  5,243,192,199,115,140,152,147, 43,217,188, 76,130,202,
     30,155, 87, 60,253,212,224, 22,103, 66,111, 24,138, 23,229, 18,
    190, 78,196,214,218,158,222, 73,160,251,245,142,187, 47,238,122,
    169,104,121,145, 21,178,  7, 63,148,194, 16,137, 11, 34, 95, 33,
    128,127, 93,154, 90,144, 50, 39, 53, 62,204,231,191,247,151,  3,
    255, 25, 48,179, 72,165,181,209,215, 94,146, 42,172, 86,170,198,
     79,184, 56,210,150,164,125,182,118,252,107,226,156,116,  4,241,
     69,157,112, 89,100,113,135, 32,134, 91,207,101,230, 45,168,  2,
     27, 96, 37,173,174,176,185,246, 28, 70, 97,105, 52, 64,126, 15,
     85, 71,163, 35,221, 81,175, 58,195, 92,249,206,186,197,234, 38,
     44, 83, 13,110,133, 40,132,  9,211,223,205,244, 65,129, 77, 82,
    106,220, 55,200,108,193,171,250, 36,225,123,  8, 12,189,177, 74,
    120,136,149,139,227, 99,232,109,233,203,213,254, 59,  0, 29, 57,
    242,239,183, 14,102, 88,208,228,166,119,114,248,235,117, 75, 10,
     49, 68, 80,180,143,237, 31, 26,219,153,141, 51,159, 17,131, 20,
  ]);

  const _encoder = new TextEncoder();

  /** RFC 1319 §3.4 — 18-round compression of one 16-byte block into X[48]. */
  function compress(X, block) {
    for (let j = 0; j < 16; j++) {
      X[16 + j] = block[j];
      X[32 + j] = block[j] ^ X[j];
    }
    let t = 0;
    for (let j = 0; j < 18; j++) {
      for (let k = 0; k < 48; k++) t = X[k] ^= S[t];
      t = (t + j) & 0xFF;
    }
  }

  /** RFC 1319 §3.2 — update checksum C over one 16-byte block; returns new L. */
  function checksum(C, block, L) {
    for (let j = 0; j < 16; j++) L = C[j] ^= S[block[j] ^ L];
    return L;
  }

  function toBytes(input) {
    return typeof input === 'string' ? _encoder.encode(input) : input;
  }

  function toHex(buf) {
    let hex = '';
    for (let i = 0; i < 16; i++) hex += (buf[i] >> 4).toString(16) + (buf[i] & 0xF).toString(16);
    return hex;
  }

  /** One-shot: md2(data) → hex digest. */
  function md2(input) {
    const h = md2.create();
    h.update(toBytes(input));
    return h.hex();
  }

  /** Streaming: md2.create() → { update(Uint8Array), hex() }. */
  md2.create = function () {
    const C     = new Uint8Array(16);   // checksum accumulator  (§3.2)
    const X     = new Uint8Array(48);   // compression buffer    (§3.4)
    const buf   = new Uint8Array(16);   // partial-block buffer
    let   L     = 0;                    // checksum carry byte
    let   bLen  = 0;                    // bytes in buf

    /** Process one complete 16-byte block through both states. */
    function feed(block) {
      L = checksum(C, block, L);
      compress(X, block);
    }

    return {
      update(chunk) {
        let pos = 0;

        // Complete any partial block from a previous call.
        if (bLen > 0) {
          const take = Math.min(16 - bLen, chunk.length);
          buf.set(chunk.subarray(0, take), bLen);
          bLen += take;
          pos  += take;
          if (bLen === 16) { feed(buf); bLen = 0; }
        }

        // Process whole blocks directly (zero-copy via subarray).
        while (pos + 16 <= chunk.length) {
          feed(chunk.subarray(pos, pos + 16));
          pos += 16;
        }

        // Stash any remaining bytes.
        if (pos < chunk.length) {
          buf.set(chunk.subarray(pos), 0);
          bLen = chunk.length - pos;
        }

        return this;
      },

      hex() {
        // §3.1 — Pad to a 16-byte boundary (pad value = number of bytes added).
        const pad = new Uint8Array(16);
        pad.set(buf.subarray(0, bLen));
        pad.fill(16 - bLen, bLen);
        feed(pad);

        // §3.3 — Append checksum block (compress only, no further checksum update).
        compress(X, C);

        return toHex(X);
      },
    };
  };

  return md2;
})();
