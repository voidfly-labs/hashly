import { Format } from '@core/utils/format.js';
import { initApp } from '@core/init/app.js';
import {
  crc16,
  crc32,
  crc_8_maxim_dow,
  crc_8_dvb_s2,
  crc_8_smbus,
  crc_16_ibm_3740,
  crc_16_dnp,
  crc_16_kermit,
  crc_16_modbus,
  crc_16_usb,
  crc_16_xmodem,
  crc_24_ble,
  crc_24_interlaken,
  crc_24_openpgp,
  crc_32c,
  crc_32_bzip2,
  crc_32_jamcrc,
  crc_32_mpeg_2,
  crc_64_ecma_182,
  crc_64_nvme,
  crc_64_redis,
  crc_64_xz,
  crc_82_darc,
} from './algos/crc-fns.js';

const APP_CONFIG = {
  appName: 'crckit',
  fileNoun: 'checksum',
  slugify: (algo) => algo.toLowerCase().replace(/[^a-z0-9]/g, ''),
  defaultDisabledAlgos: [],
};

const ALGORITHMS = [
  // CRC-8 — ordered alphabetically within the group
  { id: 'CRC-8 (1-Wire)', fn: crc_8_maxim_dow, bits: 8, hexLen: 2 },
  { id: 'CRC-8 (DVB-S2)', fn: crc_8_dvb_s2, bits: 8, hexLen: 2 },
  { id: 'CRC-8 (SMBus)', fn: crc_8_smbus, bits: 8, hexLen: 2 },
  // CRC-16 — ordered alphabetically within the group
  { id: 'CRC-16', fn: crc16, bits: 16, hexLen: 4 },
  { id: 'CRC-16 (CCITT)', fn: crc_16_ibm_3740, bits: 16, hexLen: 4 },
  { id: 'CRC-16 (DNP)', fn: crc_16_dnp, bits: 16, hexLen: 4 },
  { id: 'CRC-16 (Kermit)', fn: crc_16_kermit, bits: 16, hexLen: 4 },
  { id: 'CRC-16 (Modbus)', fn: crc_16_modbus, bits: 16, hexLen: 4 },
  { id: 'CRC-16 (USB)', fn: crc_16_usb, bits: 16, hexLen: 4 },
  { id: 'CRC-16 (XMODEM)', fn: crc_16_xmodem, bits: 16, hexLen: 4 },
  // CRC-24 — ordered alphabetically within the group
  { id: 'CRC-24 (BLE)', fn: crc_24_ble, bits: 24, hexLen: 6 },
  { id: 'CRC-24 (Intlkn)', fn: crc_24_interlaken, bits: 24, hexLen: 6 },
  { id: 'CRC-24 (OpenPGP)', fn: crc_24_openpgp, bits: 24, hexLen: 6 },
  // CRC-32 — CRC-32C pinned directly after CRC-32; remainder alphabetical
  { id: 'CRC-32', fn: crc32, bits: 32, hexLen: 8 },
  { id: 'CRC-32C', fn: crc_32c, bits: 32, hexLen: 8 },
  { id: 'CRC-32 (BZIP2)', fn: crc_32_bzip2, bits: 32, hexLen: 8 },
  { id: 'CRC-32 (JamCRC)', fn: crc_32_jamcrc, bits: 32, hexLen: 8 },
  { id: 'CRC-32 (MPEG-2)', fn: crc_32_mpeg_2, bits: 32, hexLen: 8 },
  // CRC-64 — ordered alphabetically within the group
  { id: 'CRC-64 (ECMA)', fn: crc_64_ecma_182, bits: 64, hexLen: 16 },
  { id: 'CRC-64 (NVMe)', fn: crc_64_nvme, bits: 64, hexLen: 16 },
  { id: 'CRC-64 (Redis)', fn: crc_64_redis, bits: 64, hexLen: 16 },
  { id: 'CRC-64 (XZ)', fn: crc_64_xz, bits: 64, hexLen: 16 },
  // CRC-82
  { id: 'CRC-82 (DARC)', fn: crc_82_darc, bits: 82, hexLen: 21 },
];

const DEFAULT_ALGO = 'CRC-32';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

const Hasher = {
  fromTextAll(text, inputFmt = 'utf-8', algos = ALGORITHMS) {
    const data = Format.textToBytes(text, inputFmt);
    return new Map(algos.map(({ id, fn, hexLen }) => [id, fn(data).padStart(hexLen, '0')]));
  },

  async fromFileAll(file, onProgress, algos = ALGORITHMS) {
    const totalSize = file.size;
    const CHUNK_SIZE = Math.min(32 * 1024 * 1024, Math.max(150 * 1024, Math.floor(totalSize / 100)));

    const instances = algos.map(({ id, fn, hexLen }) => ({ id, hexLen, instance: fn.create() }));

    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

    let offset = 0;
    let lastPaint = performance.now();
    while (offset < totalSize) {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();

      for (const { instance } of instances) instance.update(buffer);

      offset += buffer.byteLength;
      onProgress?.(Math.min(offset / totalSize, 1));

      const now = performance.now();
      if (offset < totalSize && now - lastPaint >= 100) {
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
        lastPaint = performance.now();
      }
    }

    return new Map(instances.map(({ id, hexLen, instance }) => [id, instance.hex().padStart(hexLen, '0')]));
  },

  generateRandom(algoId) {
    const algo = ALGORITHMS.find((a) => a.id === algoId);
    const hexLen = algo?.hexLen ?? 8;
    const byteLen = Math.ceil(hexLen / 2);
    const bytes = new Uint8Array(byteLen);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, hexLen);
  },
};

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher });
