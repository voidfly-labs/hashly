'use strict';

const APPS = ['crckit', 'md5kit', 'sha3kit', 'keccalc', 'shafile', 'ripemd'];

// Vendor JS per app. Each entry: CDN source URL → versioned local filename.
const VENDOR_SCRIPTS = {
  crckit: [
    { url: 'https://cdn.jsdelivr.net/npm/js-crc@0.3.1/build/crc.min.js',    name: 'js-crc-0.3.1.min.js' },
    { url: 'https://cdn.jsdelivr.net/npm/js-crc@0.3.1/build/models.min.js', name: 'js-crc-models-0.3.1.min.js' },
  ],
  md5kit: [
    { url: 'https://cdn.jsdelivr.net/npm/hash-wasm@4.12.0/dist/md4.umd.min.js', name: 'hash-wasm-4.12.0-md4.umd.min.js' },
    { url: 'https://cdn.jsdelivr.net/npm/hash-wasm@4.12.0/dist/md5.umd.min.js', name: 'hash-wasm-4.12.0-md5.umd.min.js' },
  ],
  sha3kit: [
    { url: 'https://cdn.jsdelivr.net/npm/hash-wasm@4.12.0/dist/sha3.umd.min.js', name: 'hash-wasm-4.12.0-sha3.umd.min.js' },
  ],
  keccalc: [
    { url: 'https://cdn.jsdelivr.net/npm/hash-wasm@4.12.0/dist/keccak.umd.min.js', name: 'hash-wasm-4.12.0-keccak.umd.min.js' },
  ],
  shafile: [
    { url: 'https://cdn.jsdelivr.net/npm/hash-wasm@4.12.0/dist/sha1.umd.min.js',   name: 'hash-wasm-4.12.0-sha1.umd.min.js' },
    { url: 'https://cdn.jsdelivr.net/npm/hash-wasm@4.12.0/dist/sha224.umd.min.js', name: 'hash-wasm-4.12.0-sha224.umd.min.js' },
    { url: 'https://cdn.jsdelivr.net/npm/hash-wasm@4.12.0/dist/sha256.umd.min.js', name: 'hash-wasm-4.12.0-sha256.umd.min.js' },
    { url: 'https://cdn.jsdelivr.net/npm/hash-wasm@4.12.0/dist/sha384.umd.min.js', name: 'hash-wasm-4.12.0-sha384.umd.min.js' },
    { url: 'https://cdn.jsdelivr.net/npm/hash-wasm@4.12.0/dist/sha512.umd.min.js', name: 'hash-wasm-4.12.0-sha512.umd.min.js' },
  ],
  ripemd: [
    { url: 'https://github.com/nf404/crypto-api/releases/download/0.8.5/crypto-api.min.js', name: 'crypto-api-0.8.5.min.js' },
  ],
};

// App-specific local scripts that live under assets/js/ and are not shared.
const LOCAL_SCRIPTS = {
  md5kit: ['assets/js/md2.js'],
};

// Shared fonts via @fontsource packages on jsDelivr.
// URL template: cdn.jsdelivr.net/npm/@fontsource/<pkg>@<version>/files/<prefix>-latin-<weight>-normal.woff2
const FONTS = {
  version: '5.1.1',
  weights: [400, 500, 600, 700],
  families: [
    { pkg: 'geist',      prefix: 'geist',      cssName: 'Geist' },
    { pkg: 'geist-mono', prefix: 'geist-mono', cssName: 'Geist Mono' },
  ],
};

module.exports = { APPS, VENDOR_SCRIPTS, LOCAL_SCRIPTS, FONTS };
