/** Table-driven CRCs (slice-by-8) for the models of the Rocksoft catalogue whose input and output
 *  reflection agree, 8 to 96 bits wide, with the register held in 32-bit limbs (no BigInt in the loops).
 *
 *  `createCrc({ width, poly, init, refin, xorout })` (`poly`, `init` and `xorout` as BigInt, `poly` in the
 *  catalogue's normal form) returns `fn`: `fn(bytes)` is the digest of `bytes` as lowercase hex, zero-padded
 *  to the width, and `fn.create()` makes a streaming hasher `{ update(chunk), hex() }`.
 *
 *  A reflected register keeps its lowest limb first and shifts right; a normal one is held left-aligned
 *  in its limbs (highest limb first) and shifts left. Tables: `T[k][b]` is the register after the byte `b`
 *  followed by `k` zero bytes, stored as `t[(k * 256 + b) * limbs + limb]`. Eight bytes are taken at a
 *  time: the first eight bytes are combined with the register, and each byte of the result is looked up
 *  in the table of its position. */

const MASK32 = 0xffffffffn;

const reflectBits = (value, width) => {
  let out = 0n;
  for (let i = 0; i < width; i++) if ((value >> BigInt(i)) & 1n) out |= 1n << BigInt(width - 1 - i);
  return out;
};

/** The register after the single byte `b`, with nothing in front of it. */
function reflectedEntry(b, rpoly) {
  let c = BigInt(b);
  for (let i = 0; i < 8; i++) c = c & 1n ? (c >> 1n) ^ rpoly : c >> 1n;
  return c;
}

function normalEntry(b, { bits, full, lpoly }) {
  let c = BigInt(b) << (bits - 8n);
  for (let i = 0; i < 8; i++) c = ((c << 1n) & full) ^ ((c >> (bits - 1n)) & 1n ? lpoly : 0n);
  return c;
}

/** `v` followed by one more zero byte. */
function nextZeroByte(v, t0, { refin, bits, full }) {
  return refin ? (v >> 8n) ^ t0[Number(v & 0xffn)] : ((v << 8n) & full) ^ t0[Number(v >> (bits - 8n))];
}

function buildTables({ width, poly, refin }) {
  const limbs = Math.ceil(width / 32);
  const bits = BigInt(32 * limbs);
  const shape = { refin, bits, full: (1n << bits) - 1n, lpoly: poly << BigInt(32 * limbs - width) };
  const rpoly = reflectBits(poly, width);
  const t0 = Array.from({ length: 256 }, (_, b) => (refin ? reflectedEntry(b, rpoly) : normalEntry(b, shape)));
  const limbOf = (v, j) => Number((v >> BigInt(32 * (refin ? j : limbs - 1 - j))) & MASK32);
  const tbl = new Uint32Array(8 * 256 * limbs);
  for (let b = 0; b < 256; b++) {
    let v = t0[b];
    for (let k = 0; k < 8; k++) {
      for (let j = 0; j < limbs; j++) tbl[(k * 256 + b) * limbs + j] = limbOf(v, j);
      v = nextZeroByte(v, t0, shape);
    }
  }
  return { tbl, shift: BigInt(32 * limbs - width), limbOf };
}

// ── The loops ──────────────────────────────────────────────────────────────
// `t` the tables, `s` the register's limbs (read and written back), `buf[off, end)` the input.
// The eight-byte step is written out per width class so that every index is a constant.

function reflected1(t, s, buf, off, end) {
  let s0 = s[0];
  let i = off;
  for (; i + 8 <= end; i += 8) {
    const x0 = s0 ^ (buf[i] | (buf[i + 1] << 8) | (buf[i + 2] << 16) | (buf[i + 3] << 24));
    const x1 = buf[i + 4] | (buf[i + 5] << 8) | (buf[i + 6] << 16) | (buf[i + 7] << 24);
    s0 =
      t[1792 + (x0 & 255)] ^
      t[1536 + ((x0 >>> 8) & 255)] ^
      t[1280 + ((x0 >>> 16) & 255)] ^
      t[1024 + (x0 >>> 24)] ^
      t[768 + (x1 & 255)] ^
      t[512 + ((x1 >>> 8) & 255)] ^
      t[256 + ((x1 >>> 16) & 255)] ^
      t[x1 >>> 24];
  }
  for (; i < end; i++) s0 = (s0 >>> 8) ^ t[(s0 ^ buf[i]) & 255];
  s[0] = s0;
}

