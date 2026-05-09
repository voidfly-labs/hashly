import { TextSection } from '../sections/text.js';
import { Clipboard } from '../utils/clipboard.js';
import { Tooltip } from './tooltip.js';

export const Permalink = {
  _INPUT_DEFAULT: 'utf-8',
  _OUTPUT_DEFAULT: 'hex',

  buildUrl() {
    const inputFmt = TextSection.getSelectedInputFormat();
    const outputFmt = TextSection.getSelectedFormat();
    const text = document.getElementById('textInput').value;
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('text', text);
    if (inputFmt !== this._INPUT_DEFAULT) url.searchParams.set('input', inputFmt);
    if (outputFmt !== this._OUTPUT_DEFAULT) url.searchParams.set('output', outputFmt);
    return url.toString();
  },

  restoreFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('text')) return false;
    document.getElementById('textInput').value = params.get('text');
    const inputFmt = params.get('input') || this._INPUT_DEFAULT;
    const outputFmt = params.get('output') || this._OUTPUT_DEFAULT;
    const inRadio = document.querySelector(`input[name="textInputFormat"][value="${inputFmt}"]`);
    const outRadio = document.querySelector(`input[name="textFormat"][value="${outputFmt}"]`);
    if (inRadio) inRadio.checked = true;
    if (outRadio) outRadio.checked = true;
    history.replaceState(null, '', window.location.pathname);
    return true;
  },

  init() {
    const btn = document.getElementById('textPermalinkBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const url = this.buildUrl();
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
