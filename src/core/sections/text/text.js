import { rememberRadioGroup, restoreHiddenAlgos, saveHiddenAlgos } from '~core/features/preferences/saved-view.js';
import { downloadDigest } from '~core/features/results/export/download-digest.js';
import { createHiddenAlgos } from '~core/features/results/hidden/hidden-algos.js';
import { createHiddenSummary } from '~core/features/results/hidden/hidden-summary.js';
import { updateToggleAllButton } from '~core/features/results/result-row.js';
import { createSoloResult } from '~core/features/results/solo-result.js';
import { AlgoSpotlight } from '~core/features/spotlight/algo-spotlight.js';
import { Format } from '~core/lib/format.js';
import { Announcer } from '~core/ui/announcer/announcer.js';
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
  // The input the digests in rawHexMap are of, `{ raw, format }`, or null while there are none.
  _hashed: null,

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
    // Only the visible algorithms are hashed (see onInput()): a digest this row doesn't have yet is
    // fetched by _afterVisibilityChange(), once all the toggles of this change are made.
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
    this._fillMissing();
    if (resetSpotlight) AlgoSpotlight.reset();
  },

  /** Persists which algorithms are hidden (the spotlight calls it for every section when it ends). */
  saveHidden() {
    saveHiddenAlgos(this, 'textHidden');
  },

  /** Hashes the current input for the visible algorithms that have no digest yet (shown after the
   *  input was hashed), shows them and puts them in the history as a batch of their own. A new input,
   *  or a clear, while it is hashing makes the answer stale: the new input's own pass covers it. */
  async _fillMissing() {
    const hashed = this._hashed;
    if (!hashed) return;
    const missing = _ALGORITHMS
      .filter(({ id }) => !this.hiddenAlgos.has(id) && !this.rawHexMap.has(id))
      .map(({ id }) => id);
    if (!missing.length) return;

    let digests;
    try {
      digests = await _Hasher.fromTextSome(hashed.raw, hashed.format, missing);
    } catch {
      if (this._hashed === hashed) this._rows.showMessageFor(missing, 'hashing failed');
      return;
    }
    if (this._hashed !== hashed) return;

    const items = [];
    for (const [id, hex] of digests) {
      this.rawHexMap.set(id, hex);
      // Hidden again meanwhile: the digest is kept for when it comes back, but there is no row to fill.
      if (this.hiddenAlgos.has(id)) continue;
      const hash = this._formattedHash(id);
      this._rows.show(id, hash);
      items.push({ hash, algo: id });
    }
    this._history.recordRestored(items);
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
      this._hashed = null;
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

    // Hash with the visible algorithms simultaneously (a hidden one is hashed if it is shown later).
    let hexMap;
    try {
      const visible = _ALGORITHMS.filter(({ id }) => !this.hiddenAlgos.has(id)).map(({ id }) => id);
      hexMap = await _Hasher.fromTextAll(raw, inputFmt, visible);
    } catch {
      if (seq === this._inputSeq) this._showNoDigests('hashing failed');
      return;
    }
    // Typing on, or clearing, while this was hashing: that newer input's result is the one to show.
    if (seq !== this._inputSeq) return;
    this.rawHexMap = hexMap;
    this._hashed = { raw, format: inputFmt };

    // Described from `raw`, not the field, which may have moved on while hashing.
    this._history.begin(textPreview(raw, inputFmt));
    this._rows.showDigests(this.rawHexMap, this.getSelectedFormat());
    this._setActionsEnabled(true);
    this._history.queue();
    // An algorithm shown while this was hashing has no digest in it.
    this._fillMissing();
    const shown = _ALGORITHMS.length - this.hiddenAlgos.size;
    Announcer.say(`${shown} ${shown === 1 ? 'hash' : 'hashes'} calculated`);
  },

  /** The visible rows have no digests (`message` says why: WebAssembly missing, input invalid…): say so where they would be. */
  _showNoDigests(message) {
    this._hashed = null;
    this.rawHexMap.clear();
    this._history.cancel();
    this._rows.showMessage(message);
    this._setActionsEnabled(false);
    Announcer.say(`No hashes: ${message}`);
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
