import { Announcer } from '~core/ui/announcer/announcer.js';

// How long Clear stays armed for its confirming second click (also the length of the bar that
// drains across the button meanwhile, see history.css).
const CLEAR_CONFIRM_MS = 4000;
const ARMED_CLASS = 'history-popover__clear--armed';

/** Makes `clearBtn` a two-click button: the first click arms it ("Confirm"), the second, within a few
 *  seconds, runs `onConfirm`. It disarms on a timeout, on focus leaving it, and when the returned
 *  `disarm()` is called (on Escape and on closing the popover). `disarm()` returns whether it was
 *  armed, which Escape uses to know it has done something. */
export function initConfirmClear(clearBtn, onConfirm) {
  let timer = 0;

  clearBtn.style.setProperty('--confirm-ms', `${CLEAR_CONFIRM_MS}ms`);

  const disarm = () => {
    clearTimeout(timer);
    const wasArmed = clearBtn.classList.contains(ARMED_CLASS);
    clearBtn.classList.remove(ARMED_CLASS);
    return wasArmed;
  };

  clearBtn.addEventListener('blur', disarm);
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!clearBtn.classList.contains(ARMED_CLASS)) {
      clearBtn.classList.add(ARMED_CLASS);
      Announcer.say('Press again to delete the history');
      timer = setTimeout(disarm, CLEAR_CONFIRM_MS);
      return;
    }
    disarm();
    onConfirm();
  });

  return disarm;
}
