<p align="center">
  <img alt="Hashly logo" src="assets/images/logo.svg" width="140">
</p>

<h3 align="center">Hashly</h3>
<p align="center">
  Browser-based cryptographic hash calculators — six tiny client-side apps
</p>
<hr>

| App        | Domain      | Algorithms                             |
|------------|-------------|----------------------------------------|
| `crckit/`  | crckit.com  | 23 CRC variants (CRC-8 through CRC-82) |
| `keccalc/` | keccalc.com | Keccak-224/256/384/512                 |
| `md5kit/`  | md5kit.com  | MD2, MD4, MD5                          |
| `ripemd/`  | ripemd.com  | RIPEMD-128/160/256/320                 |
| `sha3kit/` | sha3kit.com | SHA3-224/256/384/512                   |
| `shafile/` | shafile.com | SHA-1, SHA-224/256/384/512             |

## Running Locally

No build step required. Open any `index.html` directly in a browser, or serve locally:

```bash
python3 -m http.server 8080   # visit http://localhost:8080/crckit/
npx serve .                   # alternative
```

## Architecture

Each app is a single self-contained `index.html` with all CSS and JavaScript inlined. The six apps share the same internal module structure — only the algorithm registry and crypto library differ. Crypto libraries are loaded from jsDelivr.

Adding or removing an algorithm means editing only the top-level `ALGORITHMS` array in the relevant `index.html`.

## License

[Apache 2.0](LICENSE)
