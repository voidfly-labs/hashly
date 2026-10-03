const read = (name, fallback) => document.querySelector(`meta[name="${name}"]`)?.content || fallback;

/** What the app calls a digest: "hash", or "checksum" for the CRC app (`sectionNoun` in its meta.js,
 *  written into the page's head). `plural` gives "hashes" / "checksums"; `capital` capitalises it. */
export function noun({ plural = false, capital = false } = {}) {
  const word = plural ? read('section-noun-plural', 'hashes') : read('section-noun', 'hash');
  return capital ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}
