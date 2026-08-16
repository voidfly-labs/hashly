import { AlgoSpotlight } from '~core/features/spotlight/algo-spotlight.js';
import { Format } from '~core/lib/format.js';
import { TextSection } from '~core/sections/text/text.js';
import { copyWithFeedback } from '~core/ui/button/copy-feedback.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

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
    const inputFmt = params.get('input') || this._INPUT_DEFAULT;
    const outputFmt = params.get('output') || this._OUTPUT_DEFAULT;
    // Matched against the radios' own values: the URL is anyone's, and a stray quote in it
    // would make a selector built from it throw and take the rest of the page's setup with it.
    const radioFor = (name, value) =>
      [...document.querySelectorAll(`input[name="${name}"]`)].find((radio) => radio.value === value);
    const inRadio = radioFor('textInputFormat', inputFmt);
    const outRadio = radioFor('textFormat', outputFmt);
    if (inRadio) inRadio.checked = true;
    if (outRadio) outRadio.checked = true;
    TextSection.refreshPlaceholder();
    // After the radios: what the text may contain depends on the input format.
    if (params.has('text')) TextSection.setText(params.get('text'));
    // Drop the permalink's query from the URL, but keep any #hash (a FAQ tab).
    history.replaceState(null, '', window.location.pathname + window.location.hash);
    return { algorithm };
  },

  init() {
    const btn = document.getElementById('textPermalinkBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const url = this.buildUrl();
      if (url.length > this._MAX_URL_LENGTH) {
        Tooltip.show(btn, 'Text too long – not copied', 2500);
        return;
      }
      if (!(await copyWithFeedback(url, { anchor: btn }))) return;
      btn.classList.add('permalink-btn--copied');
      setTimeout(() => btn.classList.remove('permalink-btn--copied'), 1500);
    });
    btn.addEventListener('mouseenter', () => Tooltip.show(btn, 'Permalink'));
    btn.addEventListener('mouseleave', () => Tooltip.hide());
    btn.addEventListener('focus', () => Tooltip.show(btn, 'Permalink'));
    btn.addEventListener('blur', () => Tooltip.hide());
  },
};
