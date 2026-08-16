/** The progress state of one result row while a file is being hashed.
 *
 *  The hash cell shows a progress bar and its percentage (`./hash-progress.css`). The row
 *  is as tall as that bar and grows to the digest's height when it lands, as a text hash's row does.
 *
 *  `start()` enters the state, `set(ratio)` (0–1) moves the bar and `stop()` leaves it. Neither
 *  writes the cell's final text: the caller replaces the bar, which is why a row's tooltip is kept. */
export function createHashProgress({ row, hash, algoId }) {
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

      fill = element('span', 'result__bar-fill');
      label = element('span', 'result__bar-label', '0%');
      const track = element('span', 'result__bar-track');
      track.append(fill);
      const bar = element('span', 'result__bar');
      bar.append(track, label);

      const tooltip = hash.querySelector('.tooltip');
      hash.textContent = '';
      hash.append(bar);
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
