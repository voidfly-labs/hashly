const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit']);

/** True when `el` is a field that takes typed or pasted text, and so has its own
 *  key and paste handling. Radios, checkboxes and buttons don't count: they keep
 *  focus after a click, and the page-wide handlers should still reach past them. */
export function takesText(el) {
  if (!(el instanceof Element)) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  return el.tagName === 'INPUT' && !NON_TEXT_INPUTS.has(el.type);
}
