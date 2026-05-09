import { createModel } from 'js-crc';

export { crc16, crc32 } from 'js-crc';

export const crc_8_maxim_dow = createModel({
  width: 8,
  poly: 0x31,
  init: 0x00,
  refin: true,
  refout: true,
  xorout: 0x00,
});
export const crc_8_dvb_s2 = createModel({
  width: 8,
  poly: 0xd5,
  init: 0x00,
  refin: false,
  refout: false,
  xorout: 0x00,
});
export const crc_8_smbus = createModel({ width: 8, poly: 0x07, init: 0x00, refin: false, refout: false, xorout: 0x00 });
export const crc_16_ibm_3740 = createModel({
  width: 16,
  poly: 0x1021,
  init: 0xffff,
  refin: false,
  refout: false,
  xorout: 0x0000,
});
export const crc_16_dnp = createModel({
  width: 16,
  poly: 0x3d65,
  init: 0x0000,
  refin: true,
  refout: true,
  xorout: 0xffff,
});
export const crc_16_kermit = createModel({
  width: 16,
  poly: 0x1021,
  init: 0x0000,
  refin: true,
  refout: true,
  xorout: 0x0000,
});
export const crc_16_modbus = createModel({
  width: 16,
  poly: 0x8005,
  init: 0xffff,
  refin: true,
  refout: true,
  xorout: 0x0000,
});
export const crc_16_usb = createModel({
  width: 16,
  poly: 0x8005,
  init: 0xffff,
  refin: true,
  refout: true,
  xorout: 0xffff,
});
export const crc_16_xmodem = createModel({
  width: 16,
  poly: 0x1021,
  init: 0x0000,
  refin: false,
  refout: false,
  xorout: 0x0000,
});
export const crc_24_ble = createModel({
  width: 24,
  poly: 0x00065b,
  init: 0x555555,
  refin: true,
  refout: true,
  xorout: 0x000000,
});
export const crc_24_interlaken = createModel({
  width: 24,
  poly: 0x328b63,
  init: 0xffffff,
  refin: false,
  refout: false,
  xorout: 0xffffff,
});
export const crc_24_openpgp = createModel({
  width: 24,
  poly: 0x864cfb,
  init: 0xb704ce,
  refin: false,
  refout: false,
  xorout: 0x000000,
});
export const crc_32c = createModel({
  width: 32,
  poly: 0x1edc6f41,
  init: 0xffffffff,
  refin: true,
  refout: true,
  xorout: 0xffffffff,
});
export const crc_32_bzip2 = createModel({
  width: 32,
  poly: 0x04c11db7,
  init: 0xffffffff,
  refin: false,
  refout: false,
  xorout: 0xffffffff,
});
export const crc_32_jamcrc = createModel({
  width: 32,
  poly: 0x04c11db7,
  init: 0xffffffff,
  refin: true,
  refout: true,
  xorout: 0x00000000,
});
export const crc_32_mpeg_2 = createModel({
  width: 32,
  poly: 0x04c11db7,
  init: 0xffffffff,
  refin: false,
  refout: false,
  xorout: 0x00000000,
});
export const crc_64_ecma_182 = createModel({
  width: 64,
  poly: [0x42f0e1eb, 0xa9ea3693],
  init: [0, 0],
  refin: false,
  refout: false,
  xorout: [0, 0],
});
export const crc_64_nvme = createModel({
  width: 64,
  poly: [0xad93d235, 0x94c93659],
  init: [0xffffffff, 0xffffffff],
  refin: true,
  refout: true,
  xorout: [0xffffffff, 0xffffffff],
});
export const crc_64_redis = createModel({
  width: 64,
  poly: [0xad93d235, 0x94c935a9],
  init: [0, 0],
  refin: true,
  refout: true,
  xorout: [0, 0],
});
export const crc_64_xz = createModel({
  width: 64,
  poly: [0x42f0e1eb, 0xa9ea3693],
  init: [0xffffffff, 0xffffffff],
  refin: true,
  refout: true,
  xorout: [0xffffffff, 0xffffffff],
});
export const crc_82_darc = createModel({
  width: 82,
  poly: [0x0308c, 0x01110114, 0x01440411],
  init: [0, 0, 0],
  refin: true,
  refout: true,
  xorout: [0, 0, 0],
});
