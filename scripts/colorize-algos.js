#!/usr/bin/env node
// Generates CSS custom-property blocks (--badge-<algo>-bg/-text) for every
// app's algorithm badges, driven by one hue per algorithm. Output is meant to
// be pasted into each app's app.css.
// Run: node scripts/colorize-algos.js

// Saturation/lightness applied to every hue — the only knobs that control how
// "loud" vs. muted the palette reads. Hue is the only thing that varies below.
const PALETTE = {
  light: { bg: { s: 64, l: 94 }, text: { s: 84, l: 21 } },
  dark: { bg: { s: 95, l: 58, alpha: 0.14 }, text: { s: 87, l: 72 } },
};

// Named hues shared by the single-family apps below, ordered smallest → widest
// digest. Most families only need a subset (e.g. rose/green/blue/violet);
// amber and cyan fill in for families with extra variants to place.
const HUE = { rose: 320, amber: 35, green: 150, cyan: 190, blue: 220, violet: 270 };
const ROSE_GREEN_BLUE_VIOLET = [HUE.rose, HUE.green, HUE.blue, HUE.violet];

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const hh = ((h % 360) + 360) % 360;
  const sextant = Math.floor(hh / 60);
  const rgbBySextant = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  return rgbBySextant[sextant].map((v) => Math.round((v + m) * 255));
}

function hslToHex(h, s, l) {
  return (
    '#' +
    hslToRgb(h, s, l)
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

function hslToRgba(h, s, l, alpha) {
  return `rgba(${hslToRgb(h, s, l).join(', ')}, ${alpha})`;
}

// One hue in, all four badge colors out.
function badge(hue) {
  const { light, dark } = PALETTE;
  return {
    bg: hslToHex(hue, light.bg.s, light.bg.l),
    text: hslToHex(hue, light.text.s, light.text.l),
    darkBg: hslToRgba(hue, dark.bg.s, dark.bg.l, dark.bg.alpha),
    darkText: hslToHex(hue, dark.text.s, dark.text.l),
  };
}

// Assigns each name in `names` an evenly spaced hue around the full wheel,
// starting at `offset`. Wrap-safe: the gap from the last hue back to the
// first equals every other gap, so the sequence reads as a continuous rainbow.
function wheelEntries(offset, names) {
  const step = 360 / names.length;
  return names.map((name, i) => [name, offset + step * i]);
}

// Pairs each name in `names` with the hue at the same index in `hues`, for
// families with a hand-picked (non-evenly-spaced) rainbow assignment.
function hueEntries(names, hues) {
  return names.map((name, i) => [name, hues[i]]);
}

function printBlock(title, entries) {
  const badges = entries.map(([name, hue]) => [name, badge(hue)]);
  console.log(`\n/* ── ${title} ── */`);
  console.log(':root {');
  for (const [name, { bg, text }] of badges) {
    console.log(`  --badge-${name}-bg: ${bg};`);
    console.log(`  --badge-${name}-text: ${text};`);
  }
  console.log('}');
  console.log("[data-theme='dark'] {");
  for (const [name, { darkBg, darkText }] of badges) {
    console.log(`  --badge-${name}-bg: ${darkBg};`);
    console.log(`  --badge-${name}-text: ${darkText};`);
  }
  console.log('}');
}

// ── hashly (30 algos, full wheel from 10°, step 12°) ─────────────────────────
printBlock(
  'hashly',
  wheelEntries(10, [
    'md2',
    'md4',
    'md5',
    'sha1',
    'sha224',
    'sha256',
    'sha384',
    'sha512',
    'sha3224',
    'sha3256',
    'sha3384',
    'sha3512',
    'blake2b256',
    'blake2b512',
    'blake2s128',
    'blake2s256',
    'blake3256',
    'blake3512',
    'keccak224',
    'keccak256',
    'keccak384',
    'keccak512',
    'ripemd128',
    'ripemd160',
    'ripemd256',
    'ripemd320',
    'xxh32',
    'xxh64',
    'xxh3',
    'xxh128',
  ]),
);

// ── crc (23 algos, full wheel from 10°, step 15.65°) ─────────────────────────
printBlock(
  'crc',
  wheelEntries(10, [
    'crc81wire',
    'crc8dvbs2',
    'crc8smbus',
    'crc16',
    'crc16ccitt',
    'crc16dnp',
    'crc16kermit',
    'crc16modbus',
    'crc16usb',
    'crc16xmodem',
    'crc24ble',
    'crc24intlkn',
    'crc24openpgp',
    'crc32',
    'crc32c',
    'crc32bzip2',
    'crc32jamcrc',
    'crc32mpeg2',
    'crc64ecma',
    'crc64nvme',
    'crc64redis',
    'crc64xz',
    'crc82darc',
  ]),
);

// ── single-family apps (hand-picked rainbow hues) ────────────────────────────
printBlock('md5', hueEntries(['md2', 'md4', 'md5'], ROSE_GREEN_BLUE_VIOLET));
printBlock(
  'sha2',
  hueEntries(['sha1', 'sha224', 'sha256', 'sha384', 'sha512'], [HUE.rose, HUE.amber, HUE.green, HUE.blue, HUE.violet]),
);
printBlock('sha3', hueEntries(['sha3224', 'sha3256', 'sha3384', 'sha3512'], ROSE_GREEN_BLUE_VIOLET));
printBlock(
  'blake',
  hueEntries(
    ['blake2b256', 'blake2b512', 'blake2s128', 'blake2s256', 'blake3256', 'blake3512'],
    [HUE.rose, HUE.amber, HUE.green, HUE.cyan, HUE.blue, HUE.violet],
  ),
);
printBlock('keccak', hueEntries(['keccak224', 'keccak256', 'keccak384', 'keccak512'], ROSE_GREEN_BLUE_VIOLET));
printBlock('ripemd', hueEntries(['ripemd128', 'ripemd160', 'ripemd256', 'ripemd320'], ROSE_GREEN_BLUE_VIOLET));
printBlock('xxhash', hueEntries(['xxhash32', 'xxhash64', 'xxhash3', 'xxhash128'], ROSE_GREEN_BLUE_VIOLET));
