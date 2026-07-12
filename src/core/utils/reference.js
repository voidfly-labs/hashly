import { Format } from './format.js';

const HEX_RE = /^(?:0x)?[\da-f]+$/i;
const BASE64_RE = /^[\w+/-]+={0,2}$/;

/** Pulls the hash out of whatever the user pasted: bare hex/Base64, grouped hex
 *  ("de ad be ef", "de:ad:be:ef"), or a checksum-file line ("<hash>  name.iso").
 *  Only hex is accepted when more than one word is present: checksum files are
 *  always hex, and arbitrary words would otherwise read as Base64. */
function _extractToken(raw) {
  const tokens = raw.trim().split(/\s+/);
  if (tokens.length === 1) return { token: tokens[0].replaceAll(':', ''), hexOnly: false };
  if (tokens.every((t) => HEX_RE.test(t))) return { token: tokens.join(''), hexOnly: true };
  return { token: tokens[0].replaceAll(':', ''), hexOnly: true };
}

function _bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Normalises a user-supplied reference hash to lowercase hex, or null if it
 *  is neither hex nor Base64. Hex wins when the token is valid as both: a real
 *  Base64 digest made only of [0-9a-f] is vanishingly unlikely, whereas a hex
 *  digest is always valid Base64 — reading it as Base64 would mis-size it. */
export function parseReference(raw) {
  if (!raw.trim()) return null;
  const { token, hexOnly } = _extractToken(raw);

  if (HEX_RE.test(token)) return { hex: token.replace(/^0x/i, '').toLowerCase() };

  if (!hexOnly && BASE64_RE.test(token)) {
    // Accept the URL-safe alphabet too.
    const bytes = Format.base64ToBytes(token.replaceAll('-', '+').replaceAll('_', '/'));
    if (bytes.length) return { hex: _bytesToHex(bytes) };
  }
  return null;
}
