'use strict';

// -------------------------------------------------------------------------
// Format utilities
// -------------------------------------------------------------------------
const _encoder = new TextEncoder();

const Format = {
  base64ToBytes(b64) {
    // Normalise padding so partially-typed input never throws.
    // Strip existing padding, re-pad to the next multiple of 4.
    // A try/catch covers the length % 4 === 1 residue, which is
    // structurally invalid and cannot be salvaged by padding alone.
    const stripped = b64.replace(/=+$/, '');
    const padded = stripped + '==='.slice((stripped.length + 3) % 4);
    try {
      const bin = atob(padded);
      return new Uint8Array(bin.length).map((_, i) => bin.charCodeAt(i));
    } catch {
      return new Uint8Array(0);
    }
  },

  hexToBytes(hex) {
    const clean = hex.replace(/\s+/g, '');
    const arr = new Uint8Array(clean.length / 2);
    for (let i = 0; i < arr.length; i++) arr[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    return arr;
  },

  binaryToBytes(bin) {
    // Accept groups of 8 bits, optionally space-separated
    const groups = bin.trim().split(/\s+/);
    return new Uint8Array(groups.map((g) => parseInt(g, 2)));
  },

  /** Convert user text to bytes according to the selected input format. */
  textToBytes(text, inputFmt) {
    switch (inputFmt) {
      case 'hex':
        return this.hexToBytes(text);
      case 'base64':
        return this.base64ToBytes(text);
      case 'binary':
        return this.binaryToBytes(text);
      default:
        return _encoder.encode(text); // utf-8
    }
  },

  hexToBase64(hex) {
    const bytes = hex.match(/.{2}/g).map((byte) => parseInt(byte, 16));
    return btoa(String.fromCharCode(...bytes));
  },

  hexToBinary(hex) {
    return hex
      .match(/.{2}/g)
      .map((byte) => parseInt(byte, 16).toString(2).padStart(8, '0'))
      .join(' ');
  },

  applyFormat(hex, format) {
    switch (format) {
      case 'hex-upper':
        return hex.toUpperCase();
      case 'base64':
        return this.hexToBase64(hex);
      case 'binary':
        return this.hexToBinary(hex);
      default:
        return hex;
    }
  },
};

// -------------------------------------------------------------------------
// Download utilities
// -------------------------------------------------------------------------
const Download = {
  filenameSafeTimestamp() {
    const d = new Date();
    const pad = (v) => String(v).padStart(2, '0');
    const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `${date}-${time}`;
  },

  // mimeType defaults to application/octet-stream so the browser treats the
  // file as arbitrary data and uses the filename's extension as-is, rather
  // than mapping text/plain → .txt and overriding the intended extension.
  trigger(content, filename, mimeType = 'application/octet-stream') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};

// -------------------------------------------------------------------------
// Clipboard utility
// -------------------------------------------------------------------------
const Clipboard = {
  async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  },
};

