import { TabTitle } from '~core/features/hashing/tab-title.js';
import { History } from '~core/features/history/history.js';
import { initialHiddenAlgos, rememberRadioGroup, saveHiddenAlgos } from '~core/features/preferences/saved-view.js';
import { downloadDigest } from '~core/features/results/export/download-digest.js';
import { createHiddenAlgos } from '~core/features/results/hidden/hidden-algos.js';
import { createHiddenSummary } from '~core/features/results/hidden/hidden-summary.js';
import { updateToggleAllButton } from '~core/features/results/result-row.js';
import { createSoloResult } from '~core/features/results/solo-result.js';
import { expandSection } from '~core/features/section-collapse/section-collapse.js';
import { Settings } from '~core/features/settings/settings.js';
import { AlgoSpotlight } from '~core/features/spotlight/algo-spotlight.js';
import { describeManifest, hexLengthsOf } from '~core/features/verify/manifest.js';
import { createVerify } from '~core/features/verify/verify.js';
import { Format } from '~core/lib/format.js';
import { Announcer } from '~core/ui/announcer/announcer.js';
import { Checkmark } from '~core/ui/button/checkmark.js';
import { copyWithFeedback } from '~core/ui/button/copy-feedback.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

import { createFileDrop } from './file-drop.js';
import { createJobView } from './file-job-view.js';
import { createFileList } from './file-list.js';
import { createFileQueue } from './file-queue.js';
import { createFileRows } from './file-rows.js';
import { startFileRun } from './file-run.js';
import { describeDrop, describeQueueEnd, statsPrefix } from './file-summary.js';
import { createManifestExport } from './manifest/manifest-export.js';
import { createManifestRow } from './manifest/manifest-row.js';
import { takeManifest } from './manifest/take-manifest.js';

let _APP_CONFIG, _ALGORITHMS, _Hasher;

// What `rawHexMap` is with no file: never written to.
const NO_DIGESTS = new Map();

