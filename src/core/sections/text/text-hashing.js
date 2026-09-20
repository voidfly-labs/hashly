import { Announcer } from '~core/ui/announcer/announcer.js';

import { MAX_TEXT_BYTES } from './counter/text-counter.js';
import { isValidInput } from './counter/text-notes.js';
import { selectedInputFormat } from './input-format.js';
import { textPreview } from './text-preview.js';

/** The part of the Text section that turns the field's text into digests: hashes it with the visible
 *  algorithms (`Hasher`, the app's client; `hiddenAlgos` the section's Set of hidden ids), shows what
 *  came out or why there is nothing, and hashes later what an algorithm shown after the fact is missing.
 *
 *  `input` is the field's element, `counter` ./counter/text-counter.js, `rows` the result rows,
 *  `history` ./text-history.js, `setActionsEnabled(enabled)` the section's switch for the buttons that need a
 *  digest, `formattedHash(id)` and `getOutputFormat()` how digests are shown.
 *
 *  Returns `{ onInput, fillMissing, digests }`; `digests` is the `Map<algoId, hex>` (unformatted) of the
 *  input on show, empty while there is none. */
export function createTextHashing({
  algorithms,
  Hasher,
  hiddenAlgos,
  input,
  counter,
  rows,
  history,
  setActionsEnabled,
  formattedHash,
  getOutputFormat,
}) {
  let digests = new Map();
  // Counts onInput() runs, so one that was overtaken while it hashed can tell and drop its result.
  let inputSeq = 0;
  // The input the digests are of, `{ raw, format }`, or null while there are none.
  let hashed = null;

  /** The visible rows have no digests (`message` says why: WebAssembly missing, input invalid…): say so where they would be. */
  function showNoDigests(message) {
    hashed = null;
    digests.clear();
    history.cancel();
    rows.showMessage(message);
    setActionsEnabled(false);
    Announcer.say(`No hashes: ${message}`);
  }

  /** Hashes the current input for the visible algorithms that have no digest yet (shown after the
   *  input was hashed), shows them and puts them in the history as a batch of their own. A new input,
   *  or a clear, while it is hashing makes the answer stale: the new input's own pass covers it. */
  async function fillMissing() {
    const current = hashed;
    if (!current) return;
    const missing = algorithms.filter(({ id }) => !hiddenAlgos.has(id) && !digests.has(id)).map(({ id }) => id);
    if (!missing.length) return;

    let result;
    try {
      result = await Hasher.fromTextSome(current.raw, current.format, missing);
    } catch {
      if (hashed === current) rows.showMessageFor(missing, 'hashing failed');
      return;
    }
    if (hashed !== current) return;

    const items = [];
    for (const [id, hex] of result) {
      digests.set(id, hex);
      // Hidden again meanwhile: the digest is kept for when it comes back, but there is no row to fill.
      if (hiddenAlgos.has(id)) continue;
      rows.show(id, formattedHash(id));
      items.push({ hash: hex, algo: id });
    }
    history.recordRestored(items);
  }

  async function onInput() {
    const seq = ++inputSeq;
    const raw = input.value;
    const inputFmt = selectedInputFormat();
    const bytes = counter.update(raw, inputFmt);

    if (!raw) {
      hashed = null;
      digests.clear();
      history.cancel();
      rows.showAwaiting();
      setActionsEnabled(false);
      return;
    }

    // Never hash a guess: input that isn't valid in its format would decode to other bytes.
    if (!isValidInput(raw, inputFmt)) {
      showNoDigests('invalid input');
      return;
    }
    if (bytes > MAX_TEXT_BYTES) {
      showNoDigests('too large');
      return;
    }

    // Hash with the visible algorithms simultaneously (a hidden one is hashed if it is shown later).
    let hexMap;
    try {
      const visible = algorithms.filter(({ id }) => !hiddenAlgos.has(id)).map(({ id }) => id);
      hexMap = await Hasher.fromTextAll(raw, inputFmt, visible);
    } catch {
      if (seq === inputSeq) showNoDigests('hashing failed');
      return;
    }
    // Typing on, or clearing, while this was hashing: that newer input's result is the one to show.
    if (seq !== inputSeq) return;
    digests = hexMap;
    hashed = { raw, format: inputFmt };

    // Described from `raw`, not the field, which may have moved on while hashing.
    history.begin(textPreview(raw, inputFmt));
    rows.showDigests(digests, getOutputFormat());
    setActionsEnabled(true);
    history.queue();
    // An algorithm shown while this was hashing has no digest in it.
    fillMissing();
    const shown = algorithms.length - hiddenAlgos.size;
    Announcer.say(`${shown} ${shown === 1 ? 'hash' : 'hashes'} calculated`);
  }

  return {
    onInput,
    fillMissing,
    get digests() {
      return digests;
    },
  };
}
