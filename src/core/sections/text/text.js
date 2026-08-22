import { rememberRadioGroup, restoreHiddenAlgos, saveHiddenAlgos } from '~core/features/preferences/saved-view.js';
import { downloadDigest } from '~core/features/results/export/download-digest.js';
import { createHiddenAlgos } from '~core/features/results/hidden/hidden-algos.js';
import { createHiddenSummary } from '~core/features/results/hidden/hidden-summary.js';
import { updateToggleAllButton } from '~core/features/results/result-row.js';
import { createSoloResult } from '~core/features/results/solo-result.js';
import { AlgoSpotlight } from '~core/features/spotlight/algo-spotlight.js';
import { Format } from '~core/lib/format.js';
import { Checkmark } from '~core/ui/button/checkmark.js';
import { copyWithFeedback } from '~core/ui/button/copy-feedback.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

import { createTextCounter, MAX_TEXT_BYTES } from './counter/text-counter.js';
import { isValidInput } from './counter/text-notes.js';
import { selectedInputFormat } from './input-format.js';
import { initTextDrop } from './text-drop.js';
import { createTextHistory } from './text-history.js';
import { createTextInput } from './text-input.js';
import { textPreview } from './text-preview.js';
import { createTextRows } from './text-rows.js';

let _APP_CONFIG, _ALGORITHMS, _Hasher;

/** The Text section: hashes what is typed, pasted or dropped in its field with every algorithm, and
 *  shows the digests. The field is ./text-input.js (and ./text-drop.js), the rows ./text-rows.js, the
 *  counter under the field ./counter/text-counter.js and what goes in the history ./text-history.js. */
