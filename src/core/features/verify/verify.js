import { initPasteButton } from '~core/features/input/paste-button.js';
import { setVerifyState } from '~core/features/results/result.js';
import { initReferenceFileButton } from '~core/features/verify/reference-file/reference-file-button.js';
import { initReferenceFileDrop } from '~core/features/verify/reference-file/reference-file-drop.js';
import { describeVerifyState } from '~core/features/verify/status/verify-messages.js';
import { createVerifyStatus } from '~core/features/verify/status/verify-status.js';
import { initResponsivePlaceholder } from '~core/ui/responsive-placeholder/responsive-placeholder.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

import { assignEntries, hexLengthsOf } from './manifest/manifest.js';
import { parseReference } from './reference.js';

/** Reference-hash field for a results list. The reference's size says which
 *  algorithms it can belong to, so only same-size rows are judged — a SHA-256
 *  reference shouldn't turn every other row red. Same size and equal digest
 *  is a match, same size and different digest is a mismatch, other sizes
 *  stay untouched.
 *
 *  `getRow(id)` returns an algorithm's `.result` row; `isHidden(id)` says
 *  whether that algorithm is currently hidden (hidden ones aren't computed).
 *  Feed it digests via `setDigests` and re-render with `refresh` when the
 *  hidden set changes.
 *
 *  The field may instead hold a checksum list of several files (`setManifest`, or one uploaded or dropped
 *  on it): each file is then checked against its own line, and `getManifestSummary(manifest)` says
 *  what the notice shows for the files together (null to show the one for the file on view), and
 *  `getFileNames()` the names of all the files, so that a list entry is not taken by two of them.
 *
 *  With nothing in the field, `getComparison()` may say something about the files themselves ({ text }, or
 *  null), as the neutral notice.
 *
 *  `onChange()` is called whenever what the field says changes. */
