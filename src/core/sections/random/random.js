import { downloadTable } from '~core/features/export/download-table.js';
import { initDownloadTooltip } from '~core/features/export/download-tooltip.js';
import { createExportFormatPicker } from '~core/features/export/export-format-picker.js';
import { defaultExportFormat, watchExportFormat } from '~core/features/export/export-setting.js';
import { Preferences } from '~core/features/preferences/preferences.js';
import { AlgoSpotlight } from '~core/features/spotlight/algo-spotlight.js';
import { Download } from '~core/lib/export/download.js';
import { Checkmark } from '~core/ui/button/checkmark.js';
import { copyWithFeedback } from '~core/ui/button/copy-feedback.js';
import { flashDone } from '~core/ui/button/flash-done.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

import { createRandomItem } from './random-item.js';

let _APP_CONFIG, _ALGORITHMS, _DEFAULT_ALGO, _Hasher;

export const RandomSection = {
  elements: {},
  hashes: [], // [{ hash, algo }]

  init({ APP_CONFIG, ALGORITHMS, DEFAULT_ALGO, Hasher }) {
    _APP_CONFIG = APP_CONFIG;
    _ALGORITHMS = ALGORITHMS;
    _DEFAULT_ALGO = DEFAULT_ALGO;
    _Hasher = Hasher;

    this.elements = {
      list: document.getElementById('random-list'),
      regenerate: document.getElementById('random-regenerate'),
      count: document.getElementById('random-count'),
      algo: document.getElementById('random-algo'),
      copyAll: document.getElementById('random-copy-all'),
      downloadAll: document.getElementById('random-download-all'),
    };

    // Default to whatever algorithm is spotlighted via the header Quick
    // Select badges, if any, rather than always DEFAULT_ALGO.
    // Otherwise to the algorithm the visitor last picked here, then to DEFAULT_ALGO.
    const initialAlgo = AlgoSpotlight.saved(ALGORITHMS) ?? this._savedAlgo();

    // Populate algorithm options from ALGORITHMS (single source of truth)
    this.elements.algo.innerHTML = _ALGORITHMS
      .map(({ id }) => `<option value="${id}"${id === initialAlgo ? ' selected' : ''}>${id}</option>`)
      .join('');

    const savedCount = Preferences.get('randomCount');
    if ([...this.elements.count.options].some((o) => o.value === savedCount)) this.elements.count.value = savedCount;

    this.elements.regenerate.addEventListener('click', () => this.generate());
    this.elements.count.addEventListener('change', () => {
      Preferences.set('randomCount', this.elements.count.value);
      this.generate();
    });
    this.elements.algo.addEventListener('change', () => {
      Preferences.set('randomAlgo', this.elements.algo.value);
      this.generate();
    });
    this.elements.copyAll.addEventListener('click', () => this.onCopyAll());
    this.elements.downloadAll.addEventListener('click', () => this.onDownloadAll());
    this.elements.downloadAll.after(createExportFormatPicker({ onPick: (format) => this.onDownloadAll(format) }));
    initDownloadTooltip(this.elements.downloadAll);
    watchExportFormat(({ label }) => {
      this.elements.downloadAll.setAttribute('aria-label', `Download all as ${label}`);
    });

    // Event-delegate clicks on hash items (copy / download per-item)
    this.elements.list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      this.handleItemAction(btn);
    });

    this.generate();
  },

  /** The algorithm the visitor last picked in the select, if it still exists, else the default. */
  _savedAlgo() {
    const saved = Preferences.get('randomAlgo');
    return _ALGORITHMS.some((a) => a.id === saved) ? saved : _DEFAULT_ALGO;
  },

  /** Called by AlgoSpotlight whenever the header Quick Select badges
   *  spotlight/un-spotlight an algorithm — algoId is null on un-spotlight,
   *  in which case Random falls back to the app's default. */
  applySpotlight(algoId) {
    const target = algoId && _ALGORITHMS.some((a) => a.id === algoId) ? algoId : this._savedAlgo();
    if (this.elements.algo.value === target) return;
    this.elements.algo.value = target;
    this.generate();
  },

  generate() {
    const count = Number.parseInt(this.elements.count.value, 10);
    const algo = this.elements.algo.value;
    this.hashes = Array.from({ length: count }, () => ({
      hash: _Hasher.generateRandom(algo),
      algo,
    }));
    this.render();
  },

  render() {
    const fragment = document.createDocumentFragment();
    const padWidth = this.hashes.length > 100 ? 3 : 2;

    const _curAlgo = this.hashes[0]?.algo ?? _DEFAULT_ALGO;
    const _algoMeta = _ALGORITHMS.find((a) => a.id === _curAlgo);
    const _tipText = _algoMeta ? `${_algoMeta.bits}-bit · ${_algoMeta.hexLen} hex chars` : _curAlgo;

    this.hashes.forEach(({ hash, algo }, index) => {
      const item = createRandomItem({ hash, algo, number: index + 1, padWidth, tip: _tipText });
      fragment.appendChild(item);
    });

    this.elements.list.innerHTML = '';
    this.elements.list.appendChild(fragment);
  },

  async handleItemAction(button) {
    const action = button.dataset.action;
    const hash = button.dataset.hash;
    // Only the icon button itself has an icon to morph — a click on the
    // hash text or elsewhere in the row also routes here via delegation.
    const isIconBtn = button.classList.contains('random__item-btn');

    if (action === 'copy') {
      // A click on the row's text copies too, and turns the Copy button's icon into a check as its own click does.
      const copyBtn = isIconBtn
        ? button
        : button.closest('.random__item')?.querySelector('[data-action="copy"].random__item-btn');
      await copyWithFeedback(hash, { anchor: button, button: copyBtn });
    } else if (action === 'download') {
      const index = button.dataset.index;
      const algo = button.dataset.algo ?? _DEFAULT_ALGO;
      this._download([[Number(index), algo, hash]]);
      Tooltip.flash(button);
      if (isIconBtn) Checkmark.flash(button);
    }
  },

  /** Downloads `rows` ([id, algorithm, hash]) as a timestamped file, in `format` (the one chosen in Settings by default). */
  _download(rows, format = defaultExportFormat()) {
    const table = { root: 'random', item: 'entry', columns: ['id', 'algorithm', 'hash'], rows };
    downloadTable({
      table,
      format,
      baseName: `${_APP_CONFIG.appName}-random_${Download.filenameSafeTimestamp()}`,
      guard: [], // generated, and a Base64 digest may start with "+"
    });
  },

  async onCopyAll() {
    const text = this.hashes.map(({ hash }) => hash).join('\n');
    await copyWithFeedback(text, { button: this.elements.copyAll });
  },

  onDownloadAll(format) {
    this._download(
      this.hashes.map(({ hash, algo }, i) => [i + 1, algo, hash]),
      format,
    );
    flashDone(this.elements.downloadAll);
  },
};
