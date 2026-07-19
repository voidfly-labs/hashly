import { takesText } from '~core/utils/text-field.js';

/** Paste anywhere on the page: text goes to `onText(text)`, a file or image to
 *  `onFile(file)`. Pastes into a text field are left alone.
 *
 *  Text wins when both are on the clipboard: Office apps add a picture of the
 *  copied cells next to the text. A file wins when there is no text, or when
 *  the text is just the file's name (some file managers add it). */
export function initGlobalPaste({ onText, onFile }) {
  document.addEventListener('paste', (e) => {
    const data = e.clipboardData;
    if (!data || e.defaultPrevented || takesText(e.target)) return;

    const text = data.getData('text/plain');
    const file = data.files[0];
    if (file && (!text.trim() || text.trim() === file.name)) onFile(file);
    else if (text.trim()) onText(text);
    else return;

    e.preventDefault();
  });
}