export const TextSection = {
  // rawHexMap: Map<algoId, hex> — the unformatted digests for the current input.
  rawHexMap: new Map(),
  hiddenAlgos: new Set(),
  // Counts onInput() runs, so one that was overtaken while it hashed can tell and drop its result.
  _inputSeq: 0,

  init({ APP_CONFIG, ALGORITHMS, Hasher }) {
    _APP_CONFIG = APP_CONFIG;
    _ALGORITHMS = ALGORITHMS;
    _Hasher = Hasher;

    this._history = createTextHistory({
      hasDigests: () => this.rawHexMap.size > 0,
      getItems: () =>
        _ALGORITHMS
          .filter(({ id }) => !this.hiddenAlgos.has(id))
          .map(({ id }) => ({
            hash: this._formattedHash(id),
            algo: id,
          })),
    });
    this._hidden = createHiddenAlgos({
      algorithms: _ALGORITHMS,
      hiddenAlgos: this.hiddenAlgos,
      setHidden: (algoId, hidden) => this._setHidden(algoId, hidden),
      applied: (restored) => this._history.recordRestored(restored),
      afterChange: (opts) => this._afterVisibilityChange(opts),
      getBadge: (algoId) => this._rows.get(algoId).badge,
      toggleAllBtnId: 'textToggleAllBtn',
    });

    const resultsEl = document.getElementById('textResults');
    this._counter = createTextCounter({
      charsEl: document.getElementById('textCounterChars'),
      bytesEl: document.getElementById('textCounterBytes'),
      notesEl: document.getElementById('textCounterNotes'),
    });

    // Build one result row per algorithm (least to most complex = ALGORITHMS order).
    this._rows = createTextRows({
      resultsEl,
      algorithms: _ALGORITHMS,
      isHidden: (id) => this.hiddenAlgos.has(id),
      handlers: {
        onToggle: (id) => this._toggleAlgo(id, { refreshTooltip: true }),
        onDownload: (id) => this._onDownload(id),
        onCopy: (id) => this._onCopy(id),
        getHash: (id) => this._formattedHash(id),
      },
    });
    this._hiddenSummary = createHiddenSummary({
      resultsEl,
      total: _ALGORITHMS.length,
      onShowAll: () => this._toggleAll(),
    });
    this._soloResult = createSoloResult({ resultsEl, algorithms: _ALGORITHMS });
    // Sync button icon and hidden-algorithms summary with initial hiddenAlgos state.
    updateToggleAllButton('textToggleAllBtn', this.hiddenAlgos, _ALGORITHMS, 'text');
    this._hiddenSummary.update(this.hiddenAlgos.size);
    this._soloResult.update();

    this._input = createTextInput({
      onInput: () => this.onInput(),
      onClear: (opts) => this.onClear(opts),
    });

    // Put back the visitor's saved formats and hidden algorithms (and keep saving them).
    rememberRadioGroup('textInputFormat', 'textInputFormat');
    rememberRadioGroup('textFormat', 'textOutputFormat');
    this._input.refreshPlaceholder();
    restoreHiddenAlgos(this, 'textHidden', _ALGORITHMS);

    this._counter.update('', selectedInputFormat());

    // Leaving the field (to copy a hash, say) or the page is when typing is over.
    this._input.el.addEventListener('blur', () => this._history.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._history.flush();
    });
    window.addEventListener('pagehide', () => this._history.flush());

    initTextDrop({
      card: this._input.card,
      onText: (raw) => this._input.insertText(raw, { replace: true }),
    });

    document
      .querySelectorAll('input[name="textFormat"]')
      .forEach((radio) => radio.addEventListener('change', () => this._reformatAll()));
  },

  // ── Showing and hiding algorithms ──────────────────────────────────────

  /** Hides or shows one algorithm's row (showing puts back its digest, if the current input has one).
   *  Returns the history item `{ hash, algo }` of a row just shown with a digest, else null. */
  _setHidden(algoId, hidden) {
    if (hidden) {
      this.hiddenAlgos.add(algoId);
      this._rows.hide(algoId);
      return null;
    }
    this.hiddenAlgos.delete(algoId);
    // fromTextAll hashes every algorithm regardless of hidden state (see onInput()), so there is
    // nothing to compute here.
    const hash = this._formattedHash(algoId);
    this._rows.show(algoId, hash);
    return hash ? { hash, algo: algoId } : null;
  },

  /** What follows any change to which algorithms are hidden. */
  _afterVisibilityChange({ resetSpotlight }) {
    updateToggleAllButton('textToggleAllBtn', this.hiddenAlgos, _ALGORITHMS, 'text');
    this._hiddenSummary.update(this.hiddenAlgos.size);
    this._soloResult.update();
    saveHiddenAlgos(this, 'textHidden');
    if (resetSpotlight) AlgoSpotlight.reset();
  },

  _toggleAll(options) {
    this._hidden.toggleAll(options);
  },

  _toggleAlgo(algoId, options) {
    this._hidden.toggleAlgo(algoId, options);
  },

  // ── Formats and digests ────────────────────────────────────────────────

  getSelectedInputFormat: selectedInputFormat,

  getSelectedFormat() {
    return document.querySelector('input[name="textFormat"]:checked').value;
  },

  /** Return the formatted hash string for an algo, or '' if none. */
  _formattedHash(algoId) {
    const hex = this.rawHexMap.get(algoId);
    return hex ? Format.applyFormat(hex, this.getSelectedFormat()) : '';
  },

  /** Re-render all rows from the stored raw hex values (format change). */
  _reformatAll() {
    this._rows.reformat(this.rawHexMap, this.getSelectedFormat());
    this._history.recordNow();
  },

  _setActionsEnabled(enabled) {
    this._input.setClearVisible(enabled);
    this._rows.setActionsEnabled(enabled);
  },

  // ── The field, as the rest of the page sees it ─────────────────────────

  refreshPlaceholder() {
    this._input.refreshPlaceholder();
  },

  setText(text) {
    this._input.setText(text);
  },

  typeText(char) {
    this._input.typeText(char);
  },

  pasteText(raw) {
    this._input.pasteText(raw);
  },

  onClear({ focus = true } = {}) {
    // Whatever was typed and is still waiting for the history goes in before it is cleared.
    this._history.flush();
    this._input.clear({ focus });
  },

  // ── Hashing the input ──────────────────────────────────────────────────

  async onInput() {
    const seq = ++this._inputSeq;
    const raw = this._input.el.value;
    const inputFmt = selectedInputFormat();
    const bytes = this._counter.update(raw, inputFmt);

    if (!raw) {
      this.rawHexMap.clear();
      this._history.cancel();
      this._rows.showAwaiting();
      this._setActionsEnabled(false);
      return;
    }

    // Never hash a guess: input that isn't valid in its format would decode to other bytes.
    if (!isValidInput(raw, inputFmt)) {
      this._showNoDigests('invalid input');
      return;
    }
    if (bytes > MAX_TEXT_BYTES) {
      this._showNoDigests('too large');
      return;
    }

    // Hash with all algorithms simultaneously.
    let hexMap;
    try {
      hexMap = await _Hasher.fromTextAll(raw, inputFmt);
    } catch {
      if (seq === this._inputSeq) this._showNoDigests('hashing failed');
      return;
    }
    // Typing on, or clearing, while this was hashing: that newer input's result is the one to show.
    if (seq !== this._inputSeq) return;
    this.rawHexMap = hexMap;

    // Described from `raw`, not the field, which may have moved on while hashing.
    this._history.begin(textPreview(raw, inputFmt));
    this._rows.showDigests(this.rawHexMap, this.getSelectedFormat());
    this._setActionsEnabled(true);
    this._history.queue();
  },

  /** The visible rows have no digests (`message` says why: WebAssembly missing, input invalid…): say so where they would be. */
  _showNoDigests(message) {
    this.rawHexMap.clear();
    this._history.cancel();
    this._rows.showMessage(message);
    this._setActionsEnabled(false);
  },

  // ── Row actions ────────────────────────────────────────────────────────

  _onDownload(algoId) {
    const hash = this._formattedHash(algoId);
    if (!hash) return;
    downloadDigest(hash, algoId, '', _APP_CONFIG);
    const btn = this._rows.get(algoId).download;
    Tooltip.flash(btn);
    Checkmark.flash(btn);
  },

  async _onCopy(algoId) {
    const hash = this._formattedHash(algoId);
    if (!hash) return;
    await copyWithFeedback(hash, { button: this._rows.get(algoId).copy });
  },
};