// -------------------------------------------------------------------------
// Tooltip utility — singleton <div> appended to <body> so it escapes all
// stacking contexts (including transformed ancestors like the history popover).
// All .tooltip spans in markup are kept for semantic grouping but are hidden;
// only the singleton is ever visible.
// -------------------------------------------------------------------------
const Tooltip = (() => {
  let el = null; // singleton DOM node
  let hideTimer = null;
  let lastPointerType = 'mouse';

  document.addEventListener('pointerdown', (e) => {
    lastPointerType = e.pointerType;
  });

  function _ensureEl() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'tooltip-singleton';
    document.body.appendChild(el);
  }

  function _position(anchorElement) {
    const rect = anchorElement.getBoundingClientRect();
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top}px`;
  }

  return {
    flash(anchorElement, text) {
      _ensureEl();

      // Derive label: passed explicitly, or from the child .tooltip span's text
      const label = text ?? anchorElement.querySelector('.tooltip')?.textContent ?? 'Copied!';

      el.textContent = label;
      el.classList.remove('tooltip-singleton--visible');

      // Force a reflow so the transition fires even if already visible
      void el.offsetWidth;

      _position(anchorElement);
      el.classList.add('tooltip-singleton--visible');

      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => el.classList.remove('tooltip-singleton--visible'), 1400);
    },

    /** Show a persistent tooltip above anchorElement until hide() is called.
     *  On touch/pen input the tooltip auto-dismisses after 1400 ms so it
     *  doesn't linger with no hover-leave to clear it. */
    show(anchorElement, text) {
      _ensureEl();
      clearTimeout(hideTimer);
      el.textContent = text;
      el.classList.remove('tooltip-singleton--visible');
      void el.offsetWidth;
      _position(anchorElement);
      el.classList.add('tooltip-singleton--visible');
      if (lastPointerType !== 'mouse') {
        hideTimer = setTimeout(() => el.classList.remove('tooltip-singleton--visible'), 1400);
      }
    },

    hide() {
      if (el) el.classList.remove('tooltip-singleton--visible');
    },
  };
})();

// -------------------------------------------------------------------------
// Theme (light / dark)
// -------------------------------------------------------------------------
const Theme = {
  STORAGE_KEY: APP_CONFIG.appName + '-theme',

  defaultByTime() {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 21 ? 'light' : 'dark';
  },

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const theme = saved || this.defaultByTime();

    document.documentElement.setAttribute('data-theme', theme);

    document.getElementById('themeToggle').addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(this.STORAGE_KEY, next);
    });
  },
};

// -------------------------------------------------------------------------
// Text section
// -------------------------------------------------------------------------
const TextSection = {
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

  init() {
    this._input = document.getElementById('textInput');
    this._inputClear = document.getElementById('textInputClear');
    this._resultsEl = document.getElementById('textResults');
    this._counter = document.getElementById('textCounter');
    this._counterChars = document.getElementById('textCounterChars');
    this._counterBytes = document.getElementById('textCounterBytes');

    // Build one result row per algorithm (least to most complex = ALGORITHMS order).
    ALGORITHMS.forEach(({ id }) => this._buildRow(id));
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
      if (!valid) e.preventDefault();
    });

    // Switching input format clears the textarea (stale content in the old
    // encoding would produce a meaningless hash in the new one).
    document.querySelectorAll('input[name="textInputFormat"]').forEach((radio) =>
      radio.addEventListener('change', () => {
        this.onClear();
        // Placeholder stays constant; format is communicated by the Input label chip
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
    const tipText = () => (this.disabledAlgos.has(algoId) ? 'Select' : 'Deselect');

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
    badge.addEventListener('click', () => this._toggleAlgo(algoId));
    badge.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._toggleAlgo(algoId);
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

  _toggleAll() {
    const allSelected = ALGORITHMS.every((a) => !this.disabledAlgos.has(a.id));

    ALGORITHMS.forEach(({ id }) => {
      const row = this._resultsEl.querySelector(`.result[data-algo="${id}"]`);
      const badge = row?.querySelector('.algo-badge');
      const els = this.rowEls.get(id);
      if (!row || !badge || !els) return;

      if (allSelected) {
        // Deselect all — update DOM state without triggering onInput per algo
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
        // Select — restore from rawHexMap if available, otherwise let onInput() fill it
        this.disabledAlgos.delete(id);
        badge.classList.remove('algo-badge--disabled');
        row.classList.remove('result--disabled');
        badge.setAttribute('aria-checked', 'true');
      }
    });

    // Single onInput() call covers all newly selected algorithms at once.
    if (!allSelected) {
      clearTimeout(this._debounceTimer);
      this.onInput();
    }

    this._updateToggleAllBtn();
    const textBtn = document.getElementById('textToggleAllBtn');
    if (textBtn) {
      const nowAllSelected = ALGORITHMS.every((a) => !this.disabledAlgos.has(a.id));
      Tooltip.show(textBtn, nowAllSelected ? 'Deselect all' : 'Select all');
    }
  },

  _updateToggleAllBtn() {
    const btn = document.getElementById('textToggleAllBtn');
    if (!btn) return;
    const allSelected = ALGORITHMS.every((a) => !this.disabledAlgos.has(a.id));
    const allDeselected = ALGORITHMS.every((a) => this.disabledAlgos.has(a.id));
    const iconChecked =
      '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>';
    const iconIndeterminate =
      '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z"/>';
    const iconUnchecked =
      '<path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>';
    const icon = allSelected ? iconChecked : allDeselected ? iconUnchecked : iconIndeterminate;
    btn.querySelector('svg').innerHTML = icon;
    btn.setAttribute('aria-label', allSelected ? 'Deselect all text algorithms' : 'Select all text algorithms');
  },

  _toggleAlgo(algoId) {
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
    // Refresh the tooltip to reflect the new state while it may still be visible.
    const nowDisabled = this.disabledAlgos.has(algoId);
    Tooltip.show(badge, nowDisabled ? 'Select' : 'Deselect');
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
    for (const { id } of ALGORITHMS) {
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

  // ── Event handlers ─────────────────────────────────────────────────────

  // ── Counter helpers ────────────────────────────────────────────────────────────────────────────

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
          bytes = _encoder.encode(text).byteLength;
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
      for (const { id } of ALGORITHMS) {
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
    this.rawHexMap = await Hasher.fromTextAll(raw, inputFmt);

    const fmt = this.getSelectedFormat();
    this._currentBatchId = History.nextBatch();
    for (const { id } of ALGORITHMS) {
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
    const filename = `${APP_CONFIG.appName}-${APP_CONFIG.fileNoun}_${Download.filenameSafeTimestamp()}.${APP_CONFIG.slugify(algoId)}`;
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

// -------------------------------------------------------------------------
// File section
// -------------------------------------------------------------------------
const FileSection = {
  // rawHexMap: Map<algoId, hex>
  rawHexMap: new Map(),
  // rowEls: Map<algoId, { hash, download, copy }>
  rowEls: new Map(),
  disabledAlgos: new Set(APP_CONFIG.defaultDisabledAlgos ?? []),
  currentFileName: '',
  // Shared batchId for all algorithms in the current file computation.
  _currentBatchId: null,

  init() {
    this._drop = document.getElementById('fileDrop');
    this._input = document.getElementById('fileInput');
    this._dropClear = document.getElementById('fileDropClear');
    this._fileName = document.getElementById('fileName');
    this._fileNameText = document.getElementById('fileNameText');
    this._fileSize = document.getElementById('fileSize');
    this._resultsEl = document.getElementById('fileResults');

    // Build one result row per algorithm.
    ALGORITHMS.forEach(({ id }) => this._buildRow(id));
    // Sync button icon with initial disabledAlgos state.
    this._updateToggleAllBtn();

    this._input.addEventListener('change', (e) => {
      if (e.target.files.length) {
        const file = e.target.files[0];
        e.target.value = '';
        this.processFile(file);
      }
    });

    this._drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      this._drop.classList.add('file-drop--active');
    });

    this._drop.addEventListener('dragleave', () => {
      this._drop.classList.remove('file-drop--active');
    });

    this._drop.addEventListener('drop', (e) => {
      e.preventDefault();
      this._drop.classList.remove('file-drop--active');
      const file = e.dataTransfer.files[0];
      if (file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        this._input.files = dt.files;
        this.processFile(file);
      }
    });

    // ── Whole-page drag indicator ──────────────────────────────────────
    // Highlights the drop zone whenever a file is dragged anywhere over
    // the browser window, not just directly over the zone itself.
    // An enter-counter prevents the flicker that occurs when dragleave
    // fires as the cursor moves between child elements of the document.
    let _dragDepth = 0;

    document.addEventListener('dragenter', (e) => {
      // Only react to file drags, not text selections or other drag types
      if (!e.dataTransfer?.types?.includes('Files')) return;
      _dragDepth++;
      if (_dragDepth === 1) {
        this._drop.classList.add('file-drop--page-drag');
        // Scroll the drop zone into view so users can see where to drop
        this._drop.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    document.addEventListener('dragleave', (e) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      _dragDepth--;
      if (_dragDepth === 0) {
        this._drop.classList.remove('file-drop--page-drag');
      }
    });

    document.addEventListener('dragover', (e) => {
      // Required to allow drop on the document in all browsers
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      // Always prevent the browser from navigating to the dropped file
      e.preventDefault();
      // Reset counter and page-drag highlight unconditionally
      _dragDepth = 0;
      this._drop.classList.remove('file-drop--page-drag');
      // If the drop landed inside the zone itself, the zone's own handler
      // already processed the file — don't process it a second time.
      if (this._drop.contains(e.target)) return;
      // Drop landed outside the zone: extract the file and process it.
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        this._input.files = dt.files;
        this.processFile(file);
      }
    });

    this._dropClear.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onClear();
    });

    // Esc clears the file input when a file is loaded and the drop
    // zone (file input) is focused — mirrors TextSection's Esc behaviour.
    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentFileName) {
        e.preventDefault();
        this.onClear();
      }
    });

    document
      .querySelectorAll('input[name="fileFormat"]')
      .forEach((radio) => radio.addEventListener('change', () => this._reformatAll(true)));
  },

  // ── DOM helpers ────────────────────────────────────────────────────────

  _buildRow(algoId) {
    const safeId = algoId.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const tipText = () => (this.disabledAlgos.has(algoId) ? 'Select' : 'Deselect');

    const row = document.createElement('div');
    row.className = 'result';
    row.dataset.algo = algoId;
    row.innerHTML = `
          <span class="algo-badge" data-algo="${algoId}" tabindex="0" role="switch" aria-checked="true" aria-label="${algoId}">${algoId}</span>
          <span class="result__hash result__hash--empty" id="fileHash-${safeId}">no file selected<span class="tooltip">Copied!</span></span>
          <div class="result__actions">
            <button class="btn" id="fileDownload-${safeId}" disabled aria-label="Download ${algoId} hash as text file">
              <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              Download<span class="tooltip">Exported</span>
            </button>
            <button class="btn" id="fileCopy-${safeId}" disabled aria-label="Copy ${algoId} hash to clipboard">
              <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
              Copy<span class="tooltip">Copied!</span>
            </button>
          </div>`;

    this._resultsEl.appendChild(row);

    const els = {
      hash: row.querySelector(`#fileHash-${safeId}`),
      download: row.querySelector(`#fileDownload-${safeId}`),
      copy: row.querySelector(`#fileCopy-${safeId}`),
    };

    this.rowEls.set(algoId, els);

    // Badge hover tooltip — same pattern as TextSection._buildRow.
    const badge = row.querySelector('.algo-badge');
    badge.addEventListener('mouseenter', () => Tooltip.show(badge, tipText()));
    badge.addEventListener('mouseleave', () => Tooltip.hide());
    badge.addEventListener('focus', () => Tooltip.show(badge, tipText()));
    badge.addEventListener('blur', () => Tooltip.hide());
    badge.addEventListener('click', () => this._toggleAlgo(algoId));
    badge.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._toggleAlgo(algoId);
      }
    });

    // Apply initial disabled state if set before _buildRow is called.
    if (this.disabledAlgos.has(algoId)) {
      badge.classList.add('algo-badge--disabled');
      row.classList.add('result--disabled');
      badge.setAttribute('aria-checked', 'false');
      this._setHashText(els, 'disabled');
    }

    els.download.addEventListener('click', () => this._onDownload(algoId));
    els.copy.addEventListener('click', () => this._onCopy(algoId));
    els.hash.addEventListener('click', () => {
      const hash = this._formattedHash(algoId);
      if (!hash) return;
      Clipboard.copy(hash);
      Tooltip.flash(els.hash);
    });
  },

  _toggleAll() {
    const allSelected = ALGORITHMS.every((a) => !this.disabledAlgos.has(a.id));

    ALGORITHMS.forEach(({ id }) => {
      const row = this._resultsEl.querySelector(`.result[data-algo="${id}"]`);
      const badge = row?.querySelector('.algo-badge');
      const els = this.rowEls.get(id);
      if (!row || !badge || !els) return;

      if (allSelected) {
        // Deselect all
        this.disabledAlgos.add(id);
        badge.classList.add('algo-badge--disabled');
        row.classList.add('result--disabled');
        badge.setAttribute('aria-checked', 'false');
        this._clearComputingState(els);
        this._setHashText(els, 'disabled');
        els.hash.classList.add('result__hash--empty');
        [els.download, els.copy].forEach((btn) => {
          btn.disabled = true;
        });
      } else if (this.disabledAlgos.has(id)) {
        // Select — restore existing hash from rawHexMap if available
        this.disabledAlgos.delete(id);
        badge.classList.remove('algo-badge--disabled');
        row.classList.remove('result--disabled');
        badge.setAttribute('aria-checked', 'true');
        const existingHash = this._formattedHash(id);
        if (existingHash) {
          this._setHashText(els, existingHash);
          els.hash.classList.remove('result__hash--empty');
          els.download.disabled = false;
          els.copy.disabled = false;
        } else {
          this._setHashText(els, 'no file selected');
          els.hash.classList.add('result__hash--empty');
        }
      }
    });

    this._updateToggleAllBtn();
    const fileBtn = document.getElementById('fileToggleAllBtn');
    if (fileBtn) {
      const nowAllSelected = ALGORITHMS.every((a) => !this.disabledAlgos.has(a.id));
      Tooltip.show(fileBtn, nowAllSelected ? 'Deselect all' : 'Select all');
    }
  },

  _updateToggleAllBtn() {
    const btn = document.getElementById('fileToggleAllBtn');
    if (!btn) return;
    const allSelected = ALGORITHMS.every((a) => !this.disabledAlgos.has(a.id));
    const allDeselected = ALGORITHMS.every((a) => this.disabledAlgos.has(a.id));
    const iconChecked =
      '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>';
    const iconIndeterminate =
      '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z"/>';
    const iconUnchecked =
      '<path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>';
    const icon = allSelected ? iconChecked : allDeselected ? iconUnchecked : iconIndeterminate;
    btn.querySelector('svg').innerHTML = icon;
    btn.setAttribute('aria-label', allSelected ? 'Deselect all file algorithms' : 'Select all file algorithms');
  },

  _toggleAlgo(algoId) {
    const row = this._resultsEl.querySelector(`.result[data-algo="${algoId}"]`);
    const badge = row.querySelector('.algo-badge');
    const els = this.rowEls.get(algoId);
    if (this.disabledAlgos.has(algoId)) {
      this.disabledAlgos.delete(algoId);
      badge.classList.remove('algo-badge--disabled');
      row.classList.remove('result--disabled');
      badge.setAttribute('aria-checked', 'true');
      // Restore previously computed hash if available, otherwise show empty state.
      const existingHash = this._formattedHash(algoId);
      if (existingHash) {
        this._setHashText(els, existingHash);
        els.hash.classList.remove('result__hash--empty');
        els.download.disabled = false;
        els.copy.disabled = false;
      } else {
        this._setHashText(els, 'no file selected');
        els.hash.classList.add('result__hash--empty');
      }
    } else {
      this.disabledAlgos.add(algoId);
      badge.classList.add('algo-badge--disabled');
      row.classList.add('result--disabled');
      badge.setAttribute('aria-checked', 'false');
      this._clearComputingState(els);
      this._setHashText(els, 'disabled');
      els.hash.classList.add('result__hash--empty');
      [els.download, els.copy].forEach((btn) => {
        btn.disabled = true;
      });
    }
    // Refresh the tooltip to reflect the new state while it may still be visible.
    const nowDisabled = this.disabledAlgos.has(algoId);
    Tooltip.show(badge, nowDisabled ? 'Select' : 'Deselect');
    this._updateToggleAllBtn();
  },

  // ── Hash helpers ───────────────────────────────────────────────────────

  /** Preserve the child .tooltip span when replacing text content. */
  _setHashText(els, text) {
    const tip = els.hash.querySelector('.tooltip');
    els.hash.textContent = text;
    if (tip) els.hash.appendChild(tip);
  },

  /** Enter computing state: hash cell becomes a left-to-right progress bar.
   *  ratio is in [0, 1]. */
  _setComputingState(els, ratio) {
    const pct = (ratio * 100).toFixed(1);
    els.hash.style.setProperty('--progress', pct);
    els.hash.textContent = `${pct}%`;
    els.hash.classList.add('result__hash--computing');
    els.hash.classList.remove('result__hash--empty');
  },

  /** Exit computing state: remove progress bar styling. */
  _clearComputingState(els) {
    els.hash.classList.remove('result__hash--computing');
    els.hash.style.removeProperty('--progress');
  },

  getSelectedFormat() {
    return document.querySelector('input[name="fileFormat"]:checked').value;
  },

  _formattedHash(algoId) {
    const hex = this.rawHexMap.get(algoId);
    return hex ? Format.applyFormat(hex, this.getSelectedFormat()) : '';
  },

  _reformatAll(record = false) {
    for (const { id } of ALGORITHMS) {
      if (this.disabledAlgos.has(id)) continue;
      const hex = this.rawHexMap.get(id);
      if (!hex) continue;
      const els = this.rowEls.get(id);
      const hash = Format.applyFormat(hex, this.getSelectedFormat());
      this._setHashText(els, hash);
      if (record) History.record('file', hash, id, this._currentBatchId, this.currentFileName);
    }
  },

  _setAllActionsEnabled(enabled) {
    for (const [id, els] of this.rowEls.entries()) {
      if (this.disabledAlgos.has(id)) continue;
      [els.download, els.copy].forEach((btn) => {
        btn.disabled = !enabled;
      });
    }
  },

  // ── Event handlers ─────────────────────────────────────────────────────

  // ── File size helper ────────────────────────────────────────────────────────────────────────────

  _formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
  },

  async processFile(file) {
    this.currentFileName = file.name;
    this._fileNameText.textContent = file.name;
    this._fileSize.textContent = ` · ${this._formatFileSize(file.size)}`;
    this._fileName.classList.add('file-drop__filename--visible');
    this._dropClear.classList.add('file-drop__clear--visible');

    // Enter computing state: hash cell becomes the progress bar at 0%.
    for (const { id } of ALGORITHMS) {
      if (this.disabledAlgos.has(id)) continue;
      this._setComputingState(this.rowEls.get(id), 0);
    }
    this._setAllActionsEnabled(false);

    const onProgress = (ratio) => {
      for (const { id } of ALGORITHMS) {
        if (this.disabledAlgos.has(id)) continue;
        const els = this.rowEls.get(id);
        if (els.hash.classList.contains('result__hash--computing')) {
          this._setComputingState(els, ratio);
        }
      }
    };

    try {
      const activeAlgos = ALGORITHMS.filter((a) => !this.disabledAlgos.has(a.id));
      this.rawHexMap = await Hasher.fromFileAll(file, onProgress, activeAlgos);
      const fmt = this.getSelectedFormat();
      this._currentBatchId = History.nextBatch();
      for (const { id } of ALGORITHMS) {
        if (this.disabledAlgos.has(id)) continue;
        const hex = this.rawHexMap.get(id);
        const hash = Format.applyFormat(hex, fmt);
        const els = this.rowEls.get(id);
        this._clearComputingState(els);
        this._setHashText(els, hash);
        History.record('file', hash, id, this._currentBatchId, this.currentFileName);
      }
      this._setAllActionsEnabled(true);
    } catch {
      for (const { id } of ALGORITHMS) {
        if (this.disabledAlgos.has(id)) continue;
        const els = this.rowEls.get(id);
        this._clearComputingState(els);
        this._setHashText(els, 'error reading file');
        els.hash.classList.add('result__hash--empty');
      }
    }
  },

  onClear() {
    this.rawHexMap.clear();
    this.currentFileName = '';
    this._input.value = '';
    this._fileNameText.textContent = '';
    this._fileSize.textContent = '';
    this._fileName.classList.remove('file-drop__filename--visible');
    this._dropClear.classList.remove('file-drop__clear--visible');
    for (const { id } of ALGORITHMS) {
      const els = this.rowEls.get(id);
      this._clearComputingState(els);
      this._setHashText(els, this.disabledAlgos.has(id) ? 'disabled' : 'no file selected');
      els.hash.classList.add('result__hash--empty');
    }
    this._setAllActionsEnabled(false);
  },

  _onDownload(algoId) {
    const hash = this._formattedHash(algoId);
    if (!hash) return;
    const base = this.currentFileName
      ? this.currentFileName.replace(/\.[^.]+$/, '')
      : `${APP_CONFIG.appName}-${APP_CONFIG.fileNoun}_${Download.filenameSafeTimestamp()}`;
    const ext = algoId.toLowerCase().replaceAll('-', '');
    const filename = `${base}.${ext}`;
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

// -------------------------------------------------------------------------
// Random hashes section
// -------------------------------------------------------------------------
const RandomSection = {
  elements: {},
  hashes: [], // [{ hash, algo }]

  init() {
    this.elements = {
      list: document.getElementById('randomList'),
      regenerate: document.getElementById('randomRegenerate'),
      count: document.getElementById('randomCount'),
      algo: document.getElementById('randomAlgo'),
      copyAll: document.getElementById('randomCopyAll'),
      downloadAll: document.getElementById('randomDownloadAll'),
    };

    this.elements.regenerate.addEventListener('click', () => this.generate());
    this.elements.count.addEventListener('change', () => this.generate());
    this.elements.algo.addEventListener('change', () => this.generate());
    this.elements.copyAll.addEventListener('click', () => this.onCopyAll());
    this.elements.downloadAll.addEventListener('click', () => this.onDownloadAll());

    // Event-delegate clicks on hash items (copy / download per-item)
    this.elements.list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      this.handleItemAction(btn);
    });

    this.generate();
  },

  generate() {
    const count = parseInt(this.elements.count.value, 10);
    const algo = this.elements.algo.value;
    this.hashes = Array.from({ length: count }, () => ({
      hash: Hasher.generateRandom(algo),
      algo,
    }));
    this.render();
  },

  render() {
    const fragment = document.createDocumentFragment();
    const padWidth = this.hashes.length > 100 ? 3 : 2;

    const _curAlgo = this.hashes[0]?.algo ?? DEFAULT_ALGO;
    const _algoMeta = ALGORITHMS.find((a) => a.id === _curAlgo);
    const _tipText = _algoMeta ? `${_algoMeta.bits}-bit · ${_algoMeta.hexLen} hex chars` : _curAlgo;

    this.hashes.forEach(({ hash, algo }, index) => {
      const item = document.createElement('div');
      item.className = 'random__item';
      item.innerHTML = `
            <span class="random__item-index">${String(index + 1).padStart(padWidth, '0')}</span>
            <span class="random__item-hash" data-action="copy" data-hash="${hash}">${hash}<span class="tooltip">Copied!</span></span>
            <span class="algo-badge random__item-badge" data-algo="${algo}" tabindex="0">${algo}</span>
            <div class="random__item-actions">
              <button
                class="random__item-btn"
                data-action="copy"
                data-hash="${hash}"
                aria-label="Copy hash"
              >
                <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                <span class="tooltip">Copied!</span>
              </button>
              <button
                class="random__item-btn"
                data-action="download"
                data-hash="${hash}"
                data-algo="${algo}"
                data-index="${index + 1}"
                aria-label="Download hash"
              >
                <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                <span class="tooltip">Exported</span>
              </button>
            </div>`;

      const randomBadge = item.querySelector('.algo-badge');
      randomBadge.setAttribute('aria-label', `${algo} — ${_tipText}`);
      randomBadge.addEventListener('mouseenter', () => Tooltip.show(randomBadge, _tipText));
      randomBadge.addEventListener('mouseleave', () => Tooltip.hide());
      randomBadge.addEventListener('focus', () => Tooltip.show(randomBadge, _tipText));
      randomBadge.addEventListener('blur', () => Tooltip.hide());

      // Hover tooltips for icon-only Copy / Download buttons in random list
      item.querySelectorAll('.random__item-btn[data-action]').forEach((btn) => {
        const label = btn.getAttribute('data-action') === 'copy' ? 'Copy' : 'Download';
        btn.addEventListener('mouseenter', () => Tooltip.show(btn, label));
        btn.addEventListener('mouseleave', () => Tooltip.hide());
      });

      fragment.appendChild(item);
    });

    this.elements.list.innerHTML = '';
    this.elements.list.appendChild(fragment);
  },

  handleItemAction(button) {
    const action = button.getAttribute('data-action');
    const hash = button.getAttribute('data-hash');

    if (action === 'copy') {
      Clipboard.copy(hash);
      Tooltip.flash(button);
    } else if (action === 'download') {
      const index = button.getAttribute('data-index');
      const algo = button.getAttribute('data-algo') ?? DEFAULT_ALGO;
      const csvData = `id,algorithm,hash\n${index},${algo},${hash}`;
      const filename = `${APP_CONFIG.appName}-random_${Download.filenameSafeTimestamp()}.csv`;
      Download.trigger(csvData, filename, 'text/csv');
      Tooltip.flash(button);
    }
  },

  async onCopyAll() {
    const text = this.hashes.map(({ hash }) => hash).join('\n');
    await Clipboard.copy(text);
    Tooltip.flash(this.elements.copyAll);
  },

  onDownloadAll() {
    const rows = this.hashes.map(({ hash, algo }, i) => `${i + 1},${algo},${hash}`);
    const csvData = `id,algorithm,hash\n${rows.join('\n')}`;
    const filename = `${APP_CONFIG.appName}-random_${Download.filenameSafeTimestamp()}.csv`;
    Download.trigger(csvData, filename, 'text/csv');
    Tooltip.flash(this.elements.downloadAll);
  },
};

