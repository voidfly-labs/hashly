<p align="center">
  <img alt="Hashly logo" src="src/assets/images/logo.svg" width="140">
</p>

<h3 align="center">Hashly</h3>
<p align="center">
  Browser-based cryptographic hash calculators
</p>
<hr>

## Overview 

Hashly is a suite of six standalone hash-calculator apps. 

Each app focuses on a specific family of algorithms, with a clean UI and helpful features like history, permalinks, 
and file downloads.

| App        | Domain      | Algorithms                             |
|------------|-------------|----------------------------------------|
| `crckit/`  | crckit.com  | 23 CRC variants (CRC-8 through CRC-82) |
| `keccalc/` | keccalc.com | Keccak-224/256/384/512                 |
| `md5kit/`  | md5kit.com  | MD2, MD4, MD5                          |
| `ripemd/`  | ripemd.com  | RIPEMD-128/160/256/320                 |
| `sha3kit/` | sha3kit.com | SHA3-224/256/384/512                   |
| `shafile/` | shafile.com | SHA-1, SHA-224/256/384/512             |

Each app is a fully self-contained SPA. No server, no tracking, no data leaves the browser.

## Requirements

Node.js 18 or later.

## Getting started

```bash
npm install
```

Start a dev server for any app:

```bash
APP=shafile npm run dev   # → http://localhost:5173/src/apps/shafile/
APP=crckit npm run dev
# ... etc.
```

Build:

```bash
APP=shafile npm run build # → dist/shafile/
npm run build:all         # build all six apps → dist/
```

Lint and format:

```bash
npm run lint
npm run format
```

Pre-commit hooks (Husky + lint-staged) auto-fix JS and format CSS/HTML before each commit. 
Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/).

## Techonologies

- [Vite](https://vite.dev) — dev server and bundler
- [hash-wasm](https://github.com/Daninet/hash-wasm) — WASM-backed digest implementations (SHA-1, SHA-2, SHA-3, Keccak, MD4/MD5)
- [js-crc](https://github.com/emn178/js-crc) — CRC checksum implementations
- [crypto-api](https://github.com/nf404/crypto-api) — RIPEMD digest implementations
- [Geist](https://vercel.com/font) — variable font via `@fontsource-variable/geist`

## Feedback

Suggestions and ideas welcome. Please open [an issue](https://github.com/voidfly-labs/hashly/issues)
or submit a [pull request](https://github.com/voidfly-labs/hashly/pulls).

## License

Released under the [Apache License 2.0](LICENSE).
