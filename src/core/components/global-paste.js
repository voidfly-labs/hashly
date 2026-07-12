const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit']);

/** True when a paste at `el` lands in a field that takes text, which has its own
 *  paste handling. Radios, checkboxes and buttons don't count: they keep focus
 *  after a click, and a paste with one focused should still reach the page. */
function _takesText(el) {
  if (!(el instanceof Element)) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  return el.tagName === 'INPUT' && !NON_TEXT_INPUTS.has(el.type);
}

/** Paste anywhere on the page: text goes to `onText(text)`, a file or image to
 *  `onFile(file)`. Pastes into a text field are left alone.
 *
 *  Text wins when both are on the clipboard: Office apps add a picture of the
 *  copied cells next to the text. A file wins when there is no text, or when
 *  the text is just the file's name (some file managers add it). */
export function initGlobalPaste({ onText, onFile }) {
  document.addEventListener('paste', (e) => {
    const data = e.clipboardData;
    if (!data || e.defaultPrevented || _takesText(e.target)) return;

    const text = data.getData('text/plain');
    const file = data.files[0];
    if (file && (!text.trim() || text.trim() === file.name)) onFile(file);
    else if (text.trim()) onText(text);
    else return;

    e.preventDefault();
  });
}