// -------------------------------------------------------------------------
// History — persisted per section, max 1000 entries, newest first
// Pagination: PAGE_SIZE rows per page, controls rendered in popover footer
// -------------------------------------------------------------------------
const History = {
  MAX: 1000,
  PAGE_SIZE: 10,
  _stores: { text: [], file: [] },
  _pages: { text: 0, file: 0 }, // current 0-based page index per ns
  // Monotonically-increasing batch counter: all algorithms hashed from the
  // same user action share one batchId, allowing per-batch algo sorting.
  _batchCounter: 0,

  _key(ns) {
    return `${APP_CONFIG.appName}-history-${ns}`;
  },

  /** Call once before pushing a group of per-algorithm entries so they
   *  all share the same batchId and can be sorted together. */
  nextBatch() {
    return ++this._batchCounter;
  },

  load(ns) {
    try {
      const raw = localStorage.getItem(this._key(ns));
      this._stores[ns] = raw ? JSON.parse(raw) : [];
    } catch {
      this._stores[ns] = [];
    }
    this._pages[ns] = 0;
  },

  save(ns) {
    try {
      localStorage.setItem(this._key(ns), JSON.stringify(this._stores[ns]));
    } catch {
      /* storage full — silently skip */
    }
  },

  push(ns, hash, algo, batchId, filename) {
    const entries = this._stores[ns];
    // Deduplicate on (hash + algo) pair so the same hash value for different
    // algorithms is treated as a distinct entry.
    const idx = entries.findIndex((e) => e.hash === hash && e.algo === algo);
    if (idx !== -1) entries.splice(idx, 1);
    entries.unshift({
      hash,
      algo,
      batchId,
      ts: Date.now(),
      filename: filename || '',
    });
    if (entries.length > this.MAX) entries.length = this.MAX;
    // New entry goes to page 0
    this._pages[ns] = 0;
    this.save(ns);
  },

  clear(ns) {
    this._stores[ns] = [];
    this._pages[ns] = 0;
    this.save(ns);
  },

  entries(ns) {
    return this._stores[ns];
  },

  // ── Rendering ────────────────────────────────────────────────────────────

  _formatTs(ts) {
    const d = new Date(ts);
    const pad = (v) => String(v).padStart(2, '0');
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  },

  renderBody(ns, bodyEl) {
    const entries = this.entries(ns);
    const total = entries.length;
    const pages = Math.max(1, Math.ceil(total / this.PAGE_SIZE));
    // Clamp page in case entries shrank (e.g. after clear)
    this._pages[ns] = Math.min(this._pages[ns], pages - 1);
    const page = this._pages[ns];
    const start = page * this.PAGE_SIZE;

    // Sort: primary = batchId descending (newest calculation first),
    // secondary = algo index ascending (SHA-1 → SHA-256 → … within a batch).
    // Entries without a batchId (legacy localStorage data) fall back to ts.
    const algoOrder = ALGO_ORDER;
    const sorted = entries.slice().sort((a, b) => {
      const bA = a.batchId ?? -a.ts;
      const bB = b.batchId ?? -b.ts;
      if (bB !== bA) return bB - bA;
      return (algoOrder.get(a.algo) ?? 999) - (algoOrder.get(b.algo) ?? 999);
    });

    const slice = sorted.slice(start, start + this.PAGE_SIZE);

    // ── Table ──
    if (!slice.length) {
      bodyEl.innerHTML = `
            <table class="history-table" aria-label="Hash history">
              <thead>
                <tr>
                  <th class="history-table__num">#</th>
                  <th class="history-table__algo">Algo</th>
                  <th class="history-table__hash">Hash</th>
                  <th class="history-table__time">Time</th>
                  <th class="history-table__actions"></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="5" class="history-popover__empty">No hashes yet.</td>
                </tr>
              </tbody>
            </table>`;
      return;
    }

    const tbody = slice
      .map(
        (e, i) => `
          <tr>
            <td class="history-table__num">${String(start + i + 1).padStart(3, '0')}</td>
            <td class="history-table__algo"><span class="algo-badge" data-algo="${e.algo ?? DEFAULT_ALGO}">${e.algo ?? DEFAULT_ALGO}</span></td>
            <td class="history-table__hash" title="${e.hash}"
                data-action="copy-history" data-hash="${e.hash}">${e.hash}<span class="tooltip">Copied!</span></td>
            <td class="history-table__time"><span dir="ltr">${this._formatTs(e.ts)}</span></td>
            <td class="history-table__actions">
              <div class="history-table__action-btns">
                <button class="history-table__action-btn" data-action="copy-history" data-hash="${e.hash}" aria-label="Copy hash">
                  <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                  <span class="tooltip">Copied!</span>
                </button>
                <button class="history-table__action-btn" data-action="download-history" data-hash="${e.hash}" data-algo="${e.algo ?? DEFAULT_ALGO}" data-filename="${e.filename ?? ''}" aria-label="Download hash">
                  <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  <span class="tooltip">Exported</span>
                </button>
              </div>
            </td>
          </tr>`,
      )
      .join('');

    bodyEl.innerHTML = `
          <table class="history-table" aria-label="Hash history">
            <thead>
              <tr>
                <th class="history-table__num">#</th>
                <th class="history-table__algo">Algo</th>
                <th class="history-table__hash">Hash</th>
                <th class="history-table__time">Time</th>
                <th class="history-table__actions"></th>
              </tr>
            </thead>
            <tbody>${tbody}</tbody>
          </table>`;
  },

  // Renders the footer with pagination + clear button and wires events.
  // Called once per popover on init; re-renders pagination state on each open/page-change.
  _renderFooter(ns, popover) {
    // Remove existing footer if any
    const existing = popover.querySelector('.history-popover__footer');
    if (existing) existing.remove();

    const entries = this.entries(ns);
    const total = entries.length;
    const pages = Math.max(1, Math.ceil(total / this.PAGE_SIZE));
    const page = this._pages[ns];

    const footer = document.createElement('div');
    footer.className = 'history-popover__footer';
    footer.innerHTML = `
          <div class="history-pagination" aria-label="History pagination">
            <button
              class="history-pagination__btn"
              data-dir="-1"
              aria-label="Previous page"
              ${page === 0 ? 'disabled' : ''}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
            <span class="history-pagination__info">${total ? `${page + 1} / ${pages}` : '—'}</span>
            <button
              class="history-pagination__btn"
              data-dir="1"
              aria-label="Next page"
              ${page >= pages - 1 ? 'disabled' : ''}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </button>
          </div>
          <button class="history-popover__clear" data-history-clear="${ns}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            Clear
          </button>`;
    popover.appendChild(footer);
  },

  // ── Popover controller ───────────────────────────────────────────────────

  _refreshFns: {}, // keyed by ns; used by record() to live-update open popovers

  initPopover(ns, btnId, popoverId, bodyId) {
    this.load(ns);

    const btn = document.getElementById(btnId);
    const popover = document.getElementById(popoverId);
    const body = document.getElementById(bodyId);

    // Render body + footer and re-wire footer controls (footer is fully replaced each call)
    const refresh = () => {
      this.renderBody(ns, body);
      this._renderFooter(ns, popover);
      // Re-wire hover tooltips on the newly-rendered action buttons
      body.querySelectorAll('.history-table__action-btn[data-action]').forEach((btn) => {
        const label = btn.getAttribute('data-action') === 'copy-history' ? 'Copy' : 'Download';
        btn.addEventListener('mouseenter', () => Tooltip.show(btn, label));
        btn.addEventListener('mouseleave', () => Tooltip.hide());
      });

      popover.querySelectorAll('.history-pagination__btn').forEach((pbtn) => {
        pbtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pages = Math.max(1, Math.ceil(this.entries(ns).length / this.PAGE_SIZE));
          this._pages[ns] = Math.max(0, Math.min(this._pages[ns] + parseInt(pbtn.dataset.dir, 10), pages - 1));
          refresh();
        });
      });

      const clearBtn = popover.querySelector('[data-history-clear]');
      if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.clear(ns);
          refresh();
        });
      }
    };

    // Expose refresh so record() can call it when the popover is live
    this._refreshFns[ns] = () => {
      if (popover.classList.contains('history-popover--visible')) refresh();
    };

    // Hover tooltip on the history clock button
    btn.addEventListener('mouseenter', () => Tooltip.show(btn, 'History'));
    btn.addEventListener('mouseleave', () => Tooltip.hide());

    const open = () => {
      refresh();
      popover.classList.add('history-popover--visible');
      btn.setAttribute('aria-expanded', 'true');
      document.getElementById('historyBackdrop').classList.add('history-backdrop--visible');
    };
    const close = () => {
      popover.classList.remove('history-popover--visible');
      btn.setAttribute('aria-expanded', 'false');
      const anyOpen = document.querySelector('.history-popover--visible');
      if (!anyOpen) document.getElementById('historyBackdrop').classList.remove('history-backdrop--visible');
    };

    popover.addEventListener('click', (e) => {
      if (e.target.closest('[data-popover-close]')) {
        e.stopPropagation();
        close();
        btn.focus();
      }
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.contains('history-popover--visible') ? close() : open();
    });

    document.addEventListener('click', (e) => {
      if (popover.classList.contains('history-popover--visible') && !popover.contains(e.target) && e.target !== btn)
        close();
    });

    document.getElementById('historyBackdrop').addEventListener('click', () => {
      if (popover.classList.contains('history-popover--visible')) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popover.classList.contains('history-popover--visible')) {
        close();
        btn.focus();
      }
    });

    // Delegated actions on hash cells and action buttons — wired once, works across re-renders
    body.addEventListener('click', async (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const { action, hash } = target.dataset;

      if (action === 'copy-history') {
        e.stopPropagation();
        await Clipboard.copy(hash);
        Tooltip.flash(target);
      } else if (action === 'download-history') {
        e.stopPropagation();
        const algo = target.dataset.algo ?? DEFAULT_ALGO;
        const ext = algo.toLowerCase().replaceAll('-', '');
        const storedFilename = target.dataset.filename ?? '';
        // Mirror FileSection._onDownload: if a source filename was recorded,
        // use <basename>.<ext>; otherwise fall back to the timestamped default.
        const base = storedFilename
          ? storedFilename.replace(/\.[^.]+$/, '')
          : `${APP_CONFIG.appName}-${APP_CONFIG.fileNoun}_${Download.filenameSafeTimestamp()}`;
        Download.trigger(hash, `${base}.${ext}`);
        Tooltip.flash(target);
      }
    });
  },

  // Call after a hash is produced
  record(ns, hash, algo, batchId, filename) {
    this.push(ns, hash, algo, batchId, filename);
    // Live-refresh the popover if it's open (refresh() is a no-op when closed)
    this._refreshFns[ns]?.();
  },
};

