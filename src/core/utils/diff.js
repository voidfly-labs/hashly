// Showing where a digest differs from a reference hash.
//
// A digest that differs in only a few characters is almost certainly a typo or a
// damaged copy, so marking those characters helps. Beyond a small share of the
// digest it is simply a different hash, and marking nearly every character would
// just be noise.
//
//   diffHex      pure: compares two hex digests into runs of same/different characters
//   setHashDiff  DOM: marks those characters in a result row's shown hash
//
// The marks are styled by `.result__diff` (components/verify.css).

const MAX_DIFF_RATIO = 0.15;
// Floor for short digests (e.g. 8-character CRC-32), where 15% rounds down to one.
const MIN_DIFF_ALLOWED = 2;

/** Compares two equal-length hex digests. Returns `{ hex, runs }` where `runs` is
 *  `[{ length, differs }]` covering the whole digest, or null when they are
 *  identical, differ in length, or differ too much to be worth marking.
 *  `hex` is the digest (lowercase) the runs were computed against. */
export function diffHex(reference, digest) {
  const a = reference.toLowerCase();
  const b = digest.toLowerCase();
  if (a.length !== b.length || a === b) return null;

  const runs = [];
  let differing = 0;
  for (let i = 0; i < a.length; i++) {
    const differs = a[i] !== b[i];
    if (differs) differing++;
    const last = runs.at(-1);
    if (last?.differs === differs) last.length++;
    else runs.push({ length: 1, differs });
  }

  const allowed = Math.max(MIN_DIFF_ALLOWED, Math.floor(a.length * MAX_DIFF_RATIO));
  return differing > allowed ? null : { hex: b, runs };
}

/** Marks the characters of a result's shown hash (`hashEl`, a `.result__hash`) that
 *  differ between the hex digests `reference` and `digest`, or clears any marks when
 *  either is missing or they are too different to be worth marking (see `diffHex`).
 *  Only applies while the element shows that same digest as hex: the runs are
 *  character positions in it, so Base64 or binary output has nothing to line up
 *  with. Rebuilds the text but leaves the element's `.tooltip` child alone. */
export function setHashDiff(hashEl, reference, digest) {
  if (!hashEl) return;
  const diff = reference && digest ? diffHex(reference, digest) : null;

  const tip = hashEl.querySelector('.tooltip');
  const nodes = [...hashEl.childNodes].filter((node) => node !== tip);
  const shown = nodes.map((node) => node.textContent).join('');
  const aligned = diff && shown.toLowerCase() === diff.hex;
  if (!aligned && !nodes.some((node) => node.nodeType === Node.ELEMENT_NODE)) return; // nothing to undo

  const frag = document.createDocumentFragment();
  if (!aligned) {
    frag.append(shown);
  } else {
    let at = 0;
    for (const { length, differs } of diff.runs) {
      const part = shown.slice(at, at + length);
      at += length;
      if (!differs) {
        frag.append(part);
        continue;
      }
      const mark = document.createElement('mark');
      mark.className = 'result__diff';
      mark.textContent = part;
      frag.append(mark);
    }
  }
  nodes.forEach((node) => node.remove());
  hashEl.insertBefore(frag, tip);
}
