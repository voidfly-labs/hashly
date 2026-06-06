import { Format } from '@core/utils/format.js';
import { Download } from '@core/utils/download.js';
import { Clipboard } from '@core/utils/clipboard.js';
import { Hint } from '@core/components/hint.js';
import { Tooltip } from '@core/components/tooltip.js';
import { History } from '@core/components/history.js';

let _APP_CONFIG, _ALGORITHMS, _Hasher;

const _FORMAT_HINTS = {
  hex: 'hex only · 0–9, a–f',
  base64: 'base64 only · a–z, 0–9, +/=',
  binary: 'binary only · 0, 1, <space>',
};

export const TextSection = {
  // rawHexMap: Map<algoId, hex> — the unformatted digests for the current input.
  rawHexMap: new Map(),
  // rowEls: Map<algoId, { hash, download, copy }> — live DOM references.
  rowEls: new Map(),
  disabledAlgos: new Set(),
  // Shared batchId for all algorithms in the current computation.
  _currentBatchId: null,

  // ── Debounced input handler ────────────────────────────────────────────
  // Debouncing prevents stale-result races when fromTextAll resolves
  // out of order on rapid typing, and avoids redundant WASM calls.
  _debounceTimer: null,

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
    this._formatHint = document.getElementById('textFormatHint');

    // Build one result row per algorithm (least to most complex = ALGORITHMS order).
    _ALGORITHMS.forEach(({ id }) => this._buildRow(id));
    // Sync button icon with initial disabledAlgos state.
    this._updateToggleAllBtn();

    this._updateCounter('');

    this._input.addEventListener('input', () => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this.onInput(), 20);
    });

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
    const placeholders = {
      'utf-8': 'Start typing or paste text…',
      hex: 'Start typing or paste hex…',
      base64: 'Start typing or paste Base64…',
      binary: 'Start typing or paste binary…',
    };
    document.querySelectorAll('input[name="textInputFormat"]').forEach((radio) =>
      radio.addEventListener('change', () => {
        this.onClear();
        this._input.placeholder = placeholders[radio.value] ?? placeholders['utf-8'];
      }),
    );

    // Inline ✕ button in the textarea corner — mirrors file-drop__clear behaviour.
    this._inputClear.addEventListener('click', () => this.onClear());

    // ── Text drag-and-drop ─────────────────────────────────────────────
    // Accept text/plain snippets dragged from other windows/documents.
    // The card (not just the textarea) is the drop target for a larger
    // hit area, mirroring the file-drop zone pattern. Only text drags are
    // handled; file drags are intentionally ignored so they still route to
    // the File section's drop zone.
    this._card = this._input.closest('.card');

    // ── Page-wide text drag highlight ──────────────────────────────────
    // Mirrors FileSection's _dragDepth pattern exactly: document-level
    // dragenter/dragleave light up the text card whenever ANY text/plain
    // drag enters the browser window, regardless of where it lands.
    // Only text drags are handled; Files drags route to the File section.
    let _textDragDepth = 0;

    const _hasTextOnly = (dt) => dt?.types?.includes('text/plain') && !dt?.types?.includes('Files');

    document.addEventListener('dragenter', (e) => {
      if (!_hasTextOnly(e.dataTransfer)) return;
      _textDragDepth++;
      if (_textDragDepth === 1) {
        this._card.classList.add('card--text-drag');
        // Scroll the text card into view so users can see where to drop,
        // mirroring FileSection's drop-zone scroll-into-view behaviour.
        this._card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    document.addEventListener('dragleave', (e) => {
      if (!_hasTextOnly(e.dataTransfer)) return;
      _textDragDepth--;
      if (_textDragDepth === 0) this._card.classList.remove('card--text-drag');
    });

    document.addEventListener('dragover', (e) => {
      // Required to allow drops anywhere on the page for text drags
      if (_hasTextOnly(e.dataTransfer)) e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      if (!_hasTextOnly(e.dataTransfer)) return;
      // Reset page-drag state unconditionally (mirrors FileSection)
      _textDragDepth = 0;
      this._card.classList.remove('card--text-drag');
      // If the drop landed inside the card, the card's own handler already
      // processed it (and called stopPropagation) — nothing left to do.
      if (this._card.contains(e.target)) return;
      // Drop landed outside the card: extract text and append to textarea.
      e.preventDefault();
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const inputFmt = this.getSelectedInputFormat();
      const filtered = this._filterTextForFormat(raw, inputFmt);
      this._input.value += filtered;
      this._input.focus();
      clearTimeout(this._debounceTimer);
      this.onInput();
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
      _textDragDepth = 0;
      this._card.classList.remove('card--text-drag');

      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;

      const inputFmt = this.getSelectedInputFormat();
      const filtered = this._filterTextForFormat(raw, inputFmt);

      // Insert at caret position if the textarea has a selection/cursor,
      // otherwise append to end.
      const ta = this._input;
      const start = ta.selectionStart ?? ta.value.length;
      const end = ta.selectionEnd ?? ta.value.length;
      ta.value = ta.value.slice(0, start) + filtered + ta.value.slice(end);
      const newPos = start + filtered.length;
      ta.setSelectionRange(newPos, newPos);
      ta.focus();

      clearTimeout(this._debounceTimer);
      this.onInput();
    });

    document
      .querySelectorAll('input[name="textFormat"]')
      .forEach((radio) => radio.addEventListener('change', () => this._reformatAll()));
  },

  // ── DOM helpers ────────────────────────────────────────────────────────

  /** Build a result row for one algorithm and append it to the container. */
  _buildRow(algoId) {
    const safeId = algoId.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const tipText = () => (this.disabledAlgos.has(algoId) ? 'Enable' : 'Disable');

    const row = document.createElement('div');
    row.className = 'result';
    row.dataset.algo = algoId;
    row.innerHTML = `
          <span class="algo-badge" data-algo="${algoId}" tabindex="0" role="switch" aria-checked="true" aria-label="${algoId}">${algoId}</span>
          <span class="result__hash result__hash--empty" id="textHash-${safeId}">awaiting input…<span class="tooltip">Copied!</span></span>
          <div class="result__actions">
            <button class="btn" id="textDownload-${safeId}" disabled aria-label="Download ${algoId} hash as text file">
              <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              Download<span class="tooltip">Exported</span>
            </button>
            <button class="btn" id="textCopy-${safeId}" disabled aria-label="Copy ${algoId} hash to clipboard">
              <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
              Copy<span class="tooltip">Copied!</span>
            </button>
          </div>`;

    this._resultsEl.appendChild(row);

    const els = {
      hash: row.querySelector(`#textHash-${safeId}`),
      download: row.querySelector(`#textDownload-${safeId}`),
      copy: row.querySelector(`#textCopy-${safeId}`),
    };

    this.rowEls.set(algoId, els);

    const badge = row.querySelector('.algo-badge');
    badge.addEventListener('mouseenter', () => Tooltip.show(badge, tipText()));
    badge.addEventListener('mouseleave', () => Tooltip.hide());
    badge.addEventListener('focus', () => Tooltip.show(badge, tipText()));
    badge.addEventListener('blur', () => Tooltip.hide());
    badge.addEventListener('click', () => this._toggleAlgo(algoId, { refreshTooltip: true }));
    badge.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._toggleAlgo(algoId, { refreshTooltip: true });
      }
    });

    // Apply initial disabled state if set before _buildRow is called.
    if (this.disabledAlgos.has(algoId)) {
      badge.classList.add('algo-badge--disabled');
      row.classList.add('result--disabled');
      badge.setAttribute('aria-checked', 'false');
      this._setHashText(els, 'disabled');
    }

    // Wire actions — each row is independent.
    els.download.addEventListener('click', () => this._onDownload(algoId));
    els.copy.addEventListener('click', () => this._onCopy(algoId));
    els.hash.addEventListener('click', () => {
      const hash = this._formattedHash(algoId);
      if (!hash) return;
      Clipboard.copy(hash);
      Tooltip.flash(els.hash);
    });
  },

  _toggleAll({ refreshTooltip = false } = {}) {
    const allEnabled = _ALGORITHMS.every((a) => !this.disabledAlgos.has(a.id));

    _ALGORITHMS.forEach(({ id }) => {
      const row = this._resultsEl.querySelector(`.result[data-algo="${id}"]`);
      const badge = row?.querySelector('.algo-badge');
      const els = this.rowEls.get(id);
      if (!row || !badge || !els) return;

      if (allEnabled) {
        // Disable all — update DOM state without triggering onInput per algo
        this.disabledAlgos.add(id);
        badge.classList.add('algo-badge--disabled');
        row.classList.add('result--disabled');
        badge.setAttribute('aria-checked', 'false');
        this._setHashText(els, 'disabled');
        els.hash.classList.add('result__hash--empty');
        [els.download, els.copy].forEach((btn) => {
          btn.disabled = true;
        });
      } else if (this.disabledAlgos.has(id)) {
        // Enable — restore from rawHexMap if available, otherwise let onInput() fill it
        this.disabledAlgos.delete(id);
        badge.classList.remove('algo-badge--disabled');
        row.classList.remove('result--disabled');
        badge.setAttribute('aria-checked', 'true');
      }
    });

    // Single onInput() call covers all newly enabled algorithms at once.
    if (!allEnabled) {
      clearTimeout(this._debounceTimer);
      this.onInput();
    }

    this._updateToggleAllBtn();
    if (!refreshTooltip) return;
    const textBtn = document.getElementById('textToggleAllBtn');
    if (!textBtn) return;
    const nowAllEnabled = _ALGORITHMS.every((a) => !this.disabledAlgos.has(a.id));
    Tooltip.show(textBtn, nowAllEnabled ? 'Disable all' : 'Enable all');
  },

  _updateToggleAllBtn() {
    const btn = document.getElementById('textToggleAllBtn');
    if (!btn) return;
    const allEnabled = _ALGORITHMS.every((a) => !this.disabledAlgos.has(a.id));
    const allDisabled = _ALGORITHMS.every((a) => this.disabledAlgos.has(a.id));
    const iconChecked =
      '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>';
    const iconIndeterminate =
      '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z"/>';
    const iconUnchecked =
      '<path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>';
    let icon;
    if (allEnabled) icon = iconChecked;
    else if (allDisabled) icon = iconUnchecked;
    else icon = iconIndeterminate;
    btn.querySelector('svg').innerHTML = icon;
    btn.setAttribute('aria-label', allEnabled ? 'Disable all text algorithms' : 'Enable all text algorithms');
  },

  _toggleAlgo(algoId, { refreshTooltip = false } = {}) {
    const row = this._resultsEl.querySelector(`.result[data-algo="${algoId}"]`);
    const badge = row.querySelector('.algo-badge');
    if (this.disabledAlgos.has(algoId)) {
      this.disabledAlgos.delete(algoId);
      badge.classList.remove('algo-badge--disabled');
      row.classList.remove('result--disabled');
      badge.setAttribute('aria-checked', 'true');
      // Re-hash with current input if any
      clearTimeout(this._debounceTimer);
      this.onInput();
    } else {
      this.disabledAlgos.add(algoId);
      badge.classList.add('algo-badge--disabled');
      row.classList.add('result--disabled');
      badge.setAttribute('aria-checked', 'false');
      const els = this.rowEls.get(algoId);
      this._setHashText(els, 'disabled');
      els.hash.classList.add('result__hash--empty');
      [els.download, els.copy].forEach((btn) => {
        btn.disabled = true;
      });
    }
    // Refresh the tooltip to reflect the new state while it may still be visible —
    // only for a direct click on this badge, not when driven by AlgoSpotlight.
    if (refreshTooltip) {
      const nowDisabled = this.disabledAlgos.has(algoId);
      Tooltip.show(badge, nowDisabled ? 'Enable' : 'Disable');
    }
    this._updateToggleAllBtn();
  },

  // ── Hash text helpers ──────────────────────────────────────────────────

  /** Preserve the child .tooltip span when replacing text content. */
  _setHashText(els, text) {
    const tip = els.hash.querySelector('.tooltip');
    els.hash.textContent = text;
    if (tip) els.hash.appendChild(tip);
  },

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
      if (this.disabledAlgos.has(id)) continue;
      const hex = this.rawHexMap.get(id);
      if (!hex) continue;
      const els = this.rowEls.get(id);
      const hash = Format.applyFormat(hex, this.getSelectedFormat());
      this._setHashText(els, hash);
      // Reuse the existing batchId so format changes don't create new history
      // batches — the batch identity belongs to the computation, not the format.
      History.record('text', hash, id, this._currentBatchId);
    }
  },

  _setAllActionsEnabled(enabled) {
    // The inline ✕ button shows/hides like file-drop__clear rather than
    // using a disabled state — it has no meaningful "empty" affordance.
    this._inputClear.classList.toggle('text-input__clear--visible', enabled);
    for (const [id, els] of this.rowEls.entries()) {
      if (this.disabledAlgos.has(id)) continue;
      [els.download, els.copy].forEach((btn) => {
        btn.disabled = !enabled;
      });
    }
  },

  // ── Counter helpers ─────────────────────────────────────────────────────

  _updateCounter(text) {
    const chars = text.length;
    const fmt = this.getSelectedInputFormat();

    // Primary label: raw char count (always shown)
    this._counterChars.textContent = chars === 1 ? '1 char' : `${chars.toLocaleString()} chars`;

    // Secondary label: decoded bytes for structured formats, UTF-8 bytes otherwise
    let bytes;
    if (!text) {
      bytes = 0;
    } else {
      switch (fmt) {
        case 'hex':
          bytes = Math.ceil(text.replace(/\s+/g, '').length / 2);
          break;
        case 'base64': {
          // eslint-disable-next-line sonarjs/slow-regex
          const stripped = text.replace(/[^A-Za-z0-9+/=]/g, '').replace(/=+$/, '');
          bytes = Math.ceil((stripped.length * 3) / 4);
          break;
        }
        case 'binary':
          bytes = text
            .trim()
            .split(/\s+/)
            .filter((g) => g.length > 0).length;
          break;
        default:
          bytes = Format.utf8ByteLength(text);
      }
    }
    this._counterBytes.textContent = bytes === 1 ? '1 byte' : `${bytes.toLocaleString()} bytes`;
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

  async onInput() {
    const raw = this._input.value;
    this._updateCounter(raw);

    if (!raw) {
      this.rawHexMap.clear();
      for (const { id } of _ALGORITHMS) {
        if (this.disabledAlgos.has(id)) continue;
        const els = this.rowEls.get(id);
        this._setHashText(els, 'awaiting input…');
        els.hash.classList.add('result__hash--empty');
      }
      this._setAllActionsEnabled(false);
      return;
    }

    // Hash with all algorithms simultaneously.
    const inputFmt = this.getSelectedInputFormat();
    this.rawHexMap = await _Hasher.fromTextAll(raw, inputFmt);

    const fmt = this.getSelectedFormat();
    this._currentBatchId = History.nextBatch();
    for (const { id } of _ALGORITHMS) {
      if (this.disabledAlgos.has(id)) continue;
      const hex = this.rawHexMap.get(id);
      const hash = Format.applyFormat(hex, fmt);
      const els = this.rowEls.get(id);
      this._setHashText(els, hash);
      els.hash.classList.remove('result__hash--empty');
      History.record('text', hash, id, this._currentBatchId);
    }
    this._setAllActionsEnabled(true);
  },

  onClear() {
    clearTimeout(this._debounceTimer);
    this._input.value = '';
    this.onInput();
    this._input.focus();
  },

  _onDownload(algoId) {
    const hash = this._formattedHash(algoId);
    if (!hash) return;
    const filename = `${_APP_CONFIG.appName}-${_APP_CONFIG.fileNoun}_${Download.filenameSafeTimestamp()}.${_APP_CONFIG.slugify(algoId)}`;
    Download.trigger(hash, filename);
    Tooltip.flash(this.rowEls.get(algoId).download);
  },

  async _onCopy(algoId) {
    const hash = this._formattedHash(algoId);
    if (!hash) return;
    await Clipboard.copy(hash);
    Tooltip.flash(this.rowEls.get(algoId).copy);
  },
};
