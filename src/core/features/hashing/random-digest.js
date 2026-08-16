/** A random digest as wide as `algo` (`{ bits, hexLen }`), in lowercase hex. A width that isn't a
 *  multiple of 4 (CRC-82) leaves the top digit with fewer than 4 bits, which are masked to fit. */
export function randomDigest({ bits = 0, hexLen }) {
  const bytes = new Uint8Array(Math.ceil(hexLen / 2));
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, hexLen);
  const topBits = (bits || hexLen * 4) - (hexLen - 1) * 4;
  if (topBits >= 4) return hex;
  return (Number.parseInt(hex[0], 16) & ((1 << topBits) - 1)).toString(16) + hex.slice(1);
}
