import { takesText } from '~core/lib/text-field.js';

/** Paste anywhere on the page: text goes to `onText(text)`, a file or image to
 *  `onFiles(files)`. Pastes into a text field are left alone.
 *
 *  Text wins when both are on the clipboard: Office apps add a picture of the
 *  copied cells next to the text. Files win when there is no text, or when the
 *  text is just their names, one per line (some file managers add it). */
export function initGlobalPaste({ onText, onFiles }) {
  document.addEventListener('paste', (e) => {
    const data = e.clipboardData;
    if (!data || e.defaultPrevented || takesText(e.target)) return;

    const text = data.getData('text/plain');
    const files = [...data.files];
    if (files.length && (!text.trim() || namesOnly(text, files))) onFiles(files);
    else if (text.trim()) onText(text);
    else return;

    e.preventDefault();
  });
}

/** Whether `text` is nothing but the names of `files`, one per line. */
function namesOnly(text, files) {
  const names = new Set(files.map(({ name }) => name));
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .every((line) => names.has(line));
}
