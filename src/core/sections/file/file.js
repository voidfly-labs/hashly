import { TabTitle } from '~core/features/hashing/tab-title.js';
import { History } from '~core/features/history/history.js';
import { rememberRadioGroup, restoreHiddenAlgos, saveHiddenAlgos } from '~core/features/preferences/saved-view.js';
import { downloadDigest } from '~core/features/results/export/download-digest.js';
import { createHiddenAlgos } from '~core/features/results/hidden/hidden-algos.js';
import { createHiddenSummary } from '~core/features/results/hidden/hidden-summary.js';
import { updateToggleAllButton } from '~core/features/results/result-row.js';
import { createSoloResult } from '~core/features/results/solo-result.js';
import { expandSection } from '~core/features/section-collapse/section-collapse.js';
import { AlgoSpotlight } from '~core/features/spotlight/algo-spotlight.js';
import { createVerify } from '~core/features/verify/verify.js';
import { Format } from '~core/lib/format.js';
import { Checkmark } from '~core/ui/button/checkmark.js';
import { copyWithFeedback } from '~core/ui/button/copy-feedback.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

import { createFileDrop } from './file-drop.js';
import { createFileRows } from './file-rows.js';
import { startFileRun } from './file-run.js';

let _APP_CONFIG, _ALGORITHMS, _Hasher;

/** The File section: hashes a file with every visible algorithm and shows the digests. The drop zone
 *  is ./file-drop.js, the rows ./file-rows.js and the pass that reads the file ./file-run.js. */
