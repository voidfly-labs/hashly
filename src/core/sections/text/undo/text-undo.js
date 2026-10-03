import { prefersReducedMotion } from '~core/lib/motion/motion.js';
import { takesText } from '~core/lib/text-field.js';
import { Announcer } from '~core/ui/announcer/announcer.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

// Long enough to notice a mistake and reach the button, short enough that an empty field does not
// carry an Undo for long, and a late click cannot surprise someone who forgot the old text.
const UNDO_MS = 10000;
// The last part of it is a fade (the transition in text-undo.css).
const FADE_MS = 600;
// The least the button stays after the pointer and the focus have left it.
const RESUME_MS = 2000;

/** The undo the text footer offers after text was cleared (see text-undo.html): an icon button,
 *  shown until the field gets new content, or for UNDO_MS, fading at the end. It waits while the pointer
 *  or the focus is on it. Ctrl/⌘+Z does the same while it is offered, but is not shown anywhere.
 *
 *  `field` is the textarea. `onRestore(snapshot)` puts back what `offer` was given; the text is kept in
 *  memory only, and dropped when the offer ends.
 *
 *  Returns `{ offer, dismiss }`: `offer(snapshot)` shows the button, `dismiss()` takes it away (for any
 *  new content in the field, or a clear of an empty one). */
export function createTextUndo({ field, onRestore }) {
  const root = document.getElementById('textUndo');
  const button = document.getElementById('textUndoBtn');
  let snapshot = null;
  let fadeTimer = null;
  let endTimer = null;
  let endsAt = 0;
  // What was left of the offer when the pointer or the focus came to the button; null when neither is there.
  let remaining = null;

  initButtonTooltip(button, 'Undo');

  function stopTimers() {
    clearTimeout(fadeTimer);
    clearTimeout(endTimer);
    root.classList.remove('text-undo--fading');
  }

  /** Ends the offer in `ms`, fading it out first (unless the visitor asked for less motion). */
  function schedule(ms) {
    stopTimers();
    remaining = null;
    endsAt = Date.now() + ms;
    if (!prefersReducedMotion()) {
      fadeTimer = setTimeout(() => root.classList.add('text-undo--fading'), ms - FADE_MS);
    }
    endTimer = setTimeout(dismiss, ms);
  }

  function onKeydown(e) {
    if (e.isComposing || e.shiftKey || e.altKey || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
    // Another text field keeps its own undo.
    if (takesText(e.target) && e.target !== field) return;
    e.preventDefault();
    restore();
  }

  function dismiss() {
    stopTimers();
    remaining = null;
    document.removeEventListener('keydown', onKeydown);
    snapshot = null;
    root.hidden = true;
    Tooltip.hide(button);
  }

  function restore() {
    const restored = snapshot;
    dismiss();
    if (restored) onRestore(restored);
  }

  // A button that vanishes while it is being aimed at, or read, is no use: it waits.
  function pause() {
    if (remaining === null) remaining = endsAt - Date.now();
    stopTimers();
  }

  // Leaving gives back what was left, or a short while if little was.
  function resume() {
    if (remaining === null) return;
    if (button.matches(':hover') || document.activeElement === button) return;
    schedule(Math.max(remaining, RESUME_MS));
  }

  button.addEventListener('click', restore);
  button.addEventListener('pointerenter', pause);
  button.addEventListener('focus', pause);
  button.addEventListener('pointerleave', resume);
  button.addEventListener('blur', resume);

  return {
    offer(value) {
      dismiss();
      snapshot = value;
      root.hidden = false;
      document.addEventListener('keydown', onKeydown);
      schedule(UNDO_MS);
      Announcer.say('Undo available.');
    },

    dismiss,
  };
}
