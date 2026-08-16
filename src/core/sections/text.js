import { AlgoSpotlight } from '~core/components/algo-spotlight.js';
import { initButtonTooltip } from '~core/components/button-tooltip.js';
import { copyWithFeedback } from '~core/components/copy-feedback.js';
import { createCounterNotes } from '~core/components/counter-notes.js';
import { createHiddenAlgos } from '~core/components/hidden-algos.js';
import { createHiddenSummary } from '~core/components/hidden-summary.js';
import { Hint } from '~core/components/hint.js';
import { History } from '~core/components/history.js';
import { initPasteButton } from '~core/components/paste-button.js';
import { setHashEmpty } from '~core/components/result.js';
import {
  buildResultRow,
  hideRow,
  setHashText,
  setRowActions,
  showRow,
  updateToggleAllButton,
  wireResultRow,
} from '~core/components/result-row.js';
import { rememberRadioGroup, restoreHiddenAlgos, saveHiddenAlgos } from '~core/components/saved-view.js';
import { expandSection } from '~core/components/section-collapse.js';
import { createSoloResult } from '~core/components/solo-result.js';
import { Tooltip } from '~core/components/tooltip.js';
import { Checkmark } from '~core/utils/checkmark.js';
import { downloadDigest } from '~core/utils/download-digest.js';
import { Format } from '~core/utils/format.js';
import { trackPageDrag } from '~core/utils/page-drag.js';
import { takesText } from '~core/utils/text-field.js';
import { inputNotes, isValidInput } from '~core/utils/text-notes.js';
import { textPreview } from '~core/utils/text-preview.js';

let _APP_CONFIG, _ALGORITHMS, _Hasher;

// History records what was hashed once the input has been left alone this long (or at once
// when focus leaves the field, the page is hidden or the field is cleared), not on every
// keystroke: a typed sentence would otherwise push everything else out of the history.
const HISTORY_IDLE_MS = 1000;

// Text is hashed with every algorithm on each change; past this many bytes that is a file's job.
const MAX_TEXT_BYTES = 1024 * 1024;
// The most characters one byte can take in each input format (a binary group and its space: 9).
// Input longer than that many times the limit is too large without being decoded, and the counter
// says "<max>+" instead of decoding megabytes on every keystroke.
const CHARS_PER_BYTE = { 'utf-8': 1, hex: 2, base64: 4 / 3, binary: 9 };
const TOO_LARGE_NOTE = { label: 'too large', tip: 'Over 1 MB, use a file' };
const isSurelyTooLarge = (text, fmt) => text.length > MAX_TEXT_BYTES * (CHARS_PER_BYTE[fmt] ?? 1);

const _FORMAT_HINTS = {
  hex: 'hex only · 0–9, a–f',
  base64: 'base64 only · a–z, 0–9, +/=',
  binary: 'binary only · 0, 1, <space>',
};

const _PLACEHOLDERS = {
  'utf-8': 'Start typing or paste text…',
  hex: 'Start typing or paste hex…',
  base64: 'Start typing or paste Base64…',
  binary: 'Start typing or paste binary…',
};

