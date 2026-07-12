// Eighths of the way through, empty to full.
const METER = '▁▂▃▄▅▆▇█';

/** "▄ 42%": the one-character level meter keeps progress readable when a narrow
 *  tab cuts the number off. */
function _progressLabel(ratio) {
  const level = Math.min(Math.floor(ratio * METER.length), METER.length - 1);
  return `${METER[level]} ${Math.floor(ratio * 100)}%`;
}

/** The user isn't on the page: its tab is hidden, or its window isn't focused. */
function _away() {
  return document.hidden || !document.hasFocus();
}

/** Hashing status in the browser tab title: "▄ 42% | SHA-256 Hash Calculator",
 *  then "✓ Done | …" or "⚠ Failed | …". The status goes first, so a truncated
 *  tab still shows it, and is prefixed to whatever the title already is, so no
 *  app gains a name it doesn't otherwise show.
 *
 *  Progress is always shown. A result is a notification, so it is shown only
 *  when the user is away (nobody needs telling about a result they are looking
 *  at) and is dropped as soon as they come back. */
export const TabTitle = {
  _base: '',
  _status: '', // '▄ 42%', '✓ Done', '⚠ Failed', or '' for none
  _final: false, // the status is a result, to be dropped once seen
  _lastPercent: -1,
  _run: 0, // bumped whenever a run starts or is cancelled; stale trackers go quiet

  init() {
    this._base = document.title;
    const onReturn = () => {
      if (this._final && !_away()) this._set('', false);
    };
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
  },

  /** Starts tracking one hashing run, replacing any earlier one. Its calls are
   *  ignored once another run starts or `reset()` is called. */
  track() {
    const run = ++this._run;
    this._lastPercent = -1;
    const live =
      (fn) =>
      (...args) =>
        run === this._run && fn(...args);
    return {
      progress: live((ratio) => {
        const percent = Math.floor(ratio * 100);
        if (percent === this._lastPercent) return;
        this._lastPercent = percent;
        this._set(_progressLabel(ratio), false);
      }),
      done: live(() => this._set(_away() ? '✓ Done' : '', true)),
      fail: live(() => this._set(_away() ? '⚠ Failed' : '', true)),
    };
  },

  /** Drops any status and ignores the run in flight (e.g. the file was cleared). */
  reset() {
    this._run++;
    this._set('', false);
  },

  _set(status, isFinal) {
    this._status = status;
    this._final = isFinal && status !== '';
    document.title = status ? `${status} | ${this._base}` : this._base;
  },
};
