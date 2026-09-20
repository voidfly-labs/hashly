import { Announcer } from '~core/ui/announcer/announcer.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

// How long the button stays armed for its confirming second click (also the length of the bar that
// drains across it meanwhile, see confirm-button.css).
const CONFIRM_MS = 4000;
const ARMED_CLASS = 'confirm-btn--armed';

/** Makes `button`, a `.confirm-btn` (see confirm-button.css), a two-click button: the first click arms it ("Confirm", with an "Are you sure?"
 *  tooltip that lasts as long as the armed state), the second, within a few seconds, runs
 *  `onConfirm`. It disarms on a timeout, on focus leaving it, and when the returned `disarm()` is
 *  called (on Escape and on closing the popover). `disarm()` returns whether it was armed, which
 *  Escape uses to know it has done something. `announcement` is what a screen reader hears when it
 *  is armed. */
export function initConfirmButton(button, onConfirm, announcement) {
  let timer = 0;

  button.style.setProperty('--confirm-ms', `${CONFIRM_MS}ms`);

  const disarm = () => {
    clearTimeout(timer);
    const wasArmed = button.classList.contains(ARMED_CLASS);
    button.classList.remove(ARMED_CLASS);
    if (wasArmed) Tooltip.hide();
    return wasArmed;
  };

  button.addEventListener('blur', disarm);
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!button.classList.contains(ARMED_CLASS)) {
      button.classList.add(ARMED_CLASS);
      Announcer.say(announcement);
      Tooltip.show(button, 'Are you sure?', CONFIRM_MS);
      timer = setTimeout(disarm, CONFIRM_MS);
      return;
    }
    disarm();
    onConfirm();
  });

  return disarm;
}
