import { createCrc } from './crc-engine.js';

// The models of the CRC catalogue (https://reveng.sourceforge.io/crc-catalogue/): width, polynomial in
// its normal form, initial value, reflection of input and output (always both), and final xor.
const F64 = 0xffffffffffffffffn;

export const crc_8_maxim_dow = createCrc({ width: 8, poly: 0x31n, init: 0x00n, refin: true, xorout: 0x00n });
export const crc_8_dvb_s2 = createCrc({ width: 8, poly: 0xd5n, init: 0x00n, refin: false, xorout: 0x00n });
export const crc_8_smbus = createCrc({ width: 8, poly: 0x07n, init: 0x00n, refin: false, xorout: 0x00n });
export const crc_16_arc = createCrc({ width: 16, poly: 0x8005n, init: 0x0000n, refin: true, xorout: 0x0000n });
export const crc_16_ibm_3740 = createCrc({ width: 16, poly: 0x1021n, init: 0xffffn, refin: false, xorout: 0x0000n });
export const crc_16_dnp = createCrc({ width: 16, poly: 0x3d65n, init: 0x0000n, refin: true, xorout: 0xffffn });
export const crc_16_kermit = createCrc({ width: 16, poly: 0x1021n, init: 0x0000n, refin: true, xorout: 0x0000n });
export const crc_16_modbus = createCrc({ width: 16, poly: 0x8005n, init: 0xffffn, refin: true, xorout: 0x0000n });
export const crc_16_usb = createCrc({ width: 16, poly: 0x8005n, init: 0xffffn, refin: true, xorout: 0xffffn });
export const crc_16_xmodem = createCrc({ width: 16, poly: 0x1021n, init: 0x0000n, refin: false, xorout: 0x0000n });
export const crc_24_ble = createCrc({ width: 24, poly: 0x00065bn, init: 0x555555n, refin: true, xorout: 0x000000n });
export const crc_24_interlaken = createCrc({
  width: 24,
  poly: 0x328b63n,
  init: 0xffffffn,
  refin: false,
  xorout: 0xffffffn,
});
export const crc_24_openpgp = createCrc({
  width: 24,
  poly: 0x864cfbn,
  init: 0xb704cen,
  refin: false,
  xorout: 0x000000n,
});
export const crc_32_bzip2 = createCrc({
  width: 32,
  poly: 0x04c11db7n,
  init: 0xffffffffn,
  refin: false,
  xorout: 0xffffffffn,
});
export const crc_32_jamcrc = createCrc({
  width: 32,
  poly: 0x04c11db7n,
  init: 0xffffffffn,
  refin: true,
  xorout: 0x00000000n,
});
export const crc_32_mpeg_2 = createCrc({
  width: 32,
  poly: 0x04c11db7n,
  init: 0xffffffffn,
  refin: false,
  xorout: 0x00000000n,
});
export const crc_64_ecma_182 = createCrc({ width: 64, poly: 0x42f0e1eba9ea3693n, init: 0n, refin: false, xorout: 0n });
export const crc_64_nvme = createCrc({ width: 64, poly: 0xad93d23594c93659n, init: F64, refin: true, xorout: F64 });
export const crc_64_redis = createCrc({ width: 64, poly: 0xad93d23594c935a9n, init: 0n, refin: true, xorout: 0n });
export const crc_82_darc = createCrc({ width: 82, poly: 0x0308c0111011401440411n, init: 0n, refin: true, xorout: 0n });
