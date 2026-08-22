// `cost` is the time a byte takes, relative to the others (see hashly/app.js): RIPEMD-160 is
// WebAssembly, the others plain JavaScript.
export const ALGORITHMS = [
  { id: 'RIPEMD-128', bits: 128, hexLen: 32, cost: 500 },
  { id: 'RIPEMD-160', bits: 160, hexLen: 40, cost: 40 },
  { id: 'RIPEMD-256', bits: 256, hexLen: 64, cost: 500 },
  { id: 'RIPEMD-320', bits: 320, hexLen: 80, cost: 500 },
];