// -------------------------------------------------------------------------
// FAQ tabs
// -------------------------------------------------------------------------
const FaqTabs = {
  init() {
    const tablist = document.getElementById('faqTablist');
    const wrap = document.getElementById('faqTabsWrap');
    if (!tablist) return;

    this._tabs = [...document.querySelectorAll('.info__tab')];
    this._panels = [...document.querySelectorAll('.info__panel')];

    const updateFade = () => {
      const { scrollLeft, scrollWidth, clientWidth } = tablist;
      wrap.style.setProperty('--tabs-fade-left', scrollLeft > 1 ? '1' : '0');
      wrap.style.setProperty('--tabs-fade-right', scrollLeft + clientWidth < scrollWidth - 1 ? '1' : '0');
    };
    tablist.addEventListener('scroll', updateFade, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(updateFade).observe(tablist);
    } else {
      window.addEventListener('resize', updateFade, { passive: true });
    }
    updateFade();

    tablist.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (!tab) return;
      this.activate(tab.dataset.tab);
    });

    tablist.addEventListener('keydown', (e) => {
      const tabs = [...tablist.querySelectorAll('[role="tab"]')];
      const idx = tabs.indexOf(document.activeElement);
      if (idx === -1) return;
      let next = -1;
      if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
      if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
      if (next !== -1) {
        e.preventDefault();
        tabs[next].focus();
        this.activate(tabs[next].dataset.tab);
      }
    });
  },

  activate(tabId) {
    this._tabs.forEach((t) => t.setAttribute('aria-selected', 'false'));
    this._panels.forEach((p) => p.removeAttribute('data-active'));
    const tab = this._tabs.find((t) => t.dataset.tab === tabId);
    const panel = document.getElementById(`faq-panel-${tabId}`);
    if (tab) {
      tab.setAttribute('aria-selected', 'true');
      tab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
    if (panel) panel.setAttribute('data-active', '');
  },
};

