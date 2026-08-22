// `cost` is the time a byte takes, relative to the others (measured in the worker, in tenths of a ms
// per MiB): it is how a file's algorithms are shared out over the threads. MD2 is plain
// JavaScript, the rest WebAssembly.
export const ALGORITHMS = [
  { id: 'MD2', bits: 128, hexLen: 32, cost: 1000 },
  { id: 'MD4', bits: 128, hexLen: 32, cost: 25 },
  { id: 'MD5', bits: 128, hexLen: 32, cost: 35 },
];
