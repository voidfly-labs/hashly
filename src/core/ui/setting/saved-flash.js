import { svgIcon } from '~core/lib/icon.js';
import { Announcer } from '~core/ui/announcer/announcer.js';

const SAVED_MS = 3000;

/** What a setting row says about a change: "Saved" (or "Not saved") after its label, and an
 *  optional note under its hint for what the change does that the row does not show. Built here, in the
 *  row, so the templates of a row stay as they are. "Saved" fades out after a moment and "Not saved"
 *  stays until the next change; the note stays until `clear()` or a change that needs none, and eases in and out. */
export function createSettingFlash(control) {
  const row = control.closest('.setting');
  const label = row.querySelector('.setting__label');
  const name = label.textContent.trim();

  const status = document.createElement('span');
  status.className = 'setting__status';
  status.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  text.className = 'setting__status-text';
  const okIcon = svgIcon('check-circle');
  const failIcon = svgIcon('warning');
  okIcon.classList.add('setting__status-ok');
  failIcon.classList.add('setting__status-fail');
  status.append(okIcon, failIcon, text);
  label.append(status);

  const note = document.createElement('span');
  note.className = 'setting__note';
  row.querySelector('.setting__text').append(note);

  let timer;

  const clearStatus = () => {
    clearTimeout(timer);
    status.classList.remove('setting__status--visible');
  };

  return {
    /** `ok`: whether the value was stored. `noteText`: what the change means, if anything. */
    show(ok, noteText = '') {
      clearTimeout(timer);
      status.classList.toggle('setting__status--error', !ok);
      text.textContent = ok ? 'Saved' : 'Not saved';
      status.classList.add('setting__status--visible');
      if (ok) timer = setTimeout(clearStatus, SAVED_MS);
      // The text stays while the note eases out, so it does not empty as it goes.
      if (ok && noteText) note.textContent = noteText;
      note.classList.toggle('setting__note--shown', ok && Boolean(noteText));
      Announcer.say([`${name}: ${text.textContent}`, ok && noteText].filter(Boolean).join('. '));
    },
    clear() {
      clearStatus();
      note.classList.remove('setting__note--shown');
    },
  };
}
