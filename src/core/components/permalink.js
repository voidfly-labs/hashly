import { TextSection } from '~core/sections/text.js';
import { Clipboard } from '~core/utils/clipboard.js';
import { Format } from '~core/utils/format.js';

import { AlgoSpotlight } from './algo-spotlight.js';
import { Tooltip } from './tooltip.js';

export const Permalink = {
  _INPUT_DEFAULT: 'utf-8',
  _OUTPUT_DEFAULT: 'hex',
  _PARAMS: ['algorithm', 'text', 'input', 'output'],
  _MAX_URL_LENGTH: 2000,

  buildUrl() {
    const algorithm = AlgoSpotlight.getSpotlighted();
    const text = document.getElementById('textInput').value;
    const inputFmt = TextSection.getSelectedInputFormat();
    const outputFmt = TextSection.getSelectedFormat();
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    if (algorithm) url.searchParams.set('algorithm', Format.slug(algorithm));
    url.searchParams.set('text', text);
    if (inputFmt !== this._INPUT_DEFAULT) url.searchParams.set('input', inputFmt);
    if (outputFmt !== this._OUTPUT_DEFAULT) url.searchParams.set('output', outputFmt);
    return url.toString();
  },

  /** True when the URL carries any permalink param. */
  isPermalink() {
    const params = new URLSearchParams(window.location.search);
    return this._PARAMS.some((name) => params.has(name));
  },

  /** Returns null if the URL has no permalink params, else { algorithm } (raw slug or null)
   *  for the caller to apply once algorithms exist. */
  restoreFromUrl() {
    if (!this.isPermalink()) return null;
    const params = new URLSearchParams(window.location.search);
    const algorithm = params.get('algorithm');
    if (params.has('text')) document.getElementById('textInput').value = params.get('text');
    const inputFmt = params.get('input') || this._INPUT_DEFAULT;
    const outputFmt = params.get('output') || this._OUTPUT_DEFAULT;
    const inRadio = document.querySelector(`input[name="textInputFormat"][value="${inputFmt}"]`);
    const outRadio = document.querySelector(`input[name="textFormat"][value="${outputFmt}"]`);
    if (inRadio) inRadio.checked = true;
    if (outRadio) outRadio.checked = true;
    TextSection.refreshPlaceholder();
    // Drop the permalink's query from the URL, but keep any #hash (a FAQ tab).
    history.replaceState(null, '', window.location.pathname + window.location.hash);
    return { algorithm };
  },

  init() {
    const btn = document.getElementById('textPermalinkBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const url = this.buildUrl();
      if (url.length > this._MAX_URL_LENGTH) {
        Tooltip.show(btn, 'Text too long – not copied', 2500);
        return;
      }
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
