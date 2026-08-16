import { initApp } from '~core/app/init/app.js';
import { createHasherClient } from '~core/features/hashing/workers/hasher-client.js';
import { spawnWorker } from '~core/features/hashing/workers/spawn.js';

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

const Hasher = createHasherClient({
  spawn: () => spawnWorker(workerUrl),
  algorithms: ALGORITHMS,
});

initApp({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher });
