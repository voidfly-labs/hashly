import { AlgoSpotlight } from '~core/components/algo-spotlight.js';
import { createHiddenSummary } from '~core/components/hidden-summary.js';
import { History } from '~core/components/history.js';
import { Tooltip } from '~core/components/tooltip.js';
import { Clipboard } from '~core/utils/clipboard.js';
import { Download } from '~core/utils/download.js';
import { Format } from '~core/utils/format.js';

let _APP_CONFIG, _ALGORITHMS, _Hasher;

export const FileSection = {
  // rawHexMap: Map<algoId, hex>
  rawHexMap: new Map(),
  // rowEls: Map<algoId, { hash, download, copy }>
  rowEls: new Map(),
  hiddenAlgos: new Set(),
  currentFileName: '',
  // Shared batchId for all algorithms in the current file computation.
  _currentBatchId: null,

  init({ APP_CONFIG, ALGORITHMS, Hasher }) {
    _APP_CONFIG = APP_CONFIG;
    _ALGORITHMS = ALGORITHMS;
    _Hasher = Hasher;

    this.hiddenAlgos = new Set(_APP_CONFIG.defaultHiddenAlgos ?? []);

    this._drop = document.getElementById('fileDrop');
    this._input = document.getElementById('fileInput');
    this._dropClear = document.getElementById('fileDropClear');
    this._fileName = document.getElementById('fileName');
    this._fileNameText = document.getElementById('fileNameText');
    this._fileSize = document.getElementById('fileSize');
    this._resultsEl = document.getElementById('fileResults');

    // Build one result row per algorithm.
    _ALGORITHMS.forEach(({ id }) => this._buildRow(id));
    this._hiddenSummary = createHiddenSummary({
      resultsEl: this._resultsEl,
      onShowAll: () => this._toggleAll(),
    });
    // Sync button icon and hidden-algorithms summary with initial hiddenAlgos state.
    this._updateToggleAllBtn();
    this._hiddenSummary.update(this.hiddenAlgos.size);

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
    const tipText = () => (this.hiddenAlgos.has(algoId) ? 'Show' : 'Hide');

    const row = document.createElement('div');
    row.className = 'result';
    row.dataset.algo = algoId;
    row.innerHTML = `
          <div class="result__inner">
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
            </div>
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
    badge.addEventListener('click', () => this._toggleAlgo(algoId, { refreshTooltip: true }));
    badge.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._toggleAlgo(algoId, { refreshTooltip: true });
      }
    });

    // Apply initial hidden state if set before _buildRow is called.
    if (this.hiddenAlgos.has(algoId)) {
      badge.classList.add('algo-badge--hidden');
      row.classList.add('result--hidden');
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

  _toggleAll({ refreshTooltip = false, resetSpotlight = true } = {}) {
    const allVisible = _ALGORITHMS.every((a) => !this.hiddenAlgos.has(a.id));

    _ALGORITHMS.forEach(({ id }) => {
      const row = this._resultsEl.querySelector(`.result[data-algo="${id}"]`);
      const badge = row?.querySelector('.algo-badge');
      const els = this.rowEls.get(id);
      if (!row || !badge || !els) return;

      if (allVisible) {
        // Hide all
        this.hiddenAlgos.add(id);
        badge.classList.add('algo-badge--hidden');
        row.classList.add('result--hidden');
        badge.setAttribute('aria-checked', 'false');
        this._clearComputingState(els);
        this._setHashText(els, 'disabled');
        els.hash.classList.add('result__hash--empty');
        [els.download, els.copy].forEach((btn) => {
          btn.disabled = true;
        });
      } else if (this.hiddenAlgos.has(id)) {
        // Show — restore existing hash from rawHexMap if available
        this.hiddenAlgos.delete(id);
        badge.classList.remove('algo-badge--hidden');
        row.classList.remove('result--hidden');
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
    this._hiddenSummary.update(this.hiddenAlgos.size);
    if (resetSpotlight) AlgoSpotlight.reset();
    if (!refreshTooltip) return;
    const fileBtn = document.getElementById('fileToggleAllBtn');
    if (!fileBtn) return;
    const nowAllVisible = _ALGORITHMS.every((a) => !this.hiddenAlgos.has(a.id));
    Tooltip.show(fileBtn, nowAllVisible ? 'Hide all' : 'Show all');
  },

  _updateToggleAllBtn() {
    const btn = document.getElementById('fileToggleAllBtn');
    if (!btn) return;
    const allVisible = _ALGORITHMS.every((a) => !this.hiddenAlgos.has(a.id));
    const allHidden = _ALGORITHMS.every((a) => this.hiddenAlgos.has(a.id));
    const iconChecked =
      '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>';
    const iconIndeterminate =
      '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z"/>';
    const iconUnchecked =
      '<path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>';
    let icon;
    if (allVisible) icon = iconChecked;
    else if (allHidden) icon = iconUnchecked;
    else icon = iconIndeterminate;
    btn.querySelector('svg').innerHTML = icon;
    btn.setAttribute('aria-label', allVisible ? 'Hide all file algorithms' : 'Show all file algorithms');
  },

  _toggleAlgo(algoId, { refreshTooltip = false, resetSpotlight = true } = {}) {
    const row = this._resultsEl.querySelector(`.result[data-algo="${algoId}"]`);
    const badge = row.querySelector('.algo-badge');
    const els = this.rowEls.get(algoId);
    if (this.hiddenAlgos.has(algoId)) {
      this.hiddenAlgos.delete(algoId);
      badge.classList.remove('algo-badge--hidden');
      row.classList.remove('result--hidden');
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
      this.hiddenAlgos.add(algoId);
      badge.classList.add('algo-badge--hidden');
      row.classList.add('result--hidden');
      badge.setAttribute('aria-checked', 'false');
      this._clearComputingState(els);
      this._setHashText(els, 'disabled');
      els.hash.classList.add('result__hash--empty');
      [els.download, els.copy].forEach((btn) => {
        btn.disabled = true;
      });
    }
    // Refresh the tooltip to reflect the new state while it may still be visible —
    // only for a direct click on this badge, not when driven by AlgoSpotlight.
    if (refreshTooltip) {
      const nowHidden = this.hiddenAlgos.has(algoId);
      Tooltip.show(badge, nowHidden ? 'Show' : 'Hide');
    }
    this._updateToggleAllBtn();
    this._hiddenSummary.update(this.hiddenAlgos.size);
    if (resetSpotlight) AlgoSpotlight.reset();
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
    for (const { id } of _ALGORITHMS) {
      if (this.hiddenAlgos.has(id)) continue;
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
      if (this.hiddenAlgos.has(id)) continue;
      [els.download, els.copy].forEach((btn) => {
        btn.disabled = !enabled;
      });
    }
  },

  // ── File size helper ────────────────────────────────────────────────────

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
    for (const { id } of _ALGORITHMS) {
      if (this.hiddenAlgos.has(id)) continue;
      this._setComputingState(this.rowEls.get(id), 0);
    }
    this._setAllActionsEnabled(false);

    const onProgress = (ratio) => {
      for (const { id } of _ALGORITHMS) {
        if (this.hiddenAlgos.has(id)) continue;
        const els = this.rowEls.get(id);
        if (els.hash.classList.contains('result__hash--computing')) {
          this._setComputingState(els, ratio);
        }
      }
    };

    try {
      const visibleAlgos = _ALGORITHMS.filter((a) => !this.hiddenAlgos.has(a.id));
      this.rawHexMap = await _Hasher.fromFileAll(file, onProgress, visibleAlgos);
      const fmt = this.getSelectedFormat();
      this._currentBatchId = History.nextBatch();
      for (const { id } of _ALGORITHMS) {
        if (this.hiddenAlgos.has(id)) continue;
        const hex = this.rawHexMap.get(id);
        const hash = Format.applyFormat(hex, fmt);
        const els = this.rowEls.get(id);
        this._clearComputingState(els);
        this._setHashText(els, hash);
        History.record('file', hash, id, this._currentBatchId, this.currentFileName);
      }
      this._setAllActionsEnabled(true);
    } catch {
      for (const { id } of _ALGORITHMS) {
        if (this.hiddenAlgos.has(id)) continue;
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
    for (const { id } of _ALGORITHMS) {
      const els = this.rowEls.get(id);
      this._clearComputingState(els);
      this._setHashText(els, this.hiddenAlgos.has(id) ? 'disabled' : 'no file selected');
      els.hash.classList.add('result__hash--empty');
    }
    this._setAllActionsEnabled(false);
  },

  _onDownload(algoId) {
    const hash = this._formattedHash(algoId);
    if (!hash) return;
    const base = this.currentFileName
      ? this.currentFileName.replace(/\.[^.]+$/, '')
      : `${_APP_CONFIG.appName}-${_APP_CONFIG.fileNoun}_${Download.filenameSafeTimestamp()}`;
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
