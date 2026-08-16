const _encoder = new TextEncoder();
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

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

  /** Base64 text without a final character that can't be part of any byte: a length of
   *  1 mod 4 (after the padding) is structurally invalid, so what would otherwise decode to
   *  nothing keeps its valid prefix. */
  withoutDanglingBase64(b64) {
    let end = b64.length;
    while (end > 0 && b64[end - 1] === '=') end--;
    return end % 4 === 1 ? b64.slice(0, end - 1) : b64;
  },

  hexToBytes(hex) {
    // Whole bytes only: a trailing odd digit is half a byte, so it is left out (the input
    // notes point it out, see utils/text-notes.js).
    const clean = hex.replace(/\s+/g, '');
    const arr = new Uint8Array(clean.length >> 1);
    for (let i = 0; i < arr.length; i++) arr[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    return arr;
  },

  binaryToBytes(bin) {
    // Whitespace-separated groups of bits, each read as one byte; a group longer than 8
    // bits is cut into bytes from its left ("0110000101100010" is two bytes, with or
    // without a space). A shorter group (the last one, while typing) is read as its value.
    const bytes = [];
    for (const group of bin.split(/\s+/)) {
      for (let i = 0; i < group.length; i += 8) bytes.push(Number.parseInt(group.slice(i, i + 8), 2));
    }
    return new Uint8Array(bytes);
  },

  /** Convert user text to bytes according to the selected input format. */
  textToBytes(text, inputFmt) {
    switch (inputFmt) {
      case 'hex':
        return this.hexToBytes(text);
      case 'base64':
        return this.base64ToBytes(this.withoutDanglingBase64(text));
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

  /** "12 B", "3.4 KiB", "1.50 MiB", "2.00 GiB". */
  fileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
  },

  /** Makes a value safe to interpolate into markup, in text or in a quoted attribute. For values
   *  this code didn't produce: file names, anything read back from storage. */
  escapeHtml(value) {
    return String(value ?? '').replaceAll(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
  },

  /** "CRC-32 (MPEG-2)" → "crc-32-mpeg-2". Distinct algorithm ids must stay distinct as slugs. */
  slug(id) {
    return id
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-|-$/g, '');
  },
};
