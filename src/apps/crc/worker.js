import { crc32 as crc32Wasm, crc64 as crc64Wasm, createCRC32, createCRC64 } from 'hash-wasm';

import { wasmEngine } from '~core/features/hashing/workers/engines/wasm.js';
import { initHasherServer } from '~core/features/hashing/workers/hasher-server.js';
import { hasWasmSupport } from '~core/lib/wasm.js';

import {
  crc_8_dvb_s2,
  crc_8_maxim_dow,
  crc_8_smbus,
  crc_16_arc,
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
  crc_32_iscsi,
  crc_32_iso_hdlc,
  crc_32_jamcrc,
  crc_32_mpeg_2,
  crc_64_ecma_182,
  crc_64_nvme,
  crc_64_redis,
  crc_64_xz,
  crc_82_darc,
} from './algos/crc-models.js';

// A CRC's digest comes zero-padded to its width (see algos/crc-engine.js).
const crc = (fn) => ({
  once: (bytes) => fn(bytes),
  async create() {
    const instance = fn.create();
    return { update: (chunk) => instance.update(chunk), digest: () => instance.hex() };
  },
});

const CRC32C_POLY = 0x82f63b78; // Castagnoli, reflected

// Where WebAssembly is not available, the three that use it run on algos/crc-engine.js too.
const wasmOr = (wasm, model) => (hasWasmSupport() ? wasm : crc(model));

// CRC-32, CRC-32C and CRC-64/XZ run on hash-wasm (it only varies the polynomial); the rest need
// init/xorout/reflection it does not offer, so they run on algos/crc-engine.js.
initHasherServer({
  'CRC-8 (1-Wire)': crc(crc_8_maxim_dow),
  'CRC-8 (DVB-S2)': crc(crc_8_dvb_s2),
  'CRC-8 (SMBus)': crc(crc_8_smbus),
  'CRC-16': crc(crc_16_arc),
  'CRC-16 (CCITT)': crc(crc_16_ibm_3740),
  'CRC-16 (DNP)': crc(crc_16_dnp),
  'CRC-16 (Kermit)': crc(crc_16_kermit),
  'CRC-16 (Modbus)': crc(crc_16_modbus),
  'CRC-16 (USB)': crc(crc_16_usb),
  'CRC-16 (XMODEM)': crc(crc_16_xmodem),
  'CRC-24 (BLE)': crc(crc_24_ble),
  'CRC-24 (Intlkn)': crc(crc_24_interlaken),
  'CRC-24 (OpenPGP)': crc(crc_24_openpgp),
  'CRC-32': wasmOr(wasmEngine({ fn: (bytes) => crc32Wasm(bytes), createFn: () => createCRC32() }), crc_32_iso_hdlc),
  'CRC-32C': wasmOr(
    wasmEngine({ fn: (bytes) => crc32Wasm(bytes, CRC32C_POLY), createFn: () => createCRC32(CRC32C_POLY) }),
    crc_32_iscsi,
  ),
  'CRC-32 (BZIP2)': crc(crc_32_bzip2),
  'CRC-32 (JamCRC)': crc(crc_32_jamcrc),
  'CRC-32 (MPEG-2)': crc(crc_32_mpeg_2),
  'CRC-64 (ECMA)': crc(crc_64_ecma_182),
  'CRC-64 (NVMe)': crc(crc_64_nvme),
  'CRC-64 (Redis)': crc(crc_64_redis),
  'CRC-64 (XZ)': wasmOr(wasmEngine({ fn: (bytes) => crc64Wasm(bytes), createFn: () => createCRC64() }), crc_64_xz),
  'CRC-82 (DARC)': crc(crc_82_darc),
});