function reflected2(t, s, buf, off, end) {
  let s0 = s[0];
  let s1 = s[1];
  let i = off;
  for (; i + 8 <= end; i += 8) {
    const x0 = s0 ^ (buf[i] | (buf[i + 1] << 8) | (buf[i + 2] << 16) | (buf[i + 3] << 24));
    const x1 = s1 ^ (buf[i + 4] | (buf[i + 5] << 8) | (buf[i + 6] << 16) | (buf[i + 7] << 24));
    const a = (x0 & 255) * 2;
    const b = ((x0 >>> 8) & 255) * 2;
    const c = ((x0 >>> 16) & 255) * 2;
    const d = (x0 >>> 24) * 2;
    const e = (x1 & 255) * 2;
    const f = ((x1 >>> 8) & 255) * 2;
    const g = ((x1 >>> 16) & 255) * 2;
    const h = (x1 >>> 24) * 2;
    s0 = t[3584 + a] ^ t[3072 + b] ^ t[2560 + c] ^ t[2048 + d] ^ t[1536 + e] ^ t[1024 + f] ^ t[512 + g] ^ t[h];
    s1 = t[3585 + a] ^ t[3073 + b] ^ t[2561 + c] ^ t[2049 + d] ^ t[1537 + e] ^ t[1025 + f] ^ t[513 + g] ^ t[1 + h];
  }
  for (; i < end; i++) {
    const idx = ((s0 ^ buf[i]) & 255) * 2;
    const n0 = ((s0 >>> 8) | (s1 << 24)) ^ t[idx];
    s1 = (s1 >>> 8) ^ t[idx + 1];
    s0 = n0;
  }
  s[0] = s0;
  s[1] = s1;
}

function reflected3(t, s, buf, off, end) {
  let s0 = s[0];
  let s1 = s[1];
  let s2 = s[2];
  let i = off;
  for (; i + 8 <= end; i += 8) {
    const x0 = s0 ^ (buf[i] | (buf[i + 1] << 8) | (buf[i + 2] << 16) | (buf[i + 3] << 24));
    const x1 = s1 ^ (buf[i + 4] | (buf[i + 5] << 8) | (buf[i + 6] << 16) | (buf[i + 7] << 24));
    const a = (x0 & 255) * 3;
    const b = ((x0 >>> 8) & 255) * 3;
    const c = ((x0 >>> 16) & 255) * 3;
    const d = (x0 >>> 24) * 3;
    const e = (x1 & 255) * 3;
    const f = ((x1 >>> 8) & 255) * 3;
    const g = ((x1 >>> 16) & 255) * 3;
    const h = (x1 >>> 24) * 3;
    const n0 =
      s2 ^ t[5376 + a] ^ t[4608 + b] ^ t[3840 + c] ^ t[3072 + d] ^ t[2304 + e] ^ t[1536 + f] ^ t[768 + g] ^ t[h];
    const n1 =
      t[5377 + a] ^ t[4609 + b] ^ t[3841 + c] ^ t[3073 + d] ^ t[2305 + e] ^ t[1537 + f] ^ t[769 + g] ^ t[1 + h];
    s2 = t[5378 + a] ^ t[4610 + b] ^ t[3842 + c] ^ t[3074 + d] ^ t[2306 + e] ^ t[1538 + f] ^ t[770 + g] ^ t[2 + h];
    s0 = n0;
    s1 = n1;
  }
  for (; i < end; i++) {
    const idx = ((s0 ^ buf[i]) & 255) * 3;
    const n0 = ((s0 >>> 8) | (s1 << 24)) ^ t[idx];
    const n1 = ((s1 >>> 8) | (s2 << 24)) ^ t[idx + 1];
    s2 = (s2 >>> 8) ^ t[idx + 2];
    s0 = n0;
    s1 = n1;
  }
  s[0] = s0;
  s[1] = s1;
  s[2] = s2;
}

