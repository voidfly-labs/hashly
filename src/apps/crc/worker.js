import { initHasherServer } from '~core/workers/hasher-server.js';

import {
  crc_8_dvb_s2,
  crc_8_maxim_dow,
  crc_8_smbus,
  crc_16_dnp,
  crc_16_ibm_3740,
  crc_16_kermit,
  crc_16_modbus,
  crc_16_usb,
  crc_16_xmodem,
  crc_24_ble,
  crc_24_interlaken,
  crc_24_openpgp,
  crc_32_bzip2,
  crc_32_jamcrc,
  crc_32_mpeg_2,
  crc_32c,
  crc_64_ecma_182,
  crc_64_nvme,
  crc_64_redis,
  crc_64_xz,
  crc_82_darc,
  crc16,
  crc32,
} from './algos/crc-fns.js';

// Each CRC is as wide as its `hexLen` says; the digest is zero-padded to that.
const crc = (fn, hexLen) => ({
  once: (bytes) => fn(bytes).padStart(hexLen, '0'),
  async create() {
    const instance = fn.create();
    return { update: (chunk) => instance.update(chunk), digest: () => instance.hex().padStart(hexLen, '0') };
  },
});

initHasherServer({
  'CRC-8 (1-Wire)': crc(crc_8_maxim_dow, 2),
  'CRC-8 (DVB-S2)': crc(crc_8_dvb_s2, 2),
  'CRC-8 (SMBus)': crc(crc_8_smbus, 2),
  'CRC-16': crc(crc16, 4),
  'CRC-16 (CCITT)': crc(crc_16_ibm_3740, 4),
  'CRC-16 (DNP)': crc(crc_16_dnp, 4),
  'CRC-16 (Kermit)': crc(crc_16_kermit, 4),
  'CRC-16 (Modbus)': crc(crc_16_modbus, 4),
  'CRC-16 (USB)': crc(crc_16_usb, 4),
  'CRC-16 (XMODEM)': crc(crc_16_xmodem, 4),
  'CRC-24 (BLE)': crc(crc_24_ble, 6),
  'CRC-24 (Intlkn)': crc(crc_24_interlaken, 6),
  'CRC-24 (OpenPGP)': crc(crc_24_openpgp, 6),
  'CRC-32': crc(crc32, 8),
  'CRC-32C': crc(crc_32c, 8),
  'CRC-32 (BZIP2)': crc(crc_32_bzip2, 8),
  'CRC-32 (JamCRC)': crc(crc_32_jamcrc, 8),
  'CRC-32 (MPEG-2)': crc(crc_32_mpeg_2, 8),
  'CRC-64 (ECMA)': crc(crc_64_ecma_182, 16),
  'CRC-64 (NVMe)': crc(crc_64_nvme, 16),
  'CRC-64 (Redis)': crc(crc_64_redis, 16),
  'CRC-64 (XZ)': crc(crc_64_xz, 16),
  'CRC-82 (DARC)': crc(crc_82_darc, 21),
});
