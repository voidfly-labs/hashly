import { AlgoSpotlight } from '~core/components/algo-spotlight.js';
import { initButtonTooltip } from '~core/components/button-tooltip.js';
import { copyWithFeedback } from '~core/components/copy-feedback.js';
import { createHashProgress } from '~core/components/hash-progress.js';
import { createHiddenSummary } from '~core/components/hidden-summary.js';
import { History } from '~core/components/history.js';
import { setHashEmpty } from '~core/components/result.js';
import {
  buildResultRow,
  hideRow,
  setHashText,
  setRowActions,
  showRow,
  showToggleAllTooltip,
  updateToggleAllButton,
  wireResultRow,
} from '~core/components/result-row.js';
import { rememberRadioGroup, restoreHiddenAlgos, saveHiddenAlgos } from '~core/components/saved-view.js';
import { createSoloResult } from '~core/components/solo-result.js';
import { TabTitle } from '~core/components/tab-title.js';
import { Tooltip } from '~core/components/tooltip.js';
import { createVerify } from '~core/components/verify.js';
import { Checkmark } from '~core/utils/checkmark.js';
import { toChecksumFile } from '~core/utils/checksum-file.js';
import { Download } from '~core/utils/download.js';
import { Format } from '~core/utils/format.js';
import { createRunStats } from '~core/utils/run-stats.js';
import { takesText } from '~core/utils/text-field.js';

let _APP_CONFIG, _ALGORITHMS, _Hasher;

