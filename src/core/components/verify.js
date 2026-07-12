import { initPasteButton } from '~core/components/paste-button.js';
import { initReferenceFileButton } from '~core/components/reference-file-button.js';
import { initResponsivePlaceholder } from '~core/components/responsive-placeholder.js';
import { setVerifyState } from '~core/components/result.js';
import { createVerifyStatus } from '~core/components/verify-status.js';
import { parseReference } from '~core/utils/reference.js';
import { availableSizes, describeVerifyState } from '~core/utils/verify-status.js';

/** Reference-hash field for a results list. The reference's size says which
 *  algorithms it can belong to, so only same-size rows are judged — a SHA-256
 *  reference shouldn't turn every other row red. Same size and equal digest
 *  is a match, same size and different digest is a mismatch, other sizes
 *  stay untouched.
 *
 *  `getRow(id)` returns an algorithm's `.result` row; `isHidden(id)` says
 *  whether that algorithm is currently hidden (hidden ones aren't computed).
 *  Feed it digests via `setDigests` and re-render with `refresh` when the
 *  hidden set changes. */
export function createVerify({ root, algorithms, getRow, isHidden, getFileName = () => '' }) {
  const input = root.querySelector('.verify__input');
  const clearBtn = root.querySelector('.verify__clear');
  initResponsivePlaceholder(input);
  const status = createVerifyStatus(root);
  const sizesHint = availableSizes(algorithms);

  // Map<algoId, lowercase hex> for the current file, or null when there is none.
  let digests = null;

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
    if (!digest) return null;
    return digest === ref.hex ? 'match' : 'mismatch';
  }

  function render() {
    const ref = parseReference(input.value);
    clearBtn.classList.toggle('verify__clear--visible', input.value !== '');

    const result = { ref, matched: [], compared: [], hiddenFits: [], fits: [] };
    const kinds = new Map();
    for (const { id, hexLen } of algorithms) {
      const kind = _classify(ref, id, hexLen);
      kinds.set(id, kind);
      if (kind === 'hiddenFit') result.hiddenFits.push(id);
      else if (kind === 'fit') result.fits.push(id);
      else if (kind) {
        result.compared.push(id);
        if (kind === 'match') result.matched.push(id);
      }
    }

    // Once an algorithm matches, the reference plainly belongs to it, so the other
    // same-size rows aren't failures worth flagging: they stay neutral. Red is for
    // when nothing matched.
    const anyMatch = result.matched.length > 0;
    for (const { id } of algorithms) {
      const kind = kinds.get(id);
      const verdict = kind === 'match' || (kind === 'mismatch' && !anyMatch) ? kind : null;
      const against = verdict === 'mismatch' ? { reference: ref.hex, digest: digests.get(id) } : null;
      setVerifyState(getRow(id), verdict, against);
    }

    _showStatus(describeVerifyState({ ...result, hasInput: Boolean(input.value.trim()), sizesHint }));
  }

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value) {
      e.preventDefault();
      e.stopPropagation();
      clear();
    }
  });
  clearBtn.addEventListener('click', () => {
    clear();
    input.focus();
  });

  // Paste button: fills the field without focusing it, so on mobile the keyboard
  // stays down. A refused read is reported in the notice rather than by focusing
  // the field (which would raise the keyboard just to tell the user to paste).
  initPasteButton(root.querySelector('.verify__paste'), {
    onText(text) {
      input.value = text.trim();
      render();
    },
    onDenied() {
      _showStatus({ text: 'Paste blocked – paste into the field instead', kind: 'warn' });
    },
  });

  // Upload button: reads a file's text into the field (a lone hash, or a checksum
  // list, from which the hashed file's own line is picked). Same no-focus rule as paste.
  initReferenceFileButton(root.querySelector('.verify__file'), root.querySelector('.verify__file-input'), {
    getFileName,
    onText(line) {
      input.value = line;
      render();
    },
    onRejected(message) {
      _showStatus({ text: message, kind: 'warn' });
    },
  });

  function clear() {
    input.value = '';
    render();
  }

  // Browsers can restore a previous value into the field on reload.
  render();

  return {
    /** `digests`: Map<algoId, hex> for the hashed file, or null when there is none / it is being hashed. */
    setDigests(next) {
      digests = next;
      render();
    },
    refresh: render,
    clear,
  };
}
