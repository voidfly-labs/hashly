import { rememberRadioGroup } from '~core/features/preferences/saved-view.js';
import { createResultsPanel } from '~core/features/results/results-panel.js';
import { expandSection } from '~core/features/section-collapse/section-collapse.js';
import { Settings } from '~core/features/settings/settings.js';
import { SettingsOpener } from '~core/features/settings/settings-opener.js';
import { describeManifest, hexLengthsOf } from '~core/features/verify/manifest/manifest.js';
import { createVerify } from '~core/features/verify/verify.js';
import { scrollBehavior } from '~core/lib/motion.js';

import { createFileDrop } from './drop/file-drop.js';
import { createFileRows } from './file-rows.js';
import { createFileList } from './list/file-list.js';
import { createDuplicateKey } from './list/filter/duplicate-key.js';
import { createLimitNotice } from './list/limit/limit-notice.js';
import { createManifestExport } from './manifest/manifest-export.js';
import { createManifestRow } from './manifest/manifest-row.js';
import { takeManifest } from './manifest/take-manifest.js';
import { createFileJobRunner } from './queue/file-job-runner.js';
import { createJobView } from './queue/file-job-view.js';
import { createFileQueue } from './queue/file-queue.js';
import { createFileStatus } from './queue/file-status.js';
import { describeComparison, describeDrop } from './queue/file-summary.js';
import { createUnloadGuard } from './queue/unload-guard.js';

let _APP_CONFIG, _ALGORITHMS;

// What `rawHexMap` is with no file: never written to.
const NO_DIGESTS = new Map();

/** The File section: hashes the files of a drop, as many at a time as the thread budget has room for,
 *  with every visible algorithm, and shows the digests of the selected one. The drop zone is ./drop/file-drop.js, the queue of files
 *  ./queue/file-queue.js (and its list ./list/file-list.js), the rows ./file-rows.js (with what they share with the
 *  Text section, in features/results/results-panel.js), how a file looks on them ./queue/file-job-view.js, the
 *  pass that reads a file ./queue/file-run.js, what is said about the files as they go ./queue/file-status.js and
 *  the hashing of each of them ./queue/file-job-runner.js. */
