const _encoder = new TextEncoder();

export const Format = {
  base64ToBytes(b64) {
    // Normalise padding so partially-typed input never throws.
    // Strip existing padding, re-pad to the next multiple of 4.
    // A try/catch covers the length % 4 === 1 residue, which is
    // structurally invalid and cannot be salvaged by padding alone.
    // eslint-disable-next-line sonarjs/slow-regex
    const stripped = b64.replace(/=+$/, '');
    const padded = stripped + '==='.slice((stripped.length + 3) % 4);
    try {
      const bin = atob(padded);
      return new Uint8Array(bin.length).map((_, i) => bin.charCodeAt(i));
    } catch {
      return new Uint8Array(0);
    }
  },

  hexToBytes(hex) {
    const clean = hex.replace(/\s+/g, '');
    const arr = new Uint8Array(clean.length / 2);
    for (let i = 0; i < arr.length; i++) arr[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    return arr;
  },

  binaryToBytes(bin) {
    // Accept groups of 8 bits, optionally space-separated
    const groups = bin.trim().split(/\s+/);
    return new Uint8Array(groups.map((g) => Number.parseInt(g, 2)));
  },

  /** Convert user text to bytes according to the selected input format. */
  textToBytes(text, inputFmt) {
    switch (inputFmt) {
      case 'hex':
        return this.hexToBytes(text);
      case 'base64':
        return this.base64ToBytes(text);
      case 'binary':
        return this.binaryToBytes(text);
      default:
        return _encoder.encode(text); // utf-8
    }
  },

  hexToBase64(hex) {
    const h = hex.length % 2 === 0 ? hex : hex.padStart(hex.length + 1, '0');
    return btoa(String.fromCharCode(...h.match(/.{2}/g).map((b) => Number.parseInt(b, 16))));
  },

  hexToBinary(hex) {
    const h = hex.length % 2 === 0 ? hex : hex.padStart(hex.length + 1, '0');
    return h
      .match(/.{2}/g)
      .map((b) => Number.parseInt(b, 16).toString(2).padStart(8, '0'))
      .join(' ');
  },

  utf8ByteLength(text) {
    return _encoder.encode(text).byteLength;
  },

  applyFormat(hex, format) {
    switch (format) {
      case 'hex-upper':
        return hex.toUpperCase();
      case 'base64':
        return this.hexToBase64(hex);
      case 'binary':
        return this.hexToBinary(hex);
      default:
        return hex;
    }
  },
};
