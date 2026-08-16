import { Format } from '~core/utils/format.js';

const HEX = '0123456789abcdef';

const _randomHex = (length) => {
  let out = '';
  for (const n of crypto.getRandomValues(new Uint8Array(length))) out += HEX[n & 15];
  return out;
};

/** The progress state of one result row while a file is being hashed.
 *
 *  The hash cell shows a progress bar and its percentage (`components/hash-progress.css`). Behind
 *  them sits invisible filler in the length and format of the digest to come, so the cell has the
 *  height of that digest and the row does not jump when it lands.
 *
 *  `start()` enters the state, `set(ratio)` (0–1) moves the bar and `stop()` leaves it. Neither
 *  writes the cell's final text: the caller replaces the bar, which is why a row's tooltip is kept.
 *  `getFormat()` returns the output format (`hex`, `hex-upper`, `base64`, `binary`). */
export function createHashProgress({ row, hash, algoId, hexLen, getFormat }) {
  let active = false;
  let percent = -1;
  let fill = null;
  let label = null;

  function leave() {
    active = false;
    percent = -1;
    row.classList.remove('result--computing');
    hash.classList.remove('result__hash--computing');
    for (const attr of ['role', 'aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow']) {
      hash.removeAttribute(attr);
    }
  }

  const element = (tag, className, text) => {
    const el = document.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    return el;
  };

  return {
    get active() {
      return active;
    },

    start() {
      active = true;
      row.classList.add('result--computing');
      hash.classList.add('result__hash--computing');

      const sizer = element('span', 'result__sizer', Format.applyFormat(_randomHex(hexLen), getFormat()));
      fill = element('span', 'result__bar-fill');
      label = element('span', 'result__bar-label', '0%');
      const track = element('span', 'result__bar-track');
      track.append(fill);
      const bar = element('span', 'result__bar');
      bar.append(track, label);
      sizer.setAttribute('aria-hidden', 'true');

      const tooltip = hash.querySelector('.tooltip');
      hash.textContent = '';
      hash.append(sizer, bar);
      if (tooltip) hash.append(tooltip);
      fill.style.setProperty('--progress', '0');

      hash.setAttribute('role', 'progressbar');
      hash.setAttribute('aria-label', `${algoId} progress`);
      hash.setAttribute('aria-valuemin', '0');
      hash.setAttribute('aria-valuemax', '100');
      hash.setAttribute('aria-valuenow', '0');
    },

    set(ratio) {
      if (!active) return;
      fill.style.setProperty('--progress', ratio.toFixed(4));
      // The label and a screen reader get whole percents, not every update.
      const whole = Math.floor(ratio * 100);
      if (whole !== percent) {
        percent = whole;
        label.textContent = `${whole}%`;
        hash.setAttribute('aria-valuenow', String(whole));
      }
    },

    stop() {
      if (active) leave();
    },
  };
}