export const FileSection = {
  hiddenAlgos: new Set(),
  _queue: null,

  _renderList() {
    // The verify field renders while it is built, before there is a list.
    this._list?.render({
      jobs: this._queue.jobs,
      selectedId: this._queue.selectedId,
      manifest: this._manifest.row(),
    });
  },

  /** The file the page shows: the selected job of the queue (see file-queue.js), or null. */
  get _job() {
    return this._queue.selected;
  },
  /** rawHexMap: Map<algoId, hex>, the unformatted digests of the selected file. */
  get rawHexMap() {
    return this._job?.rawHexMap ?? NO_DIGESTS;
  },
  get currentFileName() {
    return this._job?.name ?? '';
  },

  init({ APP_CONFIG, ALGORITHMS, Hasher }) {
    _APP_CONFIG = APP_CONFIG;
    _ALGORITHMS = ALGORITHMS;
    const visibleAlgos = () => ALGORITHMS.filter(({ id }) => !this.hiddenAlgos.has(id));
    const duplicateKey = createDuplicateKey({ algorithms: ALGORITHMS, isHidden: (id) => this.hiddenAlgos.has(id) });

    this._manifest = createManifestExport({
      algorithms: ALGORITHMS,
      isHidden: (id) => this.hiddenAlgos.has(id),
      getJobs: () => this._queue.jobs,
      getFormat: () => this.getSelectedFormat(),
      slugify: (id) => APP_CONFIG.slugify(id),
    });
    const isHashing = () => this._queue.active.length > 0;
    this._unloadGuard = createUnloadGuard({ isBusy: isHashing });
    this._queue = createFileQueue({
      runJob: (job) => this._runner.runJob(job),
      concurrency: () => Hasher.concurrencyFor(visibleAlgos()),
      onStart: () => this._status.onQueueStart(),
      // The notice for the manifest counts the files, so it follows the queue; it redraws the list.
      onChange: () => {
        this._verify.refresh();
        this._unloadGuard.sync();
        this._drop?.refreshClearLabel();
      },
      onSelect: (job) => this._view.show(job),
      onDone: (result) => this._status.onQueueDone(result),
    });

    const resultsEl = document.getElementById('fileResults');

    // One result row per algorithm.
    this._panel = createResultsPanel({
      algorithms: ALGORITHMS,
      appConfig: APP_CONFIG,
      resultsEl,
      noun: 'file',
      hiddenPref: 'fileHidden',
      defaults: this.defaultHidden(),
      formatName: 'fileFormat',
      toggleAllBtnId: 'fileToggleAllBtn',
      createRows: (wiring) =>
        createFileRows({ resultsEl, algorithms: ALGORITHMS, hasFile: () => Boolean(this.currentFileName), ...wiring }),
      getDigests: () => this.rawHexMap,
      getFileName: () => this.currentFileName,
      afterChange: () => {
        this._renderList();
        this._verify.refresh();
        // A running pass stops computing what was hidden meanwhile.
        this._runner.cancelIfIdle();
      },
    });
    this.hiddenAlgos = this._panel.hiddenAlgos;

    this._verify = createVerify({
      getFileName: () => this.currentFileName,
      root: document.getElementById('fileVerify'),
      algorithms: ALGORITHMS,
      getRow: (id) => this._panel.rows.get(id).row,
      isHidden: (id) => this.hiddenAlgos.has(id),
      getManifestSummary: (manifest) =>
        describeManifest(
          manifest,
          this._queue.jobs,
          (job) => this._verify.verdictFor(job.rawHexMap, job.name),
          (job) => this._verify.entriesFor(job.name),
        ),
      getFileNames: () => this._queue.jobs.map(({ name }) => name),
      getComparison: () => describeComparison(this._queue.jobs, duplicateKey),
      onChange: () => this._renderList(),
    });
    this._view = createJobView({
      rows: this._panel.rows,
      verify: this._verify,
      getFormat: () => this.getSelectedFormat(),
    });

    // Put back the visitor's saved output format (and keep saving it).
    rememberRadioGroup('fileFormat', 'fileOutputFormat');

    this._list = createFileList({
      root: document.getElementById('fileList'),
      box: document.getElementById('fileListBox'),
      filter: document.getElementById('fileListFilter'),
      manifestSlot: document.getElementById('fileManifest'),
      onSelect: (id) => this._queue.select(id),
      onRemove: (id) => this._removeJob(id),
      onRetry: (id) => this._queue.retry(id),
      verdictOf: ({ rawHexMap, name }) => this._verify.verdictFor(rawHexMap, name),
      keyOf: duplicateKey,
      manifestRow: createManifestRow({
        onCopy: (button) => this._manifest.copy(button),
        onDownload: (button) => this._manifest.download(button),
      }),
    });
    this._limitNotice = createLimitNotice({
      root: document.getElementById('fileLimitNotice'),
      box: document.getElementById('fileListBox'),
      onRaise: () => SettingsOpener.open({ focus: 'maxFiles' }),
    });
    this._drop = createFileDrop({
      hasFile: () => Boolean(this._job),
      isHashing,
      getLimit: () => Settings.get('maxFiles'),
      onFiles: (files, options) => this.processFiles(files, options),
      onClear: () => this.onClear(),
    });
    this._status = createFileStatus({ queue: this._queue, drop: this._drop, Hasher, visibleAlgos });
    this._runner = createFileJobRunner({
      algorithms: ALGORITHMS,
      Hasher,
      hiddenAlgos: this.hiddenAlgos,
      visibleAlgos,
      queue: this._queue,
      status: this._status,
      rows: this._panel.rows,
      view: this._view,
      list: this._list,
    });

    document
      .querySelectorAll('input[name="fileFormat"]')
      .forEach((radio) => radio.addEventListener('change', () => this._reformatAll()));
  },

  // ── Showing and hiding algorithms ──────────────────────────────────────

  /** The algorithms hidden in the app's default view. */
  defaultHidden() {
    return new Set(_APP_CONFIG.defaultHiddenAlgos ?? []);
  },

  /** Persists which algorithms are hidden (the spotlight calls it for every section when it ends). */
  saveHidden() {
    this._panel.saveHidden();
  },

  _toggleAll(options) {
    this._panel.toggleAll(options);
  },

  _setHiddenAlgos(hidden, options) {
    this._panel.setHiddenTo(hidden, options);
  },

  // ── Formats ────────────────────────────────────────────────────────────

  getSelectedFormat() {
    return this._panel.selectedFormat();
  },

  _reformatAll() {
    this._panel.reformat();
    // Rewriting the text drops any marks showing where a hash differs from the reference.
    this._verify.refresh();
  },

  // ── Hashing the files ──────────────────────────────────────────────────

  /** Files pasted outside any field: loaded like a drop, and the section brought
   *  into view since that's where the hashes appear. */
  pasteFiles(files) {
    this._drop.mirrorInput(files);
    this._drop.section.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    this.processFiles(files.map((file) => ({ file, path: file.name })));
  },

  /** Takes the files of a drop (or pick, or paste) as `{ file, path }`, as many as the settings allow, in
   *  place of any before them: a run still going is abandoned, not left to finish over them.
   *  `truncated` says the drop already left files out. */
  async processFiles(dropped, { truncated = false } = {}) {
    // Files dropped or pasted into a collapsed section open it, to show what happens to them.
    expandSection(this._drop.section);
    const { manifest, files } = await takeManifest(dropped, hexLengthsOf(_ALGORITHMS));
    if (manifest) this._verify.setManifest(manifest);
    const limit = Settings.get('maxFiles');
    const taken = files.slice(0, limit);
    if (truncated || taken.length < files.length) {
      // A dropped folder is only read as far as the limit, so the total is then a lower bound.
      this._limitNotice.show({ limit, total: truncated ? limit : files.length, exact: !truncated });
    } else {
      this._limitNotice.hide();
    }
    if (!taken.length) return;
    this._queue.start(taken);
    this._drop.showFile(describeDrop(this._queue.jobs), taken.length);
    this._drop.showStats();
  },

  /** A file's ✕ in the list: stops it if it is being hashed and takes it out. */
  _removeJob(id) {
    const wasRunning = this._queue.active.some((job) => job.id === id);
    if (this._queue.remove(id) === 0) {
      this.onClear();
      return;
    }
    // The aborted run never reports its end: drop its progress from the tab title.
    if (wasRunning) this._status.resetTitle();
    this._drop.showFile(describeDrop(this._queue.jobs), this._queue.jobs.length);
    this._status.refresh();
  },

  onClear() {
    this._limitNotice.hide();
    this._queue.clear();
    this._status.clear();
    this._drop.hideStats();
    this._drop.setStats('');
    this._drop.clearFile();
    this._panel.rows.reset();
    this._verify.setDigests(null);
    this._verify.clear();
  },
};