export const FileSection = {
  // rawHexMap: Map<algoId, hex>
  rawHexMap: new Map(),
  // rowEls: Map<algoId, { row, hash, download, copy, progress }>
  rowEls: new Map(),
  hiddenAlgos: new Set(),
  currentFileName: '',
  // The file being hashed, if any: { controller, ids }, where `ids` are the algorithms it
  // computes. Aborted by clearing the file, dropping another over it, or hiding all of `ids`.
  _run: null,
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
    this._stats = document.getElementById('fileStats');
    this._statsText = document.getElementById('fileStatsText');
    this._resultsEl = document.getElementById('fileResults');

    // Build one result row per algorithm.
    _ALGORITHMS.forEach(({ id }) => this._buildRow(id));
    this._verify = createVerify({
      getFileName: () => this.currentFileName,
      root: document.getElementById('fileVerify'),
      algorithms: _ALGORITHMS,
      getRow: (id) => this.rowEls.get(id).row,
      isHidden: (id) => this.hiddenAlgos.has(id),
    });
    this._hiddenSummary = createHiddenSummary({
      resultsEl: this._resultsEl,
      total: _ALGORITHMS.length,
      onShowAll: () => this._toggleAll(),
    });
    this._soloResult = createSoloResult({ resultsEl: this._resultsEl, algorithms: _ALGORITHMS });
    // Sync button icon and hidden-algorithms summary with initial hiddenAlgos state.
    updateToggleAllButton('fileToggleAllBtn', this.hiddenAlgos, _ALGORITHMS, 'file');
    this._hiddenSummary.update(this.hiddenAlgos.size);
    this._soloResult.update();

    // Put back the visitor's saved output format and hidden algorithms (and keep saving them).
    rememberRadioGroup('fileFormat', 'fileOutputFormat');
    restoreHiddenAlgos(this, 'fileHidden', _ALGORITHMS);

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
        this._setInputFile(file);
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
        this._drop.closest('.section').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      // Text dropped into a field (the reference hash, the history search) is the field's own to take.
      if (!e.dataTransfer?.types?.includes('Files') && takesText(e.target)) return;
      // Prevent the browser from navigating to a dropped file
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
        this._setInputFile(file);
        this.processFile(file);
      }
    });

    this._dropClear.addEventListener('mouseenter', () => this._drop.classList.add('file-drop--clear-hover'));
    this._dropClear.addEventListener('mouseleave', () => this._drop.classList.remove('file-drop--clear-hover'));

    initButtonTooltip(this._dropClear, 'Remove file');

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
    const els = buildResultRow({ prefix: 'file', algoId, emptyText: 'no file selected', withStatus: true });
    this._resultsEl.appendChild(els.row);
    els.progress = createHashProgress({ row: els.row, hash: els.hash, algoId });
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

  /** Hides or shows one algorithm's row. Showing puts back its digest if the file has been hashed
   *  with it, and otherwise says so. */
  _setHidden(algoId, hidden) {
    const els = this.rowEls.get(algoId);
    if (hidden) {
      this.hiddenAlgos.add(algoId);
      this._clearComputingState(els);
      hideRow(els);
      return;
    }
    this.hiddenAlgos.delete(algoId);
    showRow(els, this._formattedHash(algoId), this._emptyText());
  },

  /** What follows any change to which algorithms are hidden. */
  _afterVisibilityChange({ resetSpotlight }) {
    updateToggleAllButton('fileToggleAllBtn', this.hiddenAlgos, _ALGORITHMS, 'file');
    this._hiddenSummary.update(this.hiddenAlgos.size);
    this._soloResult.update();
    saveHiddenAlgos(this, 'fileHidden');
    this._verify.refresh();
    this._cancelIfIdle();
    if (resetSpotlight) AlgoSpotlight.reset();
  },

  _toggleAll({ refreshTooltip = false, resetSpotlight = true } = {}) {
    const allVisible = _ALGORITHMS.every((a) => !this.hiddenAlgos.has(a.id));
    for (const { id } of _ALGORITHMS) {
      if (allVisible || this.hiddenAlgos.has(id)) this._setHidden(id, allVisible);
    }
    this._afterVisibilityChange({ resetSpotlight });
    if (refreshTooltip) showToggleAllTooltip('fileToggleAllBtn', this.hiddenAlgos, _ALGORITHMS);
  },

  _toggleAlgo(algoId, { refreshTooltip = false, resetSpotlight = true } = {}) {
    this._setHidden(algoId, !this.hiddenAlgos.has(algoId));
    // Refresh the tooltip to reflect the new state while it may still be visible —
    // only for a direct click on this badge, not when driven by AlgoSpotlight.
    if (refreshTooltip) Tooltip.show(this.rowEls.get(algoId).badge, this.hiddenAlgos.has(algoId) ? 'Show' : 'Hide');
    this._afterVisibilityChange({ resetSpotlight });
  },

  // ── Hash helpers ───────────────────────────────────────────────────────

  /** What a visible row with no digest says: nothing was chosen, or the file was hashed (or its
   *  run stopped) without this algorithm, which was hidden at the time. */
  _emptyText() {
    return this.currentFileName ? 'not computed' : 'no file selected';
  },

  /** Enter computing state: the row shows a progress fill and the hash cell scrambled
   *  characters in place of the digest (see components/hash-progress.js). */
  _startComputing(els) {
    els.progress.start();
    setHashEmpty(els.hash, false);
  },

  /** Exit computing state at once. The caller sets whatever the cell shows instead. */
  _clearComputingState(els) {
    els.progress.stop();
  },

  getSelectedFormat() {
    return document.querySelector('input[name="fileFormat"]:checked').value;
  },

  _formattedHash(algoId) {
    const hex = this.rawHexMap.get(algoId);
    return hex ? Format.applyFormat(hex, this.getSelectedFormat()) : '';
  },

  _reformatAll(record = false) {
    const items = [];
    for (const { id } of _ALGORITHMS) {
      if (this.hiddenAlgos.has(id)) continue;
      const hex = this.rawHexMap.get(id);
      if (!hex) continue;
      const hash = Format.applyFormat(hex, this.getSelectedFormat());
      setHashText(this.rowEls.get(id).hash, hash);
      items.push({ hash, algo: id });
    }
    if (record) History.record('file', items, this._currentBatchId, this.currentFileName);
    // Rewriting the text drops any marks showing where a hash differs from the reference.
    this._verify.refresh();
  },

  _setAllActionsEnabled(enabled) {
    for (const [id, els] of this.rowEls.entries()) {
      if (!this.hiddenAlgos.has(id)) setRowActions(els, enabled);
    }
  },

  // ── File size helper ────────────────────────────────────────────────────

  _formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
  },

  /** Mirrors a file that didn't come through the input itself (drop, paste) into it. */
  _setInputFile(file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    this._input.files = dt.files;
  },

  /** A file pasted outside any field: loaded like a drop, and the section brought
   *  into view since that's where the hashes appear. */
  pasteFile(file) {
    this._setInputFile(file);
    this._drop.closest('.section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.processFile(file);
  },

  async processFile(file) {
    // A file still hashing is abandoned, not left to finish over this one.
    this._run?.controller.abort();
    const controller = new AbortController();
    const visibleAlgos = _ALGORITHMS.filter((a) => !this.hiddenAlgos.has(a.id));
    this._run = { controller, ids: new Set(visibleAlgos.map((a) => a.id)) };

    this.currentFileName = file.name;
    this._fileNameText.textContent = file.name;
    this._fileSize.textContent = ` · ${this._formatFileSize(file.size)}`;
    this._fileName.classList.add('file-drop__filename--visible');
    this._dropClear.classList.add('file-drop__clear--visible');

    // The previous file's digests must not outlive it: until this run finishes there are none, so
    // nothing copies, reformats or records them under the new file's name.
    this.rawHexMap = new Map();
    this._verify.setDigests(null);

    // Nothing to compute: don't read the whole file for it.
    if (!visibleAlgos.length) {
      this._run = null;
      this._showNothingToHash();
      return;
    }

    const title = TabTitle.track();
    const stats = createRunStats(file.size, { threads: _Hasher.threadsFor(visibleAlgos) });
    this._stats.classList.add('file-drop__stats--visible');
    this._setStats(stats.start(), 'busy');

    for (const { id } of _ALGORITHMS) {
      if (this.hiddenAlgos.has(id)) continue;
      this._startComputing(this.rowEls.get(id));
    }
    this._setAllActionsEnabled(false);

    const onProgress = (ratio) => {
      title.progress(ratio);
      const line = stats.update(ratio);
      if (line) this._setStats(line, 'busy');
      for (const { id } of _ALGORITHMS) {
        if (this.hiddenAlgos.has(id)) continue;
        this.rowEls.get(id).progress.set(ratio);
      }
    };

    try {
      const hexMap = await _Hasher.fromFileAll(file, onProgress, visibleAlgos, controller.signal);
      if (controller.signal.aborted) return; // cleared or replaced just as it finished
      this.rawHexMap = hexMap;
      this._currentBatchId = History.nextBatch();
      this._showDigests();
      this._setAllActionsEnabled(true);
      this._verify.setDigests(this.rawHexMap);
      title.done();
      this._setStats(stats.summary(), 'done');
    } catch {
      if (controller.signal.aborted) return; // cancelled: the UI already shows what replaced it
      title.fail();
      this._setStats('Hashing failed', 'error');
      this._showReadError();
    } finally {
      // Only this run's own record: a newer run may already have replaced it.
      if (this._run?.controller === controller) this._run = null;
    }
  },

  /** Shows (and records) the digests of the file just hashed, in the selected output format. */
  _showDigests() {
    const fmt = this.getSelectedFormat();
    const items = [];
    for (const { id } of _ALGORITHMS) {
      if (this.hiddenAlgos.has(id)) continue;
      const els = this.rowEls.get(id);
      const hex = this.rawHexMap.get(id);
      els.progress.stop();
      if (!hex) {
        // Shown while this ran: it was hidden when the file was hashed, so there is no digest.
        setHashText(els.hash, this._emptyText());
        setHashEmpty(els.hash, true);
        continue;
      }
      const hash = Format.applyFormat(hex, fmt);
      setHashText(els.hash, hash);
      items.push({ hash, algo: id });
    }
    History.record('file', items, this._currentBatchId, this.currentFileName);
  },

  /** Every algorithm is hidden, so a file was taken but nothing is computed for it. */
  _showNothingToHash() {
    TabTitle.reset();
    this._stats.classList.add('file-drop__stats--visible');
    this._setStats('Nothing to hash', 'warn');
    for (const { id } of _ALGORITHMS) {
      const els = this.rowEls.get(id);
      this._clearComputingState(els);
      setHashText(els.hash, 'disabled');
      setHashEmpty(els.hash, true);
    }
    this._setAllActionsEnabled(false);
  },

  /** The status row under the file name. `state` picks its icon: 'busy' (spinner),
   *  'done' (✓), 'error' (✕) or 'warn' (⚠); none for an empty row. */
  _setStats(text, state = '') {
    this._statsText.textContent = text;
    this._stats.dataset.state = state;
  },

  /** The visible rows could not be computed: say so where the digests would be. */
  _showReadError() {
    for (const { id } of _ALGORITHMS) {
      if (this.hiddenAlgos.has(id)) continue;
      const els = this.rowEls.get(id);
      this._clearComputingState(els);
      setHashText(els.hash, 'error reading file');
      setHashEmpty(els.hash, true);
    }
  },

  /** Hiding the last algorithm a running pass was computing leaves nothing for it
   *  to produce, so stop it instead of letting it read the rest of the file for
   *  results nobody can see. */
  _cancelIfIdle() {
    const run = this._run;
    if (!run || ![...run.ids].every((id) => this.hiddenAlgos.has(id))) return;
    run.controller.abort();
    this._run = null;
    TabTitle.reset();
    this._setStats('Hashing stopped', 'error');
  },

  onClear() {
    this._run?.controller.abort();
    this._run = null;
    TabTitle.reset();
    this._stats.classList.remove('file-drop__stats--visible');
    this._setStats('');
    this.rawHexMap.clear();
    this.currentFileName = '';
    this._input.value = '';
    this._fileNameText.textContent = '';
    this._fileSize.textContent = '';
    this._fileName.classList.remove('file-drop__filename--visible');
    this._dropClear.classList.remove('file-drop__clear--visible');
    // The button may hide under the pointer without firing mouseleave.
    this._drop.classList.remove('file-drop--clear-hover');
    for (const { id } of _ALGORITHMS) {
      const els = this.rowEls.get(id);
      this._clearComputingState(els);
      setHashText(els.hash, this.hiddenAlgos.has(id) ? 'disabled' : 'no file selected');
      setHashEmpty(els.hash, true);
    }
    this._setAllActionsEnabled(false);
    this._verify.setDigests(null);
    this._verify.clear();
  },

  _onDownload(algoId) {
    const hash = this._formattedHash(algoId);
    if (!hash) return;
    const ext = _APP_CONFIG.slugify(algoId);
    const checksumFile = toChecksumFile(hash, ext, this.currentFileName);
    if (checksumFile) {
      Download.trigger(checksumFile.content, checksumFile.filename);
    } else {
      // Base64/binary output: no checksum-file format exists for it, so write the digest alone.
      const base = this.currentFileName
        ? this.currentFileName.replace(/\.[^.]+$/, '')
        : `${_APP_CONFIG.appName}-${_APP_CONFIG.fileNoun}_${Download.filenameSafeTimestamp()}`;
      Download.trigger(hash, `${base}.${ext}`);
    }
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