export const FileSection = {
  // rawHexMap: Map<algoId, hex>
  rawHexMap: new Map(),
  hiddenAlgos: new Set(),
  currentFileName: '',
  // The pass hashing the file, if any (see file-run.js). Aborted by clearing the file, dropping
  // another over it, or hiding every algorithm it computes.
  _run: null,
  // Shared batchId for all algorithms in the current file computation.
  _currentBatchId: null,

  init({ APP_CONFIG, ALGORITHMS, Hasher }) {
    _APP_CONFIG = APP_CONFIG;
    _ALGORITHMS = ALGORITHMS;
    _Hasher = Hasher;

    this.hiddenAlgos = new Set(_APP_CONFIG.defaultHiddenAlgos ?? []);
    this._hidden = createHiddenAlgos({
      algorithms: _ALGORITHMS,
      hiddenAlgos: this.hiddenAlgos,
      setHidden: (algoId, hidden) => this._setHidden(algoId, hidden),
      afterChange: (opts) => this._afterVisibilityChange(opts),
      getBadge: (algoId) => this._rows.get(algoId).badge,
      toggleAllBtnId: 'fileToggleAllBtn',
    });

    const resultsEl = document.getElementById('fileResults');

    // Build one result row per algorithm.
    this._rows = createFileRows({
      resultsEl,
      algorithms: _ALGORITHMS,
      isHidden: (id) => this.hiddenAlgos.has(id),
      hasFile: () => Boolean(this.currentFileName),
      handlers: {
        onToggle: (id) => this._toggleAlgo(id, { refreshTooltip: true }),
        onDownload: (id) => this._onDownload(id),
        onCopy: (id) => this._onCopy(id),
        getHash: (id) => this._formattedHash(id),
      },
    });
    this._verify = createVerify({
      getFileName: () => this.currentFileName,
      root: document.getElementById('fileVerify'),
      algorithms: _ALGORITHMS,
      getRow: (id) => this._rows.get(id).row,
      isHidden: (id) => this.hiddenAlgos.has(id),
    });
    this._hiddenSummary = createHiddenSummary({
      resultsEl,
      total: _ALGORITHMS.length,
      onShowAll: () => this._toggleAll(),
    });
    this._soloResult = createSoloResult({ resultsEl, algorithms: _ALGORITHMS });
    // Sync button icon and hidden-algorithms summary with initial hiddenAlgos state.
    updateToggleAllButton('fileToggleAllBtn', this.hiddenAlgos, _ALGORITHMS, 'file');
    this._hiddenSummary.update(this.hiddenAlgos.size);
    this._soloResult.update();

    // Put back the visitor's saved output format and hidden algorithms (and keep saving them).
    rememberRadioGroup('fileFormat', 'fileOutputFormat');
    restoreHiddenAlgos(this, 'fileHidden', _ALGORITHMS);

    this._drop = createFileDrop({
      hasFile: () => Boolean(this.currentFileName),
      onFile: (file) => this.processFile(file),
      onClear: () => this.onClear(),
    });

    document
      .querySelectorAll('input[name="fileFormat"]')
      .forEach((radio) => radio.addEventListener('change', () => this._reformatAll(true)));
  },

  // ── Showing and hiding algorithms ──────────────────────────────────────

  /** Hides or shows one algorithm's row. Showing puts back its digest if the file has been hashed
   *  with it, and otherwise says so. */
  _setHidden(algoId, hidden) {
    if (hidden) {
      this.hiddenAlgos.add(algoId);
      this._rows.hide(algoId);
      return;
    }
    this.hiddenAlgos.delete(algoId);
    this._rows.show(algoId, this._formattedHash(algoId));
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

  _toggleAll(options) {
    this._hidden.toggleAll(options);
  },

  _toggleAlgo(algoId, options) {
    this._hidden.toggleAlgo(algoId, options);
  },

  // ── Digests ────────────────────────────────────────────────────────────

  getSelectedFormat() {
    return document.querySelector('input[name="fileFormat"]:checked').value;
  },

  _formattedHash(algoId) {
    const hex = this.rawHexMap.get(algoId);
    return hex ? Format.applyFormat(hex, this.getSelectedFormat()) : '';
  },

  _reformatAll(record = false) {
    const items = this._rows.reformat(this.rawHexMap, this.getSelectedFormat());
    if (record) History.record('file', items, this._currentBatchId, this.currentFileName);
    // Rewriting the text drops any marks showing where a hash differs from the reference.
    this._verify.refresh();
  },

  /** Shows (and records) the digests of the file just hashed, in the selected output format. */
  _showDigests() {
    const items = this._rows.showDigests(this.rawHexMap, this.getSelectedFormat());
    History.record('file', items, this._currentBatchId, this.currentFileName);
  },

  // ── Hashing a file ─────────────────────────────────────────────────────

  /** A file pasted outside any field: loaded like a drop, and the section brought
   *  into view since that's where the hashes appear. */
  pasteFile(file) {
    this._drop.mirrorInput(file);
    this._drop.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.processFile(file);
  },

  async processFile(file) {
    // A file dropped or pasted into a collapsed section opens it, to show what happens to the file.
    expandSection(this._drop.section);
    // A file still hashing is abandoned, not left to finish over this one.
    this._run?.abort();
    this._run = null;
    const visibleAlgos = _ALGORITHMS.filter((a) => !this.hiddenAlgos.has(a.id));

    this.currentFileName = file.name;
    this._drop.showFile(file);

    // The previous file's digests must not outlive it: until this run finishes there are none, so
    // nothing copies, reformats or records them under the new file's name.
    this.rawHexMap = new Map();
    this._verify.setDigests(null);

    // Nothing to compute: don't read the whole file for it.
    if (!visibleAlgos.length) {
      this._showNothingToHash();
      return;
    }

    const run = startFileRun({
      file,
      algos: visibleAlgos,
      hasher: _Hasher,
      setStats: (text, state) => this._drop.setStats(text, state),
      onProgress: (ratio) => this._rows.setProgress(ratio),
    });
    this._run = run;
    this._drop.showStats();
    this._rows.startComputing();
    this._rows.setActionsEnabled(false);

    try {
      const hexMap = await run.result;
      if (run.aborted) return; // cleared or replaced just as it finished
      this.rawHexMap = hexMap;
      this._currentBatchId = History.nextBatch();
      this._showDigests();
      this._rows.setActionsEnabled(true);
      this._verify.setDigests(this.rawHexMap);
      run.succeed();
    } catch {
      if (run.aborted) return; // cancelled: the UI already shows what replaced it
      run.fail();
      this._rows.showReadError();
    } finally {
      // Only this run's own record: a newer run may already have replaced it.
      if (this._run === run) this._run = null;
    }
  },

  /** Every algorithm is hidden, so a file was taken but nothing is computed for it. */
  _showNothingToHash() {
    TabTitle.reset();
    this._drop.showStats();
    this._drop.setStats('Nothing to hash', 'warn');
    this._rows.showNothingToHash();
  },

  /** Hiding the last algorithm a running pass was computing leaves nothing for it
   *  to produce, so stop it instead of letting it read the rest of the file for
   *  results nobody can see. */
  _cancelIfIdle() {
    const run = this._run;
    if (!run?.isIdle(this.hiddenAlgos)) return;
    run.abort();
    this._run = null;
    TabTitle.reset();
    this._drop.setStats('Hashing stopped', 'error');
  },

  onClear() {
    this._run?.abort();
    this._run = null;
    TabTitle.reset();
    this._drop.hideStats();
    this._drop.setStats('');
    this.rawHexMap.clear();
    this.currentFileName = '';
    this._drop.clearFile();
    this._rows.reset();
    this._verify.setDigests(null);
    this._verify.clear();
  },

  // ── Row actions ────────────────────────────────────────────────────────

  _onDownload(algoId) {
    const hash = this._formattedHash(algoId);
    if (!hash) return;
    downloadDigest(hash, algoId, this.currentFileName, _APP_CONFIG);
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