function normal1(t, s, buf, off, end) {
  let s0 = s[0];
  let i = off;
  for (; i + 8 <= end; i += 8) {
    const x0 = s0 ^ ((buf[i] << 24) | (buf[i + 1] << 16) | (buf[i + 2] << 8) | buf[i + 3]);
    const x1 = (buf[i + 4] << 24) | (buf[i + 5] << 16) | (buf[i + 6] << 8) | buf[i + 7];
    s0 =
      t[1792 + (x0 >>> 24)] ^
      t[1536 + ((x0 >>> 16) & 255)] ^
      t[1280 + ((x0 >>> 8) & 255)] ^
      t[1024 + (x0 & 255)] ^
      t[768 + (x1 >>> 24)] ^
      t[512 + ((x1 >>> 16) & 255)] ^
      t[256 + ((x1 >>> 8) & 255)] ^
      t[x1 & 255];
  }
  for (; i < end; i++) s0 = (s0 << 8) ^ t[((s0 >>> 24) ^ buf[i]) & 255];
  s[0] = s0;
}

function normal2(t, s, buf, off, end) {
  let s0 = s[0];
  let s1 = s[1];
  let i = off;
  for (; i + 8 <= end; i += 8) {
    const x0 = s0 ^ ((buf[i] << 24) | (buf[i + 1] << 16) | (buf[i + 2] << 8) | buf[i + 3]);
    const x1 = s1 ^ ((buf[i + 4] << 24) | (buf[i + 5] << 16) | (buf[i + 6] << 8) | buf[i + 7]);
    const a = (x0 >>> 24) * 2;
    const b = ((x0 >>> 16) & 255) * 2;
    const c = ((x0 >>> 8) & 255) * 2;
    const d = (x0 & 255) * 2;
    const e = (x1 >>> 24) * 2;
    const f = ((x1 >>> 16) & 255) * 2;
    const g = ((x1 >>> 8) & 255) * 2;
    const h = (x1 & 255) * 2;
    s0 = t[3584 + a] ^ t[3072 + b] ^ t[2560 + c] ^ t[2048 + d] ^ t[1536 + e] ^ t[1024 + f] ^ t[512 + g] ^ t[h];
    s1 = t[3585 + a] ^ t[3073 + b] ^ t[2561 + c] ^ t[2049 + d] ^ t[1537 + e] ^ t[1025 + f] ^ t[513 + g] ^ t[1 + h];
  }
  for (; i < end; i++) {
    const idx = (((s0 >>> 24) ^ buf[i]) & 255) * 2;
    const n0 = ((s0 << 8) | (s1 >>> 24)) ^ t[idx];
    s1 = (s1 << 8) ^ t[idx + 1];
    s0 = n0;
  }
  s[0] = s0;
  s[1] = s1;
}

const LOOPS = { r1: reflected1, r2: reflected2, r3: reflected3, n1: normal1, n2: normal2 };

export function createCrc({ width, poly, init, refin, xorout }) {
  const limbs = Math.ceil(width / 32);
  const kind = `${refin ? 'r' : 'n'}${limbs}`;
  if (width < 8 || !LOOPS[kind]) throw new Error(`Unsupported CRC: width ${width}, refin ${refin}`);
  const loop = LOOPS[kind];
  const hexLen = Math.ceil(width / 4);
  let built = null; // the tables are made when first needed

  const create = () => {
    built ??= buildTables({ width, poly, refin });
    const { tbl, shift, limbOf } = built;
    const start = refin ? reflectBits(init, width) : init << shift;
    const s = new Uint32Array(limbs);
    for (let j = 0; j < limbs; j++) s[j] = limbOf(start, j);
    return {
      update(chunk) {
        loop(tbl, s, chunk, 0, chunk.length);
      },
      hex() {
        let v = 0n;
        for (let j = 0; j < limbs; j++) v |= BigInt(s[j]) << BigInt(32 * (refin ? j : limbs - 1 - j));
        if (!refin) v >>= shift;
        return (v ^ xorout).toString(16).padStart(hexLen, '0');
      },
    };
  };

  const fn = (bytes) => {
    const hasher = create();
    hasher.update(bytes);
    return hasher.hex();
  };
  fn.create = create;
  return fn;
}
