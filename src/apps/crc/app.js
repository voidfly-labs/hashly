import { initApp } from '~core/init/app.js';
import { createHasherClient } from '~core/workers/hasher-client.js';
import { spawnWorker } from '~core/workers/spawn.js';

import workerUrl from './worker.js?worker&url';

const APP_CONFIG = {
  appName: 'crckit',
  fileNoun: 'checksum',
  slugify: (algo) => algo.toLowerCase().replace(/[^a-z0-9]/g, ''),
  defaultHiddenAlgos: [],
};

const ALGORITHMS = [
  // CRC-8 — ordered alphabetically within the group
  { id: 'CRC-8 (1-Wire)', bits: 8, hexLen: 2 },
  { id: 'CRC-8 (DVB-S2)', bits: 8, hexLen: 2 },
  { id: 'CRC-8 (SMBus)', bits: 8, hexLen: 2 },
  // CRC-16 — ordered alphabetically within the group
  { id: 'CRC-16', bits: 16, hexLen: 4 },
  { id: 'CRC-16 (CCITT)', bits: 16, hexLen: 4 },
  { id: 'CRC-16 (DNP)', bits: 16, hexLen: 4 },
  { id: 'CRC-16 (Kermit)', bits: 16, hexLen: 4 },
  { id: 'CRC-16 (Modbus)', bits: 16, hexLen: 4 },
  { id: 'CRC-16 (USB)', bits: 16, hexLen: 4 },
  { id: 'CRC-16 (XMODEM)', bits: 16, hexLen: 4 },
  // CRC-24 — ordered alphabetically within the group
  { id: 'CRC-24 (BLE)', bits: 24, hexLen: 6 },
  { id: 'CRC-24 (Intlkn)', bits: 24, hexLen: 6 },
  { id: 'CRC-24 (OpenPGP)', bits: 24, hexLen: 6 },
  // CRC-32 — CRC-32C pinned directly after CRC-32; remainder alphabetical
  { id: 'CRC-32', bits: 32, hexLen: 8 },
  { id: 'CRC-32C', bits: 32, hexLen: 8 },
  { id: 'CRC-32 (BZIP2)', bits: 32, hexLen: 8 },
  { id: 'CRC-32 (JamCRC)', bits: 32, hexLen: 8 },
  { id: 'CRC-32 (MPEG-2)', bits: 32, hexLen: 8 },
  // CRC-64 — ordered alphabetically within the group
  { id: 'CRC-64 (ECMA)', bits: 64, hexLen: 16 },
  { id: 'CRC-64 (NVMe)', bits: 64, hexLen: 16 },
  { id: 'CRC-64 (Redis)', bits: 64, hexLen: 16 },
  { id: 'CRC-64 (XZ)', bits: 64, hexLen: 16 },
  // CRC-82
  { id: 'CRC-82 (DARC)', bits: 82, hexLen: 21 },
];

const DEFAULT_ALGO = 'CRC-32';
const ALGO_ORDER = new Map(ALGORITHMS.map(({ id }, i) => [id, i]));

const Hasher = {
  ...createHasherClient({
    spawn: () => spawnWorker(workerUrl),
    algorithms: ALGORITHMS,
  }),

  generateRandom(algoId) {
    const algo = ALGORITHMS.find((a) => a.id === algoId);
    const hexLen = algo?.hexLen ?? 8;
    const byteLen = Math.ceil(hexLen / 2);
    const bytes = new Uint8Array(byteLen);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, hexLen);
    // A width that isn't a multiple of 4 (CRC-82) leaves the top digit with fewer than 4 bits.
    const topBits = algo ? algo.bits - (hexLen - 1) * 4 : 4;
    if (topBits >= 4) return hex;
    return (Number.parseInt(hex[0], 16) & ((1 << topBits) - 1)).toString(16) + hex.slice(1);
  },
};

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, ALGO_ORDER, Hasher });
