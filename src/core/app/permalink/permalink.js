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

  /** The link lives in the URL fragment, which the browser never sends to the server: the text in it
   *  stays out of access logs. Empty text is left out, so a link then carries the view only. */
  buildUrl() {
    const algorithm = AlgoSpotlight.getSpotlighted();
    const text = document.getElementById('textInput').value;
    const inputFmt = TextSection.getSelectedInputFormat();
    const outputFmt = TextSection.getSelectedFormat();
    const params = new URLSearchParams();
    if (algorithm) params.set('algorithm', Format.slug(algorithm));
    if (text) params.set('text', text);
    if (inputFmt !== this._INPUT_DEFAULT) params.set('input', inputFmt);
    if (outputFmt !== this._OUTPUT_DEFAULT) params.set('output', outputFmt);
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = params.toString();
    return url.toString();
  },

  /** The permalink params in the URL fragment, or null if it has none. The `=` tells them from an
   *  anchor or FAQ deep link (`#text-section`, `#crc32/question`), which the fragment also holds. */
  _params() {
    const hash = window.location.hash.slice(1);
    if (!hash.includes('=')) return null;
    const params = new URLSearchParams(hash);
    return this._PARAMS.some((name) => params.has(name)) ? params : null;
  },

  /** True when the URL carries any permalink param. */
  isPermalink() {
    return this._params() !== null;
  },

  /** Returns null if the URL has no permalink params, else { algorithm } (raw slug or null)
   *  for the caller to apply once algorithms exist. */
  restoreFromUrl() {
    const params = this._params();
    if (!params) return null;
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
    // Drop the permalink from the URL: it was applied, and the fragment is the FAQ's and the anchors' again.
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return { algorithm };
  },

  init() {
    // A permalink pasted into a tab that already shows the page only changes the fragment, which
    // reloads nothing: reload, so it is applied the way a fresh visit applies it.
    window.addEventListener('hashchange', () => {
      if (this.isPermalink()) window.location.reload();
    });
    const btn = document.getElementById('textPermalinkBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const url = this.buildUrl();
      if (url.length > this._MAX_URL_LENGTH) {
        Tooltip.show(btn, 'Text too long – not copied', 2500);
        return;
      }
      await copyWithFeedback(url, { button: btn });
    });
    btn.addEventListener('mouseenter', () => Tooltip.show(btn, 'Permalink'));
    btn.addEventListener('mouseleave', () => Tooltip.hide());
    btn.addEventListener('focus', () => Tooltip.show(btn, 'Permalink'));
    btn.addEventListener('blur', () => Tooltip.hide());
  },
};
