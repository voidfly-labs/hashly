import { AlgoSpotlight } from '~core/components/algo-spotlight.js';
import { initButtonTooltip } from '~core/components/button-tooltip.js';
import { Tooltip } from '~core/components/tooltip.js';
import { Preferences } from '~core/services/preferences.js';
import { Storage } from '~core/services/storage.js';
import { Checkmark } from '~core/utils/checkmark.js';
import { Clipboard } from '~core/utils/clipboard.js';
import { toCsv } from '~core/utils/csv.js';
import { Download } from '~core/utils/download.js';
import { iconHref } from '~core/utils/icon.js';

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
    const spotlighted = Storage.read(AlgoSpotlight._SPOTLIGHT_KEY);
    const initialAlgo = ALGORITHMS.some((a) => a.id === spotlighted) ? spotlighted : this._savedAlgo();

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
      const item = document.createElement('div');
      item.className = 'random__item';
      item.dataset.action = 'copy';
      item.dataset.hash = hash;
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
                <svg class="icon-action" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                <svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('check')}"></use></svg>
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
                <svg class="icon-action" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                <svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('check')}"></use></svg>
                <span class="tooltip">Exported</span>
              </button>
            </div>`;

      const randomBadge = item.querySelector('.algo-badge');
      randomBadge.setAttribute('aria-label', `${algo} — ${_tipText}`);
      initButtonTooltip(randomBadge, _tipText);

      // Hover tooltips for icon-only Copy / Download buttons in random list. Their click flashes
      // "Copied!" / "Exported" (see handleItemAction), so it must not hide the tooltip as well.
      item.querySelectorAll('.random__item-btn[data-action]').forEach((btn) => {
        const label = btn.dataset.action === 'copy' ? 'Copy' : 'Download';
        initButtonTooltip(btn, label, { hideOnClick: false });
      });

      fragment.appendChild(item);
    });

    this.elements.list.innerHTML = '';
    this.elements.list.appendChild(fragment);
  },

  handleItemAction(button) {
    const action = button.dataset.action;
    const hash = button.dataset.hash;
    // Only the icon button itself has an icon to morph — a click on the
    // hash text or elsewhere in the row also routes here via delegation.
    const isIconBtn = button.classList.contains('random__item-btn');

    if (action === 'copy') {
      Clipboard.copy(hash);
      Tooltip.flash(button);
      if (isIconBtn) Checkmark.flash(button);
    } else if (action === 'download') {
      const index = button.dataset.index;
      const algo = button.dataset.algo ?? _DEFAULT_ALGO;
      this._downloadCsv([[index, algo, hash]]);
      Tooltip.flash(button);
      if (isIconBtn) Checkmark.flash(button);
    }
  },

  /** Downloads `rows` ([id, algorithm, hash]) as a timestamped CSV file. */
  _downloadCsv(rows) {
    const filename = `${_APP_CONFIG.appName}-random_${Download.filenameSafeTimestamp()}.csv`;
    Download.trigger(toCsv(['id', 'algorithm', 'hash'], rows, { guard: [] }), filename, 'text/csv;charset=utf-8');
  },

  async onCopyAll() {
    const text = this.hashes.map(({ hash }) => hash).join('\n');
    await Clipboard.copy(text);
    Tooltip.flash(this.elements.copyAll);
    Checkmark.flash(this.elements.copyAll);
  },

  onDownloadAll() {
    this._downloadCsv(this.hashes.map(({ hash, algo }, i) => [i + 1, algo, hash]));
    Tooltip.flash(this.elements.downloadAll);
    Checkmark.flash(this.elements.downloadAll);
  },
};