// -------------------------------------------------------------------------
// Permalink — Text→Hash section
// -------------------------------------------------------------------------
const Permalink = {
  _INPUT_DEFAULT: 'utf-8',
  _OUTPUT_DEFAULT: 'hex',

  buildUrl() {
    const inputFmt = TextSection.getSelectedInputFormat();
    const outputFmt = TextSection.getSelectedFormat();
    const text = document.getElementById('textInput').value;
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('text', text);
    if (inputFmt !== this._INPUT_DEFAULT) url.searchParams.set('input', inputFmt);
    if (outputFmt !== this._OUTPUT_DEFAULT) url.searchParams.set('output', outputFmt);
    return url.toString();
  },

  restoreFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('text')) return false;
    document.getElementById('textInput').value = params.get('text');
    const inputFmt = params.get('input') || this._INPUT_DEFAULT;
    const outputFmt = params.get('output') || this._OUTPUT_DEFAULT;
    const inRadio = document.querySelector(`input[name="textInputFormat"][value="${inputFmt}"]`);
    const outRadio = document.querySelector(`input[name="textFormat"][value="${outputFmt}"]`);
    if (inRadio) inRadio.checked = true;
    if (outRadio) outRadio.checked = true;
    history.replaceState(null, '', window.location.pathname);
    return true;
  },

  init() {
    const btn = document.getElementById('textPermalinkBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const url = this.buildUrl();
      Clipboard.copy(url);
      btn.classList.add('permalink-btn--copied');
      setTimeout(() => btn.classList.remove('permalink-btn--copied'), 1500);
      Tooltip.flash(btn);
    });
    btn.addEventListener('mouseenter', () => Tooltip.show(btn, 'Permalink'));
    btn.addEventListener('mouseleave', () => Tooltip.hide());
    btn.addEventListener('focus', () => Tooltip.show(btn, 'Permalink'));
    btn.addEventListener('blur', () => Tooltip.hide());
  },
};