/** The File section: hashes the files of a drop, one after the other, with every visible algorithm,
 *  and shows the digests of the selected one. The drop zone is ./file-drop.js, the queue of files
 *  ./file-queue.js (and its list ./file-list.js), the rows ./file-rows.js, how a file looks on them
 *  ./file-job-view.js and the pass that reads a file ./file-run.js. */
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
    _Hasher = Hasher;

    this._manifest = createManifestExport({
      algorithms: _ALGORITHMS,
      isHidden: (id) => this.hiddenAlgos.has(id),
      getJobs: () => this._queue.jobs,
      getFormat: () => this.getSelectedFormat(),
      slugify: (id) => _APP_CONFIG.slugify(id),
    });
    this._queue = createFileQueue({
      runJob: (job) => this._runJob(job),
      // The notice for the manifest counts the files, so it follows the queue; it redraws the list.
      onChange: () => this._verify.refresh(),
      onSelect: (job) => this._view.show(job),
      onDone: (result) => this._onQueueDone(result),
    });
    this.hiddenAlgos = initialHiddenAlgos('fileHidden', this.defaultHidden(), _ALGORITHMS);
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
      getManifestSummary: (manifest) =>
        describeManifest(manifest, this._queue.jobs, (job) => this._verify.verdictFor(job.rawHexMap, job.name)),
      onChange: () => this._renderList(),
    });
    this._view = createJobView({
      rows: this._rows,
      verify: this._verify,
      getFormat: () => this.getSelectedFormat(),
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

    // Put back the visitor's saved output format (and keep saving it).
    rememberRadioGroup('fileFormat', 'fileOutputFormat');

    this._list = createFileList({
      root: document.getElementById('fileList'),
      onSelect: (id) => this._queue.select(id),
      onRemove: (id) => this._removeJob(id),
      verdictOf: ({ rawHexMap, name }) => this._verify.verdictFor(rawHexMap, name),
      manifestRow: createManifestRow({
        onCopy: (button) => this._manifest.copy(button),
        onDownload: (button) => this._manifest.download(button),
      }),
    });
    this._drop = createFileDrop({
      hasFile: () => Boolean(this._job),
      getLimit: () => Settings.get('maxFiles'),
      onFiles: (files, options) => this.processFiles(files, options),
      onClear: () => this.onClear(),
    });

    document
      .querySelectorAll('input[name="fileFormat"]')
      .forEach((radio) => radio.addEventListener('change', () => this._reformatAll()));
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
    this._renderList();
    updateToggleAllButton('fileToggleAllBtn', this.hiddenAlgos, _ALGORITHMS, 'file');
    this._hiddenSummary.update(this.hiddenAlgos.size);
    this._soloResult.update();
    saveHiddenAlgos(this, 'fileHidden');
    this._verify.refresh();
    this._cancelIfIdle();
    if (resetSpotlight) AlgoSpotlight.reset();
  },

  /** The algorithms hidden in the app's default view. */
  defaultHidden() {
    return new Set(_APP_CONFIG.defaultHiddenAlgos ?? []);
  },

  /** Persists which algorithms are hidden (the spotlight calls it for every section when it ends). */
  saveHidden() {
    saveHiddenAlgos(this, 'fileHidden');
  },

  _toggleAll(options) {
    this._hidden.toggleAll(options);
  },

  _toggleAlgo(algoId, options) {
    this._hidden.toggleAlgo(algoId, options);
  },

  _setHiddenAlgos(hidden, options) {
    this._hidden.setHiddenTo(hidden, options);
  },

  // ── Digests ────────────────────────────────────────────────────────────

  getSelectedFormat() {
    return document.querySelector('input[name="fileFormat"]:checked').value;
  },

  _formattedHash(algoId) {
    const hex = this.rawHexMap.get(algoId);
    return hex ? Format.applyFormat(hex, this.getSelectedFormat()) : '';
  },

  _reformatAll() {
    this._rows.reformat(this.rawHexMap, this.getSelectedFormat());
    // Rewriting the text drops any marks showing where a hash differs from the reference.
    this._verify.refresh();
  },

  /** The `[{ hash, algo }]` of the visible algorithms among `digests` (`Map<id, hex>`). */
  _digestItems(digests) {
    return _ALGORITHMS
      .filter(({ id }) => !this.hiddenAlgos.has(id) && digests.get(id))
      .map(({ id }) => ({ hash: digests.get(id), algo: id }));
  },

  /** One share of `job`'s hashing is done, while the others go on: its digests are recorded (in the
   *  batch of this file) and, if the job is the one shown, shown, can be copied and are compared
   *  with the reference now. */
  _onShare(job, digests) {
    for (const [id, hex] of digests) job.rawHexMap.set(id, hex);
    History.record('file', this._digestItems(digests), job.batchId, job.name);
    if (this._job === job) this._view.addDigests(job, digests);
  },

  // ── Hashing the files ──────────────────────────────────────────────────

  /** A file pasted outside any field: loaded like a drop, and the section brought
   *  into view since that's where the hashes appear. */
  pasteFile(file) {
    this._drop.mirrorInput([file]);
    this._drop.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.processFiles([{ file, path: file.name }]);
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
    if (truncated || taken.length < files.length) this._drop.notify(`Only the first ${limit} files were taken`);
    if (!taken.length) return;
    this._queue.start(taken);
    this._drop.showFile(describeDrop(this._queue.jobs), taken.length);
    this._drop.showStats();
  },

  /** Says `text` on the drop zone's status line for `job`, the file being hashed. The last line is
   *  kept, to be said again when the number of files in front of it changes (see `_removeJob`). */
  _setJobStats(job, text, state) {
    job.stats = { text, state };
    this._drop.setStats(statsPrefix(this._queue.jobs, job) + text, state);
  },

  /** Hashes one file of the queue (see file-queue.js), and settles when it is over, however it ended. */
  async _runJob(job) {
    const algos = _ALGORITHMS.filter(({ id }) => !this.hiddenAlgos.has(id));
    if (algos.length) await this._hashJob(job, algos);
    else this._skipJob(job);
  },

  /** Nothing to compute for `job`: the file is not read at all. */
  _skipJob(job) {
    job.status = 'skipped';
    TabTitle.reset();
    this._setJobStats(job, 'Nothing to hash', 'warn');
    if (this._queue.follow(job)) this._view.show(job);
  },

  async _hashJob(job, algos) {
    // One batch for the file: its digests are recorded as the shares of the hashing finish (see _onShare).
    job.batchId = History.nextBatch();
    const run = startFileRun({
      file: job.file,
      algos,
      hasher: _Hasher,
      quiet: this._queue.jobs.length > 1,
      setStats: (text, state) => this._setJobStats(job, text, state),
      onShare: (digests) => this._onShare(job, digests),
      onProgress: (ratio) => this._list.setProgress(job.id, ratio),
      onShareProgress: (ids, ratio) => {
        if (this._job === job) this._rows.setProgress(ids, ratio);
      },
    });
    job.run = run;
    job.ids = run.ids;
    job.threads = _Hasher.threadsFor(algos);
    if (this._queue.follow(job)) this._view.show(job);

    try {
      // Every digest is in by now, shown by its share; what is left is the end of the run.
      job.rawHexMap = await run.result;
      if (run.aborted) return; // cleared, removed or replaced just as it finished
      job.status = 'done';
      run.succeed();
    } catch {
      if (run.aborted) return; // cancelled: the UI already shows what replaced it
      job.status = 'failed';
      run.fail();
    } finally {
      job.run = null;
    }
    if (this._job === job) this._view.showEnd(job);
  },

  /** The whole queue is over: said once, for several files (a single file's run has said it). */
  _onQueueDone({ jobs, elapsedMs }) {
    this._elapsedMs = elapsedMs;
    const end = describeQueueEnd(jobs, elapsedMs);
    if (!end) return;
    this._drop.setStats(end.text, end.state);
    const title = TabTitle.track();
    if (end.state === 'done') title.done();
    else title.fail();
    Announcer.say(end.text);
  },

  /** A file's ✕ in the list: stops it if it is being hashed and takes it out. */
  _removeJob(id) {
    const wasRunning = this._queue.running?.id === id;
    if (this._queue.remove(id) === 0) {
      this.onClear();
      return;
    }
    // The aborted run never reports its end: drop its progress from the tab title.
    if (wasRunning) TabTitle.reset();
    this._drop.showFile(describeDrop(this._queue.jobs), this._queue.jobs.length);
    this._refreshStats();
  },

  /** Says the status line again, for a queue that has lost a file: the line of the file being hashed
   *  counts the files in its prefix, and that of a finished queue says how many it hashed. */
  _refreshStats() {
    const { jobs, running } = this._queue;
    const last = running ?? jobs[0];
    const end = running ? null : describeQueueEnd(jobs, this._elapsedMs);
    if (end) this._drop.setStats(end.text, end.state);
    else if (last?.stats) this._setJobStats(last, last.stats.text, last.stats.state);
  },

  /** A running pass stops computing the algorithms hidden meanwhile, and once it has none left it is
   *  stopped, instead of reading the rest of the file for results nobody can see. */
  _cancelIfIdle() {
    const job = this._queue.running;
    const run = job?.run;
    if (!run) return;
    run.dropHidden(this.hiddenAlgos);
    if (!run.isIdle()) return;
    job.status = 'stopped';
    run.abort();
    TabTitle.reset();
    this._setJobStats(job, 'Hashing stopped', 'error');
    if (this._job === job) this._view.showEnd(job);
  },

  onClear() {
    this._queue.clear();
    TabTitle.reset();
    this._drop.hideStats();
    this._drop.setStats('');
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
