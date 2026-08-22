// `cost` is the time a byte takes, relative to the others (tenths of a ms per MiB, as measured in
// Node): it is how a file's algorithms are shared out over the threads. CRC-32, CRC-32C and
// CRC-64/XZ run on WebAssembly; the rest are js-crc, several times slower, and the wider the slower.
export const ALGORITHMS = [
  // CRC-8 — ordered alphabetically within the group
  { id: 'CRC-8 (1-Wire)', bits: 8, hexLen: 2, cost: 40 },
  { id: 'CRC-8 (DVB-S2)', bits: 8, hexLen: 2, cost: 40 },
  { id: 'CRC-8 (SMBus)', bits: 8, hexLen: 2, cost: 40 },
  // CRC-16 — ordered alphabetically within the group
  { id: 'CRC-16', bits: 16, hexLen: 4, cost: 40 },
  { id: 'CRC-16 (CCITT)', bits: 16, hexLen: 4, cost: 40 },
  { id: 'CRC-16 (DNP)', bits: 16, hexLen: 4, cost: 40 },
  { id: 'CRC-16 (Kermit)', bits: 16, hexLen: 4, cost: 40 },
  { id: 'CRC-16 (Modbus)', bits: 16, hexLen: 4, cost: 40 },
  { id: 'CRC-16 (USB)', bits: 16, hexLen: 4, cost: 40 },
  { id: 'CRC-16 (XMODEM)', bits: 16, hexLen: 4, cost: 40 },
  // CRC-24 — ordered alphabetically within the group
  { id: 'CRC-24 (BLE)', bits: 24, hexLen: 6, cost: 50 },
  { id: 'CRC-24 (Intlkn)', bits: 24, hexLen: 6, cost: 50 },
  { id: 'CRC-24 (OpenPGP)', bits: 24, hexLen: 6, cost: 50 },
  // CRC-32 — CRC-32C pinned directly after CRC-32; remainder alphabetical
  { id: 'CRC-32', bits: 32, hexLen: 8, cost: 10 },
  { id: 'CRC-32C', bits: 32, hexLen: 8, cost: 10 },
  { id: 'CRC-32 (BZIP2)', bits: 32, hexLen: 8, cost: 40 },
  { id: 'CRC-32 (JamCRC)', bits: 32, hexLen: 8, cost: 40 },
  { id: 'CRC-32 (MPEG-2)', bits: 32, hexLen: 8, cost: 40 },
  // CRC-64 — ordered alphabetically within the group
  { id: 'CRC-64 (ECMA)', bits: 64, hexLen: 16, cost: 100 },
  { id: 'CRC-64 (NVMe)', bits: 64, hexLen: 16, cost: 110 },
  { id: 'CRC-64 (Redis)', bits: 64, hexLen: 16, cost: 100 },
  { id: 'CRC-64 (XZ)', bits: 64, hexLen: 16, cost: 10 },
  // CRC-82
  { id: 'CRC-82 (DARC)', bits: 82, hexLen: 21, cost: 140 },
];