// -------------------------------------------------------------------------
// Bootstrap
// -------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('footerYear').textContent = new Date().getFullYear();
  Theme.init();
  FaqTabs.init();
  History.initPopover('text', 'textHistoryBtn', 'textHistoryPopover', 'textHistoryBody');
  History.initPopover('file', 'fileHistoryBtn', 'fileHistoryPopover', 'fileHistoryBody');
  TextSection.init();
  Permalink.init();
  if (Permalink.restoreFromUrl()) TextSection.onInput();
  FileSection.init();

  // Toggle-all button — Text section
  (() => {
    const btn = document.getElementById('textToggleAllBtn');
    if (!btn) return;
    btn.addEventListener('click', () => TextSection._toggleAll());
    btn.addEventListener('mouseenter', () => {
      const allSelected = ALGORITHMS.every((a) => !TextSection.disabledAlgos.has(a.id));
      Tooltip.show(btn, allSelected ? 'Deselect all' : 'Select all');
    });
    btn.addEventListener('mouseleave', () => Tooltip.hide());
    btn.addEventListener('focus', () => {
      const allSelected = ALGORITHMS.every((a) => !TextSection.disabledAlgos.has(a.id));
      Tooltip.show(btn, allSelected ? 'Deselect all' : 'Select all');
    });
    btn.addEventListener('blur', () => Tooltip.hide());
  })();

  // Toggle-all button — File section
  (() => {
    const btn = document.getElementById('fileToggleAllBtn');
    if (!btn) return;
    btn.addEventListener('click', () => FileSection._toggleAll());
    btn.addEventListener('mouseenter', () => {
      const allSelected = ALGORITHMS.every((a) => !FileSection.disabledAlgos.has(a.id));
      Tooltip.show(btn, allSelected ? 'Deselect all' : 'Select all');
    });
    btn.addEventListener('mouseleave', () => Tooltip.hide());
    btn.addEventListener('focus', () => {
      const allSelected = ALGORITHMS.every((a) => !FileSection.disabledAlgos.has(a.id));
      Tooltip.show(btn, allSelected ? 'Deselect all' : 'Select all');
    });
    btn.addEventListener('blur', () => Tooltip.hide());
  })();
  RandomSection.init();

  // Heading algo badges — click scrolls to the Text section and focuses the input.
  // Hover/focus shows the same informational tooltip used in result rows and the
  // Random section, sourced from ALGORITHMS (single source of truth).
  document.querySelectorAll('.page-heading__algos .algo-badge').forEach((badge) => {
    const algoId = badge.dataset.algo;
    const algo = ALGORITHMS.find((a) => a.id === algoId);
    const tipText = `${algo.bits}-bit · ${algo.hexLen} hex chars`;

    // Bring aria-label in line with result-row badge pattern
    badge.setAttribute('aria-label', `${algoId} — ${tipText} — click to start hashing`);

    badge.addEventListener('mouseenter', () => Tooltip.show(badge, tipText));
    badge.addEventListener('mouseleave', () => Tooltip.hide());
    badge.addEventListener('focus', () => Tooltip.show(badge, tipText));
    badge.addEventListener('blur', () => Tooltip.hide());

    badge.addEventListener('click', () => {
      const input = document.getElementById('textInput');
      document.getElementById('text').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => input.focus(), 200);
    });
  });

  const yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
