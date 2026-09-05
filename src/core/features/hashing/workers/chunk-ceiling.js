const MIB = 1024 * 1024;

// How big a chunk may get when the visitor has not chosen. Quick algorithms (xxHash, CRC) gain
// 15-40% from 16 MiB over 4 (the per-chunk cost of a read and a message is then spread thinner;
// measured, a bigger one gains little more) at some 60 MB of memory per thread. A phone or a
// small-memory device gets the smaller one.
const AUTO_MIB = 16;
const AUTO_LOW_END_MIB = 4;

const lowEnd = () =>
  (navigator.deviceMemory ?? Infinity) <= 4 || Boolean(globalThis.matchMedia?.('(pointer: coarse)').matches);

/** The ceiling, in bytes, for the chunks of one file: the `chosenMiB` of the settings, or, for 0 (Auto),
 *  what suits the device. Decided on the page, as a worker can't tell a phone from a desktop. */
export const chunkCeiling = (chosenMiB) => (chosenMiB || (lowEnd() ? AUTO_LOW_END_MIB : AUTO_MIB)) * MIB;
