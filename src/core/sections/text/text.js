import { rememberRadioGroup } from '~core/features/preferences/saved-view.js';
import { createResultsPanel } from '~core/features/results/results-panel.js';

import { createTextCounter } from './counter/text-counter.js';
import { selectedInputFormat } from './input-format.js';
import { initTextDrop } from './text-drop.js';
import { createTextHashing } from './text-hashing.js';
import { createTextHistory } from './text-history.js';
import { createTextInput } from './text-input.js';
import { createTextRows } from './text-rows.js';

/** The Text section: hashes what is typed, pasted or dropped in its field with every algorithm, and
 *  shows the digests. The field is ./text-input.js (and ./text-drop.js), the hashing of it
 *  ./text-hashing.js, the rows ./text-rows.js (with what they share with the File section, in
 *  features/results/results-panel.js), the counter under the field ./counter/text-counter.js and what
 *  goes in the history ./text-history.js. */
export const TextSection = {
  hiddenAlgos: new Set(),

  init({ APP_CONFIG, ALGORITHMS, Hasher }) {
    this._history = createTextHistory({
      hasDigests: () => this._hashing.digests.size > 0,
      getItems: () =>
        ALGORITHMS.filter(({ id }) => !this.hiddenAlgos.has(id)).map(({ id }) => ({
          hash: this._hashing.digests.get(id),
          algo: id,
        })),
    });

    const resultsEl = document.getElementById('textResults');
    this._counter = createTextCounter({
      charsEl: document.getElementById('textCounterChars'),
      bytesEl: document.getElementById('textCounterBytes'),
      notesEl: document.getElementById('textCounterNotes'),
    });

    // One result row per algorithm (least to most complex = ALGORITHMS order).
    this._panel = createResultsPanel({
      algorithms: ALGORITHMS,
      appConfig: APP_CONFIG,
      resultsEl,
      noun: 'text',
      hiddenPref: 'textHidden',
      defaults: this.defaultHidden(),
      formatName: 'textFormat',
      toggleAllBtnId: 'textToggleAllBtn',
      createRows: (wiring) => createTextRows({ resultsEl, algorithms: ALGORITHMS, ...wiring }),
      getDigests: () => this._hashing.digests,
      applied: (restored) => this._history.recordRestored(restored),
      // Only the visible algorithms are hashed: a digest a row shown just now doesn't have yet is
      // fetched once all the toggles of the change are made.
      afterChange: () => this._hashing.fillMissing(),
    });
    this.hiddenAlgos = this._panel.hiddenAlgos;

    this._input = createTextInput({
      onInput: () => this.onInput(),
      onClear: (opts) => this.onClear(opts),
    });
    this._hashing = createTextHashing({
      algorithms: ALGORITHMS,
      Hasher,
      hiddenAlgos: this.hiddenAlgos,
      input: this._input.el,
      counter: this._counter,
      rows: this._panel.rows,
      history: this._history,
      setActionsEnabled: (enabled) => this._setActionsEnabled(enabled),
      formattedHash: this._panel.formattedHash,
      getOutputFormat: () => this.getSelectedFormat(),
    });

    // Put back the visitor's saved formats (and keep saving them).
    rememberRadioGroup('textInputFormat', 'textInputFormat');
    rememberRadioGroup('textFormat', 'textOutputFormat');
    this._input.refreshPlaceholder();

    this._counter.update('', selectedInputFormat());

    // Leaving the field (to copy a hash, say) or the page is when typing is over.
    this._input.el.addEventListener('blur', () => this._history.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._history.flush();
    });
    window.addEventListener('pagehide', () => this._history.flush());

    initTextDrop({
      card: this._input.card,
      onText: (raw) => this._input.insertText(raw, { replace: true }),
    });

    document
      .querySelectorAll('input[name="textFormat"]')
      .forEach((radio) => radio.addEventListener('change', () => this._panel.reformat()));
  },

  // ── Showing and hiding algorithms ──────────────────────────────────────

  /** The algorithms hidden in the app's default view: none for Text. */
  defaultHidden() {
    return new Set();
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

  getSelectedInputFormat: selectedInputFormat,

  getSelectedFormat() {
    return this._panel.selectedFormat();
  },

  _setActionsEnabled(enabled) {
    this._input.setClearVisible(enabled);
    this._panel.rows.setActionsEnabled(enabled);
  },

  // ── The field, as the rest of the page sees it ─────────────────────────

  refreshPlaceholder() {
    this._input.refreshPlaceholder();
  },

  setText(text) {
    this._input.setText(text);
  },

  typeText(char) {
    this._input.typeText(char);
  },

  pasteText(raw) {
    this._input.pasteText(raw);
  },

  onClear({ focus = true } = {}) {
    // Whatever was typed and is still waiting for the history goes in before it is cleared.
    this._history.flush();
    this._input.clear({ focus });
  },

  onInput() {
    return this._hashing.onInput();
  },
};
