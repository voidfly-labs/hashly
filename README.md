<p align="center">
  <img alt="Hashly logo" src="src/assets/images/logo.svg" width="140">
</p>

<h3 align="center">Hashly</h3>
<p align="center">
  Browser-based cryptographic hash calculators
</p>
<hr>

## Overview

Hashly is a suite of nine standalone hash-calculator apps.

Each app focuses on a specific family of algorithms, with a clean UI and helpful features like
history, permalinks, and file downloads.

| App         | Domain     | Algorithms                             |
|-------------|------------|----------------------------------------|
| `blakekit`  | blake3.app | BLAKE2b, BLAKE2s, BLAKE3               |
| `crckit`    | crc32.app  | 23 CRC variants (CRC-8 through CRC-82) |
| `hashly`    | hashly.org | All 30 non-CRC algorithms (aggregator) |
| `keccakkit` | keccak.app | Keccak-224/256/384/512                 |
| `md5kit`    | md5kit.com | MD2, MD4, MD5                          |
| `ripemdkit` | ripemd.com | RIPEMD-128/160/256/320                 |
| `sha2kit`   | sha256.app | SHA-1, SHA-224/256/384/512             |
| `sha3kit`   | sha3.app   | SHA3-224/256/384/512                   |
| `xxhashkit` | xxhash.dev | XXH3/32/64/128                         |

Each app is a fully self-contained SPA. No server, no tracking, no data leaves the browser.

## Philosophy

_"The best tool for the job is often the simplest one."_

Hashly uses no frameworks, component libraries, or CDN dependencies.
Vendor libraries are used for hash calculation only, as WASM-backed implementations
offer significant performance gains over pure JS. Graphics are all SVG-based, keeping the bundle
lightweight. The target budget is 150–250 kB per app, fully loaded.

## Requirements

Node.js 18+ to build; any modern browser to use.

## Getting started

```bash
npm install
```

### Run the dev server

```bash
APP=md5kit npm run dev   # → http://localhost:5173/src/apps/md5kit/
APP=crckit npm run dev
# ...
```

### Build packages

```bash
APP=md5kit npm run build   # → dist/md5kit/
npm run build:all           # build all nine apps → dist/
```

### Lint and format

```bash
npm run lint
npm run format
```

Pre-commit hooks (Husky + lint-staged) auto-fix JS and format CSS/HTML before each commit.
Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/).

## Technologies

- [crypto-api](https://github.com/nf404/crypto-api) – RIPEMD digest implementations
- [hash-wasm](https://github.com/Daninet/hash-wasm) – WASM-backed digest implementations
  (MD4/5, SHA-1/2/3, BLAKE2/3, Keccak, XXH)
- [js-crc](https://github.com/emn178/js-crc) – CRC checksum implementations
- [Geist](https://vercel.com/font) – main font, all text in the apps
- [Vite](https://vite.dev) – dev server and bundler

## Feedback

Suggestions and ideas welcome. Please open [an issue](https://github.com/voidfly-labs/hashly/issues)
or submit a [pull request](https://github.com/voidfly-labs/hashly/pulls).

## License

Released under the [Apache License 2.0](LICENSE).