export const TextSection = {
  // rawHexMap: Map<algoId, hex> — the unformatted digests for the current input.
  rawHexMap: new Map(),
  // rowEls: Map<algoId, { hash, download, copy }> — live DOM references.
  rowEls: new Map(),
  hiddenAlgos: new Set(),
  // Shared batchId for all algorithms in the current computation.
  _currentBatchId: null,
  // What the current results were hashed from, as the history describes it (see utils/text-preview.js).
  _sourceDescription: '',

  // ── Debounced input handler ────────────────────────────────────────────
  // Typing is debounced so a burst of keystrokes asks for one hash.
  _debounceTimer: null,
  // Counts onInput() runs, so one that was overtaken while it hashed can tell and drop its result.
  _inputSeq: 0,
  // Input that has been hashed and shown but not yet put in the history (see HISTORY_IDLE_MS).
  _historyPending: false,
  _historyTimer: null,

  init({ APP_CONFIG, ALGORITHMS, Hasher }) {
    _APP_CONFIG = APP_CONFIG;
    _ALGORITHMS = ALGORITHMS;
    _Hasher = Hasher;

    this._input = document.getElementById('textInput');
    this._inputClear = document.getElementById('textInputClear');
    this._resultsEl = document.getElementById('textResults');
    this._counter = document.getElementById('textCounter');
    this._counterChars = document.getElementById('textCounterChars');
    this._counterBytes = document.getElementById('textCounterBytes');
    this._counterNotes = createCounterNotes(document.getElementById('textCounterNotes'));
    this._formatHint = document.getElementById('textFormatHint');

    this._hidden = createHiddenAlgos({
      algorithms: _ALGORITHMS,
      hiddenAlgos: this.hiddenAlgos,
      setHidden: (algoId, hidden) => this._setHidden(algoId, hidden),
      applied: (restored) => this._recordRestored(restored),
      afterChange: (opts) => this._afterVisibilityChange(opts),
      getBadge: (algoId) => this.rowEls.get(algoId).badge,
      toggleAllBtnId: 'textToggleAllBtn',
    });

    // Build one result row per algorithm (least to most complex = ALGORITHMS order).
    _ALGORITHMS.forEach(({ id }) => this._buildRow(id));
    this._hiddenSummary = createHiddenSummary({
      resultsEl: this._resultsEl,
      total: _ALGORITHMS.length,
      onShowAll: () => this._toggleAll(),
    });
    this._soloResult = createSoloResult({ resultsEl: this._resultsEl, algorithms: _ALGORITHMS });
    // Sync button icon and hidden-algorithms summary with initial hiddenAlgos state.
    updateToggleAllButton('textToggleAllBtn', this.hiddenAlgos, _ALGORITHMS, 'text');
    this._hiddenSummary.update(this.hiddenAlgos.size);
    this._soloResult.update();

    // Put back the visitor's saved formats and hidden algorithms (and keep saving them).
    rememberRadioGroup('textInputFormat', 'textInputFormat');
    rememberRadioGroup('textFormat', 'textOutputFormat');
    this.refreshPlaceholder();
    restoreHiddenAlgos(this, 'textHidden', _ALGORITHMS);

    this._updateCounter('');

    this._input.addEventListener('input', (e) => {
      if (!e.isComposing) this._dropIllegalChars();
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this.onInput(), 20);
    });
    // Input still being composed (a soft keyboard's) is filtered once it is committed.
    this._input.addEventListener('compositionend', () => this._dropIllegalChars());

    // Leaving the field (to copy a hash, say) or the page is when typing is over.
    this._input.addEventListener('blur', () => this._flushHistory());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._flushHistory();
    });
    window.addEventListener('pagehide', () => this._flushHistory());

    // Input-format validation — discard keystrokes that are illegal for
    // the selected input encoding (Hex / Base64 / Binary).
    // UTF-8 accepts everything so only the other three need filtering.
    this._input.addEventListener('keydown', (e) => {
      // Esc clears the textarea regardless of input format.
      if (e.key === 'Escape') {
        e.preventDefault();
        this.onClear();
        return;
      }

      const fmt = this.getSelectedInputFormat();
      if (fmt === 'utf-8') return; // no restriction
      // A line break is no part of any of these formats (and would break Base64 decoding).
      if (e.key === 'Enter') {
        e.preventDefault();
        return;
      }
      // Allow: control keys, arrows, backspace, delete, tab, Ctrl/Cmd combos
      if (e.key.length > 1 || e.ctrlKey || e.metaKey) return;
      const ch = e.key;
      let valid = false;
      switch (fmt) {
        case 'hex':
          valid = /^[0-9a-fA-F]$/.test(ch);
          break;
        case 'base64':
          // Standard Base64 alphabet + padding
          valid = /^[A-Za-z0-9+/=]$/.test(ch);
          break;
        case 'binary':
          valid = ch === '0' || ch === '1' || ch === ' ';
          break;
      }
      if (!valid) {
        e.preventDefault();
        Hint.show(this._formatHint, _FORMAT_HINTS[fmt]);
      } else {
        Hint.hide(this._formatHint);
      }
    });

    // Switching input format clears the textarea and updates the placeholder
    // to guide what valid input looks like for the new encoding.
    document.querySelectorAll('input[name="textInputFormat"]').forEach((radio) =>
      radio.addEventListener('change', () => {
        // Don't focus the textarea: it's usually scrolled out of view above these radios,
        // focusing it would scroll there, and it would pull focus off the radio group
        // mid-arrow-key navigation.
        this.onClear({ focus: false });
        this.refreshPlaceholder();
      }),
    );

    // Inline ✕ button in the textarea corner — mirrors file-drop__clear behaviour.
    this._inputClear.addEventListener('click', () => this.onClear());
    initButtonTooltip(this._inputClear, 'Clear');

    initPasteButton(document.getElementById('textPasteBtn'), {
      // Don't focus the textarea: on mobile that would raise the keyboard just for a paste.
      onText: (text) => this.insertText(text, { focus: false }),
      onDenied: () => {
        this._input.focus();
        Hint.show(this._formatHint, 'paste blocked · use Ctrl/⌘+V');
      },
    });

    // Typed input is filtered per keystroke; do the same for native paste.
    // UTF-8 accepts everything, so the browser's own paste (and undo) is kept.
    this._input.addEventListener('paste', (e) => {
      if (this.getSelectedInputFormat() === 'utf-8') return;
      e.preventDefault();
      this.insertText(e.clipboardData.getData('text/plain'));
    });

    // ── Text drag-and-drop ─────────────────────────────────────────────
    // Accept text/plain snippets dragged from other windows/documents.
    // The card (not just the textarea) is the drop target for a larger
    // hit area, mirroring the file-drop zone pattern. Only text drags are
    // handled; file drags are intentionally ignored so they still route to
    // the File section's drop zone.
    this._card = this._input.closest('.card');

    // ── Page-wide text drag highlight ──────────────────────────────────
    // Lights up the text card whenever ANY text/plain drag enters the browser window,
    // regardless of where it lands. Only text drags are handled; Files drags route to
    // the File section.
    const _hasTextOnly = (dt) => dt?.types?.includes('text/plain') && !dt?.types?.includes('Files');

    trackPageDrag({
      accepts: (dt) => Boolean(_hasTextOnly(dt)),
      onChange: (active, { internal }) => {
        this._card.classList.toggle('card--text-drag', active);
        if (active && !internal) this._card.closest('.section').scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    });

    document.addEventListener('dragover', (e) => {
      // Required to allow drops anywhere on the page for text drags (a field takes its own)
      if (_hasTextOnly(e.dataTransfer) && !takesText(e.target)) e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      if (!_hasTextOnly(e.dataTransfer)) return;
      // Text dropped into another field (the reference hash, the history search) stays there.
      if (takesText(e.target)) return;
      // If the drop landed inside the card, the card's own handler already
      // processed it (and called stopPropagation) — nothing left to do.
      if (this._card.contains(e.target)) return;
      // Drop landed outside the card: it replaces the textarea's content, like a drop on it.
      e.preventDefault();
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      this.insertText(raw, { replace: true });
    });

    // ── Card-level drop: cursor-position-aware insertion ────────────────
    // dragover on the card keeps the dropEffect visible while over the textarea.
    this._card.addEventListener('dragover', (e) => {
      if (!_hasTextOnly(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation(); // don't let document dragover fire redundantly
      e.dataTransfer.dropEffect = 'copy';
    });

    this._card.addEventListener('drop', (e) => {
      if (!_hasTextOnly(e.dataTransfer)) return;
      e.preventDefault();
      // Stop propagation so the document drop handler skips this drop.
      e.stopPropagation();

      const raw = e.dataTransfer.getData('text/plain');
      if (raw) this.insertText(raw, { replace: true });
    });

    document
      .querySelectorAll('input[name="textFormat"]')
      .forEach((radio) => radio.addEventListener('change', () => this._reformatAll()));
  },

  // ── DOM helpers ────────────────────────────────────────────────────────

  /** Build a result row for one algorithm and append it to the container. */
  _buildRow(algoId) {
    const els = buildResultRow({ prefix: 'text', algoId, emptyText: 'awaiting input…' });
    this._resultsEl.appendChild(els.row);
    this.rowEls.set(algoId, els);

    wireResultRow(els, {
      isHidden: () => this.hiddenAlgos.has(algoId),
      onToggle: () => this._toggleAlgo(algoId, { refreshTooltip: true }),
      onDownload: () => this._onDownload(algoId),
      onCopy: () => this._onCopy(algoId),
      getHash: () => this._formattedHash(algoId),
    });

    // Apply initial hidden state if set before _buildRow is called.
    if (this.hiddenAlgos.has(algoId)) hideRow(els);
  },

  /** Hides or shows one algorithm's row (showing puts back its digest, if the current input has one).
   *  Returns the history item `{ hash, algo }` of a row just shown with a digest, else null. */
  _setHidden(algoId, hidden) {
    const els = this.rowEls.get(algoId);
    if (hidden) {
      this.hiddenAlgos.add(algoId);
      hideRow(els);
      return null;
    }
    this.hiddenAlgos.delete(algoId);
    // fromTextAll hashes every algorithm regardless of hidden state (see onInput()), so there is
    // nothing to compute here.
    const hash = this._formattedHash(algoId);
    showRow(els, hash, 'awaiting input…');
    return hash ? { hash, algo: algoId } : null;
  },

  /** Puts algorithms shown again (`[{ hash, algo }]`) in the history, in a batch of their own that
   *  carries the input's description. A fresh batchId, not the stale original: History.record()
   *  always stamps a fresh ts, and an old batchId would sort these entries among their old
   *  batch-mates by algo order instead of by their real time. One batch per user action. */
  _recordRestored(items) {
    if (!items.length) return;
    const batchId = History.nextBatch();
    History.setSource('text', batchId, this._sourceDescription);
    History.record('text', items, batchId);
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

  // ── Hash text helpers ──────────────────────────────────────────────────

  getSelectedInputFormat() {
    return document.querySelector('input[name="textInputFormat"]:checked')?.value ?? 'utf-8';
  },

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
    for (const { id } of _ALGORITHMS) {
      if (this.hiddenAlgos.has(id)) continue;
      const hex = this.rawHexMap.get(id);
      if (!hex) continue;
      setHashText(this.rowEls.get(id).hash, Format.applyFormat(hex, this.getSelectedFormat()));
    }
    // Reuse the existing batchId so format changes don't create new history batches — the
    // batch identity belongs to the computation, not the format. This also covers input
    // still waiting for the history, which is recorded in the new format.
    this._historyPending = false;
    clearTimeout(this._historyTimer);
    this._recordHistory();
  },

  // ── History ────────────────────────────────────────────────────────────

  /** The current results are to go in the history once the input has been left alone a while. */
  _queueHistory() {
    this._historyPending = true;
    clearTimeout(this._historyTimer);
    this._historyTimer = setTimeout(() => this._flushHistory(), HISTORY_IDLE_MS);
  },

  /** Puts waiting input in the history now, if there is any. */
  _flushHistory() {
    clearTimeout(this._historyTimer);
    if (!this._historyPending) return;
    this._historyPending = false;
    this._recordHistory();
  },

  /** Records the shown results (the visible algorithms, in the shown format) as the current batch. */
  _recordHistory() {
    if (!this.rawHexMap.size) return;
    History.setSource('text', this._currentBatchId, this._sourceDescription);
    const items = _ALGORITHMS
      .filter(({ id }) => !this.hiddenAlgos.has(id))
      .map(({ id }) => ({
        hash: this._formattedHash(id),
        algo: id,
      }));
    History.record(
      'text',
      items.filter((item) => item.hash),
      this._currentBatchId,
    );
  },

  _setAllActionsEnabled(enabled) {
    // The inline ✕ button shows/hides like file-drop__clear rather than
    // using a disabled state — it has no meaningful "empty" affordance.
    this._inputClear.classList.toggle('text-input__clear--visible', enabled);
    for (const [id, els] of this.rowEls.entries()) {
      if (!this.hiddenAlgos.has(id)) setRowActions(els, enabled);
    }
  },

  // ── Counter helpers ─────────────────────────────────────────────────────

  _updateCounter(text) {
    const chars = text.length;
    const fmt = this.getSelectedInputFormat();

    // Primary label: raw char count (always shown)
    this._counterChars.textContent = chars === 1 ? '1 char' : `${chars.toLocaleString()} chars`;

    // Secondary label: the bytes that get hashed (decoded ones for the structured formats; none for invalid input).
    if (isSurelyTooLarge(text, fmt)) {
      const bytes = MAX_TEXT_BYTES + 1;
      this._counterBytes.textContent = `${MAX_TEXT_BYTES.toLocaleString()}+ bytes`;
      this._counterNotes.set([TOO_LARGE_NOTE]);
      return bytes;
    }
    let bytes = 0;
    if (text && isValidInput(text, fmt)) {
      bytes = fmt === 'utf-8' ? Format.utf8ByteLength(text) : Format.textToBytes(text, fmt).length;
    }
    this._counterBytes.textContent = bytes === 1 ? '1 byte' : `${bytes.toLocaleString()} bytes`;

    // Things that silently change a hash (hidden characters, padding, a trailing newline in UTF-8
    // text; what is left out of, or read differently from, the other formats).
    const notes = inputNotes(text, fmt);
    if (bytes > MAX_TEXT_BYTES) notes.push(TOO_LARGE_NOTE);
    this._counterNotes.set(notes);
    return bytes;
  },

  /** Strip characters from `text` that are illegal for the given input format.
   *  Used by the drag-and-drop handler to sanitise dropped content.
   *  UTF-8 mode passes everything through unchanged. */
  _filterTextForFormat(text, inputFmt) {
    switch (inputFmt) {
      case 'hex':
        return text.replace(/[^0-9a-fA-F]/g, '');
      case 'base64':
        return text.replace(/[^A-Za-z0-9+/=]/g, '');
      case 'binary':
        return text.replace(/[^01 ]/g, '');
      default:
        return text; // utf-8: no filtering
    }
  },

  /** Takes characters the input format can't hold out of the field, keeping the caret where it was.
   *  The keydown filter can't see keys that soft keyboards report as "Unidentified", so whatever
   *  they type arrives here. */
  _dropIllegalChars() {
    const ta = this._input;
    const fmt = this.getSelectedInputFormat();
    const filtered = this._filterTextForFormat(ta.value, fmt);
    if (filtered === ta.value) return;
    const caret = this._filterTextForFormat(ta.value.slice(0, ta.selectionStart), fmt).length;
    ta.value = filtered;
    ta.setSelectionRange(caret, caret);
    Hint.show(this._formatHint, _FORMAT_HINTS[fmt]);
  },

  /** The first character typed elsewhere on the page (see components/type-to-focus.js).
   *  Goes through insertText so the input-format filter applies, then scrolls up to the
   *  input only if it isn't already on screen. */
  typeText(char) {
    const end = this._input.value.length;
    this._input.setSelectionRange(end, end);
    this.insertText(char, { focus: false });
    this._input.focus({ preventScroll: true });
    const { top, bottom } = this._input.getBoundingClientRect();
    if (top < 0 || bottom > window.innerHeight) {
      this._card.closest('.section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  /** Text pasted outside any field: appended at the end (the textarea may hold a
   *  stale caret), and the section brought into view since the hashes change there. */
  pasteText(raw) {
    const end = this._input.value.length;
    this._input.setSelectionRange(end, end);
    this.insertText(raw);
    this._card.closest('.section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  /** Insert `raw` at the caret (replacing any selection), filtered for the
   *  selected input format, and recompute. `replace` swaps the whole content for it instead. */
  insertText(raw, { focus = true, replace = false } = {}) {
    // Text arriving in a collapsed section (typed, pasted, dropped) opens it, so it is seen.
    expandSection(this._card.closest('.section'));
    const fmt = this.getSelectedInputFormat();
    const filtered = this._filterTextForFormat(raw, fmt);
    if (filtered.length < raw.length) Hint.show(this._formatHint, _FORMAT_HINTS[fmt]);

    const ta = this._input;
    const start = replace ? 0 : (ta.selectionStart ?? ta.value.length);
    const end = replace ? ta.value.length : (ta.selectionEnd ?? ta.value.length);
    ta.value = ta.value.slice(0, start) + filtered + ta.value.slice(end);
    ta.setSelectionRange(start + filtered.length, start + filtered.length);
    if (focus) ta.focus();

    clearTimeout(this._debounceTimer);
    this.onInput();
  },

  /** Puts `text` in the field for the selected input format, minus what that format can't hold
   *  (as typing and pasting would), without recomputing: a link may carry anything. */
  setText(text) {
    this._input.value = this._filterTextForFormat(text, this.getSelectedInputFormat());
  },

  /** Needed after setting the radio in code, which fires no change event. */
  refreshPlaceholder() {
    this._input.placeholder = _PLACEHOLDERS[this.getSelectedInputFormat()] ?? _PLACEHOLDERS['utf-8'];
  },

  async onInput() {
    const seq = ++this._inputSeq;
    const raw = this._input.value;
    const bytes = this._updateCounter(raw);

    if (!raw) {
      this.rawHexMap.clear();
      this._historyPending = false;
      clearTimeout(this._historyTimer);
      for (const { id } of _ALGORITHMS) {
        if (this.hiddenAlgos.has(id)) continue;
        const els = this.rowEls.get(id);
        setHashText(els.hash, 'awaiting input…');
        setHashEmpty(els.hash, true);
      }
      this._setAllActionsEnabled(false);
      return;
    }

    // Hash with all algorithms simultaneously.
    const inputFmt = this.getSelectedInputFormat();
    // Never hash a guess: input that isn't valid in its format would decode to other bytes.
    if (!isValidInput(raw, inputFmt)) {
      this._showNoDigests('invalid input');
      return;
    }
    if (bytes > MAX_TEXT_BYTES) {
      this._showNoDigests('too large');
      return;
    }
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

    const fmt = this.getSelectedFormat();
    this._currentBatchId = History.nextBatch();
    // Taken from `raw`, not the field, which may have moved on while hashing. Kept for the
    // algorithms toggled on later, which hash the same input in a batch of their own.
    this._sourceDescription = textPreview(raw, inputFmt);
    for (const { id } of _ALGORITHMS) {
      if (this.hiddenAlgos.has(id)) continue;
      const hash = Format.applyFormat(this.rawHexMap.get(id), fmt);
      const els = this.rowEls.get(id);
      setHashText(els.hash, hash);
      setHashEmpty(els.hash, false);
    }
    this._setAllActionsEnabled(true);
    this._queueHistory();
  },

  /** The visible rows have no digests (`message` says why: WebAssembly missing, input invalid…): say so where they would be. */
  _showNoDigests(message) {
    this.rawHexMap.clear();
    this._historyPending = false;
    clearTimeout(this._historyTimer);
    for (const { id } of _ALGORITHMS) {
      if (this.hiddenAlgos.has(id)) continue;
      const els = this.rowEls.get(id);
      setHashText(els.hash, message);
      setHashEmpty(els.hash, true);
    }
    this._setAllActionsEnabled(false);
  },

  onClear({ focus = true } = {}) {
    // Whatever was typed and is still waiting for the history goes in before it is cleared.
    this._flushHistory();
    clearTimeout(this._debounceTimer);
    this._input.value = '';
    this.onInput();
    if (focus) this._input.focus();
  },

  _onDownload(algoId) {
    const hash = this._formattedHash(algoId);
    if (!hash) return;
    downloadDigest(hash, algoId, '', _APP_CONFIG);
    const btn = this.rowEls.get(algoId).download;
    Tooltip.flash(btn);
    Checkmark.flash(btn);
  },

  async _onCopy(algoId) {
    const hash = this._formattedHash(algoId);
    if (!hash) return;
    await copyWithFeedback(hash, { button: this.rowEls.get(algoId).copy });
  },
};