export function createVerify({
  root,
  algorithms,
  getRow,
  isHidden,
  getFileName = () => '',
  getManifestSummary = () => null,
  getFileNames = () => [],
  getComparison = () => null,
  onChange = () => {},
}) {
  const input = root.querySelector('.verify__input');
  const clearBtn = root.querySelector('.verify__clear');
  initResponsivePlaceholder(input);
  const status = createVerifyStatus(root);

  // Map<algoId, lowercase hex> for the current file, or null when there is none.
  let digests = null;
  // The algorithms whose digest is still being worked out: no digest yet is not "never computed".
  let pending = new Set();
  // A checksum list of several files, `{ name, entries }`, or null: the reference is then one line of it.
  let manifest = null;

  // Which manifest entries go with which files, for the manifest and the files it was last worked out for.
  let assignment = null;

  /** The entries of the manifest that go with `fileName`, among the files `getFileNames()` gives. */
  function _entriesFor(fileName) {
    const names = getFileNames();
    const all = names.includes(fileName) ? names : [...names, fileName];
    const key = all.join('\n');
    if (assignment?.manifest !== manifest || assignment.key !== key) {
      assignment = { manifest, key, map: assignEntries(manifest.entries, all) };
    }
    return assignment.map.get(fileName) ?? [];
  }

  /** The reference that `fileName` is to be compared with: the field's, or its line of the manifest. A
   *  file the manifest lists under several algorithms has several: the one of a size that `hasDigest(id)`
   *  says an algorithm has a digest for is taken, else the first. */
  function _referenceFor(fileName, hasDigest = (id) => !isHidden(id)) {
    if (!manifest) return parseReference(input.value);
    const entries = _entriesFor(fileName);
    const fits = (entry) => algorithms.some(({ id, hexLen }) => hexLen === entry.hex.length && hasDigest(id));
    const entry = entries.find(fits) ?? entries[0];
    return entry ? { hex: entry.hex } : null;
  }

  /** The field holds a manifest (a label for it, not editable) or text. */
  function _setManifest(next) {
    manifest = next;
    input.readOnly = Boolean(next);
    input.value = next ? next.name : '';
    root.classList.toggle('verify--manifest', Boolean(next));
  }

  /** Puts `text` in the field, in place of a manifest if there was one. */
  function _setText(text) {
    _setManifest(null);
    input.value = text;
    render();
  }

  /** Shows the notice, and tints the field's border to match its verdict. */
  function _showStatus(message) {
    status.set(message);
    root.classList.toggle('verify--match', message.kind === 'match');
    root.classList.toggle('verify--mismatch', message.kind === 'mismatch');
    root.classList.toggle('verify--warn', message.kind === 'warn');
  }

  /** 'hiddenFit' | 'fit' | 'match' | 'mismatch', or null when the row isn't comparable. */
  function _classify(ref, id, hexLen) {
    if (ref?.hex.length !== hexLen) return null;
    if (isHidden(id)) return 'hiddenFit';
    if (!digests) return 'fit';
    const digest = digests.get(id)?.toLowerCase();
    if (!digest) return pending.has(id) ? 'fit' : 'unhashed'; // else it was hidden when the file was hashed
    return digest === ref.hex ? 'match' : 'mismatch';
  }

  /** What the notice says: for a manifest, the files together, or the file on view with its line. */
  function _describe(result) {
    if (!manifest) {
      const hasInput = Boolean(input.value.trim());
      return (!hasInput && getComparison()) || describeVerifyState({ ...result, hasInput });
    }
    const summary = getManifestSummary(manifest);
    if (summary) return summary;
    return describeVerifyState({ ...result, hasInput: true });
  }

  function render() {
    const ref = _referenceFor(getFileName());
    clearBtn.classList.toggle('verify__clear--visible', input.value !== '');

    const result = { ref, matched: [], compared: [], hiddenFits: [], unhashed: [], fits: [] };
    const kinds = new Map();
    for (const { id, hexLen } of algorithms) {
      const kind = _classify(ref, id, hexLen);
      kinds.set(id, kind);
      if (kind === 'hiddenFit') result.hiddenFits.push(id);
      else if (kind === 'unhashed') result.unhashed.push(id);
      else if (kind === 'fit') result.fits.push(id);
      else if (kind) {
        result.compared.push(id);
        if (kind === 'match') result.matched.push(id);
      }
    }

    // Once an algorithm matches, the reference plainly belongs to it, so the other
    // same-size rows aren't failures worth flagging: they stay neutral. Red is for
    // when nothing matched, and nothing that might is still being hashed.
    const anyMatch = result.matched.length > 0;
    const settled = result.fits.length === 0;
    for (const { id } of algorithms) {
      const kind = kinds.get(id);
      const verdict = kind === 'match' || (kind === 'mismatch' && !anyMatch && settled) ? kind : null;
      const against = verdict === 'mismatch' ? { reference: ref.hex, digest: digests.get(id) } : null;
      setVerifyState(getRow(id), verdict, against);
    }

    _showStatus(_describe(result));
    onChange();
  }

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (input.value || manifest)) {
      e.preventDefault();
      e.stopPropagation();
      clear();
    }
  });
  initButtonTooltip(clearBtn, 'Clear');
  clearBtn.addEventListener('click', () => {
    clear();
    input.focus();
  });

  // Paste button: fills the field without focusing it, so on mobile the keyboard
  // stays down. A refused read is reported in the notice rather than by focusing
  // the field (which would raise the keyboard just to tell the user to paste).
  initPasteButton(root.querySelector('.verify__paste'), {
    onText(text) {
      _setText(text.trim());
    },
    onDenied() {
      _showStatus({ text: 'Paste blocked – paste into the field instead', kind: 'warn' });
    },
  });

  // Upload button: reads a file's text into the field (a lone hash, or a checksum
  // list, from which the hashed file's own line is picked). Same no-focus rule as paste.
  const reference = {
    getFileName,
    hexLengths: hexLengthsOf(algorithms),
    onText: _setText,
    onManifest(next) {
      _setManifest(next);
      render();
    },
    onRejected(message) {
      _showStatus({ text: message, kind: 'warn' });
    },
  };
  initReferenceFileButton(root.querySelector('.verify__file'), root.querySelector('.verify__file-input'), reference);
  initReferenceFileDrop(root.querySelector('.verify__field'), reference);

  function clear() {
    _setText('');
  }

  // Browsers can restore a previous value into the field on reload.
  render();

  return {
    /** `digests`: Map<algoId, hex> for the hashed file, or null when there is none / it is being hashed.
     *  While some of it is known, `pending` lists the algorithms still being worked out (the rest
     *  without a digest were never computed). */
    setDigests(next, { pending: stillHashing = [] } = {}) {
      digests = next;
      pending = new Set(stillHashing);
      render();
    },
    /** Puts a checksum list in the field (`{ name, entries }`, see ./manifest.js), or takes it out (null). */
    setManifest(next) {
      _setManifest(next);
      render();
    },
    /** What the reference says of the file `fileName`, whose finished digests are `fileDigests`
     *  (`Map<algoId, hex>`): 'match', 'mismatch', 'unlisted' (a manifest without the file), 'unchecked' (a
     *  reference, but none of its size among the digests), or null when there is no reference. */
    verdictFor(fileDigests, fileName) {
      const ref = _referenceFor(fileName, (id) => fileDigests.has(id));
      if (!ref) return manifest ? 'unlisted' : null;
      const same = algorithms.filter(({ id, hexLen }) => hexLen === ref.hex.length && fileDigests.has(id));
      if (!same.length) return 'unchecked';
      return same.some(({ id }) => fileDigests.get(id).toLowerCase() === ref.hex) ? 'match' : 'mismatch';
    },
    refresh: render,
    clear,
  };
}
