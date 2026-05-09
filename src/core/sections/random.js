import { Clipboard } from '@core/utils/clipboard.js';
import { Download } from '@core/utils/download.js';
import { Tooltip } from '@core/components/tooltip.js';

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
      list: document.getElementById('randomList'),
      regenerate: document.getElementById('randomRegenerate'),
      count: document.getElementById('randomCount'),
      algo: document.getElementById('randomAlgo'),
      copyAll: document.getElementById('randomCopyAll'),
      downloadAll: document.getElementById('randomDownloadAll'),
    };

    // Populate algorithm options from ALGORITHMS (single source of truth)
    this.elements.algo.innerHTML = _ALGORITHMS
      .map(({ id }) => `<option value="${id}"${id === _DEFAULT_ALGO ? ' selected' : ''}>${id}</option>`)
      .join('');

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
        const label = btn.dataset.action === 'copy' ? 'Copy' : 'Download';
        btn.addEventListener('mouseenter', () => Tooltip.show(btn, label));
        btn.addEventListener('mouseleave', () => Tooltip.hide());
      });

      fragment.appendChild(item);
    });

    this.elements.list.innerHTML = '';
    this.elements.list.appendChild(fragment);
  },

  handleItemAction(button) {
    const action = button.dataset.action;
    const hash = button.dataset.hash;

    if (action === 'copy') {
      Clipboard.copy(hash);
      Tooltip.flash(button);
    } else if (action === 'download') {
      const index = button.dataset.index;
      const algo = button.dataset.algo ?? _DEFAULT_ALGO;
      const csvData = `id,algorithm,hash\n${index},${algo},${hash}`;
      const filename = `${_APP_CONFIG.appName}-random_${Download.filenameSafeTimestamp()}.csv`;
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
    const filename = `${_APP_CONFIG.appName}-random_${Download.filenameSafeTimestamp()}.csv`;
    Download.trigger(csvData, filename, 'text/csv');
    Tooltip.flash(this.elements.downloadAll);
  },
};
